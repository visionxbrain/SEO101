from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Generator
import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
from datetime import datetime
import json
import re
import hashlib
import pickle
import os
from pathlib import Path

router = APIRouter()

# Create cache directory for progress
CACHE_DIR = Path("./cache/blog_link_checker")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

class BlogLinkCheckStreamRequest(BaseModel):
    sitemap_url: str
    max_workers: int = 10
    check_external: bool = True
    resume_token: Optional[str] = None  # Token to resume from previous session
    blog_path: Optional[str] = "/blog/"  # Custom path to filter blog URLs

def fetch_blog_urls_from_sitemap(sitemap_url: str, blog_path: str = "/blog/") -> List[str]:
    """Fetch all blog URLs from sitemap with improved error handling and custom path support"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/xml,text/xml,*/*;q=0.8'
        }
        
        session = requests.Session()
        response = session.get(sitemap_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        blog_urls = []
        
        # Get all URLs from sitemap
        for url in root.findall('.//ns:url/ns:loc', namespaces):
            url_text = url.text.strip()  # Remove whitespace and newlines
            # Filter URLs based on custom path
            if blog_path in url_text:
                blog_urls.append(url_text)
        
        # Also check for sitemap index
        if not blog_urls:
            for sitemap in root.findall('.//ns:sitemap/ns:loc', namespaces):
                sub_response = requests.get(sitemap.text.strip(), timeout=10)
                sub_root = ET.fromstring(sub_response.content)
                for url in sub_root.findall('.//ns:url/ns:loc', namespaces):
                    url_text = url.text.strip()  # Remove whitespace and newlines
                    if blog_path in url_text:
                        blog_urls.append(url_text)
        
        return blog_urls
    except Exception as e:
        print(f"Error fetching sitemap: {e}")
        return []

def extract_links_from_page(url: str) -> List[Dict]:
    """Extract all links from a webpage with better error handling"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
        
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=12, allow_redirects=True)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        links = []
        
        # Parse base URL
        parsed_url = urlparse(url)
        base_domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Find all links
        for tag in soup.find_all(['a', 'link', 'img', 'script']):
            link_url = None
            
            if tag.name == 'a':
                link_url = tag.get('href')
            elif tag.name == 'link':
                link_url = tag.get('href')
            elif tag.name == 'img':
                link_url = tag.get('src')
            elif tag.name == 'script':
                link_url = tag.get('src')
            
            if link_url:
                # Skip anchors, mailto, tel, javascript
                if link_url.startswith('#') or link_url.startswith('mailto:') or \
                   link_url.startswith('tel:') or link_url.startswith('javascript:'):
                    continue
                
                # Convert relative URLs to absolute
                if not link_url.startswith('http'):
                    link_url = urljoin(url, link_url)
                
                # Determine if internal or external
                link_parsed = urlparse(link_url)
                link_domain = f"{link_parsed.scheme}://{link_parsed.netloc}"
                
                link_type = 'internal' if link_domain == base_domain else 'external'
                
                links.append({
                    'url': link_url,
                    'type': link_type,
                    'found_in': url
                })
        
        return links
    except requests.exceptions.Timeout:
        print(f"Timeout extracting links from {url}")
        return []
    except requests.exceptions.RequestException as e:
        print(f"Error extracting links from {url}: {str(e)[:100]}")
        return []
    except Exception as e:
        print(f"Unexpected error for {url}: {str(e)[:100]}")
        return []

def check_link(link_info: Dict) -> Dict:
    """Check if a link is working"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # For images and resources, use HEAD request
        if link_info['url'].endswith(('.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.svg', '.webp')):
            response = requests.head(link_info['url'], timeout=5, allow_redirects=True, headers=headers)
        else:
            response = requests.get(link_info['url'], timeout=10, allow_redirects=True, headers=headers)
        
        status_code = response.status_code
        is_broken = status_code >= 400
        
        return {
            'url': link_info['url'],
            'status_code': status_code,
            'is_broken': is_broken,
            'link_type': link_info['type'],
            'found_in': link_info['found_in'],
            'error': None
        }
    except requests.exceptions.Timeout:
        return {
            'url': link_info['url'],
            'status_code': None,
            'is_broken': True,
            'link_type': link_info['type'],
            'found_in': link_info['found_in'],
            'error': 'Timeout'
        }
    except requests.exceptions.RequestException as e:
        return {
            'url': link_info['url'],
            'status_code': None,
            'is_broken': True,
            'link_type': link_info['type'],
            'found_in': link_info['found_in'],
            'error': str(e)[:100]  # Limit error message length
        }

def get_session_token(sitemap_url: str) -> str:
    """Generate unique token for a sitemap session"""
    return hashlib.md5(sitemap_url.encode()).hexdigest()

def save_progress(token: str, data: Dict):
    """Save progress to cache"""
    cache_file = CACHE_DIR / f"{token}.pkl"
    with open(cache_file, 'wb') as f:
        pickle.dump(data, f)

def load_progress(token: str) -> Optional[Dict]:
    """Load progress from cache"""
    cache_file = CACHE_DIR / f"{token}.pkl"
    if cache_file.exists():
        try:
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
        except:
            return None
    return None

def clear_progress(token: str):
    """Clear saved progress"""
    cache_file = CACHE_DIR / f"{token}.pkl"
    if cache_file.exists():
        os.remove(cache_file)

async def stream_blog_link_check(request: BlogLinkCheckStreamRequest) -> Generator:
    """Stream blog link checking progress with resume capability"""
    
    # Generate or use existing session token
    session_token = request.resume_token or get_session_token(request.sitemap_url)
    
    # Try to load previous progress
    saved_progress = None
    blog_urls = []
    processed_blogs = set()
    all_links = []
    results = []
    broken_links = []
    working_links = []
    start_from_blog = 0
    start_from_link = 0
    
    if request.resume_token:
        saved_progress = load_progress(request.resume_token)
        if saved_progress:
            blog_urls = saved_progress.get('blog_urls', [])
            processed_blogs = set(saved_progress.get('processed_blogs', []))
            all_links = saved_progress.get('all_links', [])
            results = saved_progress.get('results', [])
            broken_links = saved_progress.get('broken_links', [])
            working_links = saved_progress.get('working_links', [])
            start_from_blog = saved_progress.get('last_blog_index', 0)
            start_from_link = saved_progress.get('last_link_index', 0)
            
            yield f"data: {json.dumps({'type': 'status', 'message': f'กำลังดำเนินการต่อจากบทความที่ {start_from_blog}/{len(blog_urls)}...', 'progress': saved_progress.get('progress', 0), 'resume_token': session_token})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'warning', 'message': 'ไม่พบข้อมูลที่บันทึกไว้ เริ่มใหม่ทั้งหมด'})}\n\n"
            request.resume_token = None
    
    if not request.resume_token:
        # Fresh start - fetch blog URLs from sitemap
        yield f"data: {json.dumps({'type': 'status', 'message': 'กำลังดึงข้อมูลจาก Sitemap...', 'progress': 0, 'resume_token': session_token})}\n\n"
        yield f": keep-alive\n\n"
        
        # Use custom blog path if provided
        blog_path = request.blog_path or "/blog/"
        blog_urls = fetch_blog_urls_from_sitemap(request.sitemap_url, blog_path)
        
        if not blog_urls:
            error_msg = f'ไม่พบ URLs ที่มี path "{blog_path}" ใน sitemap'
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
            return
        
        status_msg = f'พบ URLs ที่มี "{blog_path}" จำนวน {len(blog_urls)} URLs'
        yield f"data: {json.dumps({'type': 'status', 'message': status_msg, 'progress': 10, 'total_blogs': len(blog_urls), 'resume_token': session_token, 'blog_path': blog_path})}\n\n"
    
    # Step 2: Extract all links from each blog post with resume capability
    if not saved_progress or not all_links:
        unique_links = set()
        
        # Process blog URLs in smaller batches
        batch_size = 5
        for batch_start in range(start_from_blog, len(blog_urls), batch_size):
            batch_end = min(batch_start + batch_size, len(blog_urls))
            batch = blog_urls[batch_start:batch_end]
            
            for i, blog_url in enumerate(batch, batch_start + 1):
                # Skip if already processed
                if blog_url in processed_blogs:
                    continue
                    
                yield f"data: {json.dumps({'type': 'log', 'message': f'กำลังตรวจสอบบทความที่ {i}/{len(blog_urls)}: {blog_url}', 'current': i, 'total': len(blog_urls)})}\n\n"
                
                try:
                    links = extract_links_from_page(blog_url)
                    for link in links:
                        # Filter external links if not checking them
                        if not request.check_external and link['type'] == 'external':
                            continue
                        
                        # Add to unique set to avoid checking duplicates
                        link_key = f"{link['url']}|{link['found_in']}"
                        if link_key not in unique_links:
                            unique_links.add(link_key)
                            all_links.append(link)
                    
                    processed_blogs.add(blog_url)
                    
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'warning', 'message': f'ข้ามบทความ {blog_url}: {str(e)[:50]}'})}\n\n"
                
                # Update progress
                progress = 10 + (30 * i / len(blog_urls))
                yield f"data: {json.dumps({'type': 'progress', 'progress': round(progress)})}\n\n"
                
                # Save progress periodically
                if i % 10 == 0:  # Save every 10 blogs
                    save_progress(session_token, {
                        'blog_urls': blog_urls,
                        'processed_blogs': list(processed_blogs),
                        'all_links': all_links,
                        'results': [],
                        'broken_links': [],
                        'working_links': [],
                        'last_blog_index': i,
                        'last_link_index': 0,
                        'progress': round(progress)
                    })
            
            # Keep-alive signal between batches
            yield f": keep-alive\n\n"
            
            # Small delay between batches
            await asyncio.sleep(0.2)
    
    yield f"data: {json.dumps({'type': 'status', 'message': f'พบลิงก์ทั้งหมด {len(all_links)} ลิงก์ กำลังตรวจสอบ...', 'progress': 40})}\n\n"
    
    # Step 3: Check all unique links (skip already checked if resuming)
    checked_links = set()
    if saved_progress:
        # Mark already checked links
        for result in results:
            checked_links.add(f"{result['url']}|{result['found_in']}")
    
    # Process links in smaller batches with error recovery and resume
    batch_size = 5
    max_retries = 2
    
    for batch_start in range(start_from_link, len(all_links), batch_size):
        batch_end = min(batch_start + batch_size, len(all_links))
        batch = []
        
        # Filter out already checked links
        for link in all_links[batch_start:batch_end]:
            link_key = f"{link['url']}|{link['found_in']}"
            if link_key not in checked_links:
                batch.append(link)
        
        if not batch:
            continue  # Skip if all links in batch already checked
        
        yield f"data: {json.dumps({'type': 'log', 'message': f'ตรวจสอบลิงก์ {batch_start + 1}-{batch_end} จาก {len(all_links)}', 'current': batch_end, 'total': len(all_links)})}\n\n"
        
        # Check links in batch with retry mechanism
        retry_count = 0
        batch_failed = False
        
        while retry_count < max_retries:
            try:
                with ThreadPoolExecutor(max_workers=min(request.max_workers, 5)) as executor:
                    futures = [executor.submit(check_link, link) for link in batch]
                    for future in as_completed(futures):
                        try:
                            result = future.result(timeout=15)
                            results.append(result)
                            checked_links.add(f"{result['url']}|{result['found_in']}")
                            
                            if result['is_broken']:
                                broken_links.append(result)
                                yield f"data: {json.dumps({'type': 'broken_found', 'link': result['url'], 'status': result.get('status_code', 'Error'), 'found_in': result['found_in']})}\n\n"
                            else:
                                working_links.append(result)
                        except Exception as e:
                            print(f"Error processing link result: {e}")
                            continue
                break  # Success, exit retry loop
            except Exception as e:
                retry_count += 1
                print(f"Batch processing error (attempt {retry_count}/{max_retries}): {e}")
                if retry_count >= max_retries:
                    batch_failed = True
                    yield f"data: {json.dumps({'type': 'warning', 'message': f'บางลิงก์ในชุดที่ {batch_start + 1}-{batch_end} ไม่สามารถตรวจสอบได้'})}\n\n"
                else:
                    await asyncio.sleep(1)  # Wait before retry
        
        # Update progress
        progress = 40 + (50 * batch_end / len(all_links))
        yield f"data: {json.dumps({'type': 'progress', 'progress': round(progress)})}\n\n"
        
        # Save progress periodically
        if batch_end % 20 == 0 or batch_failed:  # Save every 20 links or on failure
            save_progress(session_token, {
                'blog_urls': blog_urls,
                'processed_blogs': list(processed_blogs),
                'all_links': all_links,
                'results': results,
                'broken_links': broken_links,
                'working_links': working_links,
                'last_blog_index': len(blog_urls),
                'last_link_index': batch_end,
                'progress': round(progress)
            })
            
            # Send save notification on failure
            if batch_failed:
                yield f"data: {json.dumps({'type': 'saved', 'message': 'ความคืบหน้าถูกบันทึกไว้', 'resume_token': session_token})}\n\n"
        
        # Keep-alive between batches
        yield f": keep-alive\n\n"
        await asyncio.sleep(0.2)
    
    # Step 4: Organize results
    yield f"data: {json.dumps({'type': 'status', 'message': 'กำลังสรุปผลการตรวจสอบ...', 'progress': 90})}\n\n"
    
    # Group broken links by blog post
    broken_by_post = {}
    for link in broken_links:
        if link['found_in'] not in broken_by_post:
            broken_by_post[link['found_in']] = []
        broken_by_post[link['found_in']].append(link)
    
    summary = {
        'total_blog_posts': len(blog_urls),
        'total_links_checked': len(results),
        'broken_links': len(broken_links),
        'working_links': len(working_links),
        'posts_with_broken_links': len(broken_by_post),
        'internal_broken': len([r for r in broken_links if r['link_type'] == 'internal']),
        'external_broken': len([r for r in broken_links if r['link_type'] == 'external'])
    }
    
    # Clear saved progress on successful completion
    clear_progress(session_token)
    
    # Send final results with chunking for large datasets
    yield f"data: {json.dumps({'type': 'summary', 'summary': summary, 'progress': 95})}\n\n"
    
    # Then send complete data in manageable chunks
    final_data = {
        'type': 'complete',
        'blog_urls': blog_urls[:100] if len(blog_urls) > 100 else blog_urls,
        'results': results[:500] if len(results) > 500 else results,
        'broken_links': broken_links,
        'broken_by_post': broken_by_post,
        'summary': summary,
        'progress': 100,
        'has_more': len(results) > 500,
        'resume_token': None  # Clear token on completion
    }
    
    yield f"data: {json.dumps(final_data)}\n\n"

@router.get("/api/check-blog-links-stream")
async def check_blog_links_stream(
    sitemap_url: str,
    check_external: bool = True,
    max_workers: int = 10,
    resume_token: Optional[str] = None,
    blog_path: Optional[str] = None
):
    """Stream blog link checking progress with resume capability and custom path support"""
    # Limit max_workers for stability
    max_workers = min(max_workers, 5)
    
    request = BlogLinkCheckStreamRequest(
        sitemap_url=sitemap_url,
        check_external=check_external,
        max_workers=max_workers,
        resume_token=resume_token,
        blog_path=blog_path or "/blog/"
    )
    return StreamingResponse(
        stream_blog_link_check(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff"
        }
    )