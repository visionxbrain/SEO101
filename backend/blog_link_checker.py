from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
from datetime import datetime
import re

router = APIRouter()

class BlogLinkCheckRequest(BaseModel):
    sitemap_url: str
    max_workers: int = 10
    check_external: bool = True

class LinkCheckResult(BaseModel):
    url: str
    status_code: Optional[int]
    is_broken: bool
    link_type: str  # internal, external
    found_in: str  # URL of the blog post
    error: Optional[str] = None

def fetch_blog_urls_from_sitemap(sitemap_url: str) -> List[str]:
    """Fetch all blog URLs from sitemap"""
    try:
        response = requests.get(sitemap_url, timeout=10)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        blog_urls = []
        
        # Get all URLs from sitemap
        for url in root.findall('.//ns:url/ns:loc', namespaces):
            url_text = url.text.strip()  # Remove whitespace and newlines
            # Filter only blog URLs
            if '/blog/' in url_text:
                blog_urls.append(url_text)
        
        # Also check for sitemap index
        if not blog_urls:
            for sitemap in root.findall('.//ns:sitemap/ns:loc', namespaces):
                sub_response = requests.get(sitemap.text.strip(), timeout=10)
                sub_root = ET.fromstring(sub_response.content)
                for url in sub_root.findall('.//ns:url/ns:loc', namespaces):
                    url_text = url.text.strip()  # Remove whitespace and newlines
                    if '/blog/' in url_text:
                        blog_urls.append(url_text)
        
        return blog_urls
    except Exception as e:
        print(f"Error fetching sitemap: {e}")
        return []

def extract_links_from_page(url: str) -> List[Dict]:
    """Extract all links from a webpage"""
    try:
        response = requests.get(url, timeout=10)
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
    except Exception as e:
        print(f"Error extracting links from {url}: {e}")
        return []

def check_link(link_info: Dict) -> LinkCheckResult:
    """Check if a link is working"""
    try:
        # For images and resources, use HEAD request
        if link_info['url'].endswith(('.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.svg', '.webp')):
            response = requests.head(link_info['url'], timeout=5, allow_redirects=True)
        else:
            response = requests.get(link_info['url'], timeout=10, allow_redirects=True)
        
        status_code = response.status_code
        is_broken = status_code >= 400
        
        return LinkCheckResult(
            url=link_info['url'],
            status_code=status_code,
            is_broken=is_broken,
            link_type=link_info['type'],
            found_in=link_info['found_in'],
            error=None
        )
    except requests.exceptions.RequestException as e:
        return LinkCheckResult(
            url=link_info['url'],
            status_code=None,
            is_broken=True,
            link_type=link_info['type'],
            found_in=link_info['found_in'],
            error=str(e)
        )

@router.post("/api/check-blog-links")
async def check_blog_links(request: BlogLinkCheckRequest):
    """Check all links in blog posts"""
    
    print(f"Starting blog link check for: {request.sitemap_url}")
    
    # Step 1: Fetch blog URLs from sitemap
    print("Step 1: Fetching blog URLs from sitemap...")
    blog_urls = fetch_blog_urls_from_sitemap(request.sitemap_url)
    
    if not blog_urls:
        raise HTTPException(status_code=400, detail="No blog URLs found in sitemap")
    
    print(f"Found {len(blog_urls)} blog URLs")
    
    # Step 2: Extract all links from each blog post
    print("Step 2: Extracting links from blog posts...")
    all_links = []
    unique_links = set()
    
    for i, blog_url in enumerate(blog_urls, 1):
        print(f"Processing blog {i}/{len(blog_urls)}: {blog_url}")
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
    
    print(f"Found {len(all_links)} unique links to check")
    
    # Step 3: Check all unique links
    print("Step 3: Checking all links...")
    results = []
    loop = asyncio.get_event_loop()
    
    with ThreadPoolExecutor(max_workers=request.max_workers) as executor:
        futures = [
            loop.run_in_executor(executor, check_link, link)
            for link in all_links
        ]
        results = await asyncio.gather(*futures)
    
    print(f"Checked {len(results)} links")
    
    # Step 4: Organize results
    print("Step 4: Organizing results...")
    broken_links = [r for r in results if r.is_broken]
    working_links = [r for r in results if not r.is_broken]
    
    # Group broken links by blog post
    broken_by_post = {}
    for link in broken_links:
        if link.found_in not in broken_by_post:
            broken_by_post[link.found_in] = []
        broken_by_post[link.found_in].append(link)
    
    summary = {
        'total_blog_posts': len(blog_urls),
        'total_links_checked': len(results),
        'broken_links': len(broken_links),
        'working_links': len(working_links),
        'posts_with_broken_links': len(broken_by_post),
        'internal_broken': len([r for r in broken_links if r.link_type == 'internal']),
        'external_broken': len([r for r in broken_links if r.link_type == 'external'])
    }
    
    print(f"Complete! Found {len(broken_links)} broken links")
    
    return {
        'blog_urls': blog_urls,
        'results': [r.dict() for r in results],
        'broken_links': [r.dict() for r in broken_links],
        'broken_by_post': {
            post: [link.dict() for link in links] 
            for post, links in broken_by_post.items()
        },
        'summary': summary
    }

@router.get("/api/blog-link-checker/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "blog-link-checker"}