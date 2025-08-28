from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import csv
import io
import json
import requests
from typing import List, Dict, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
from pydantic import BaseModel
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, unquote
from difflib import SequenceMatcher
import time
from blog_link_checker import router as blog_link_checker_router
from blog_link_checker_stream import router as blog_link_checker_stream_router
from schema_markup_checker import router as schema_markup_checker_router
from schema_markup_checker_stream import router as schema_markup_checker_stream_router
from heading_structure_analyzer import router as heading_structure_router
from schema_generator_v2 import router as schema_v2_router

app = FastAPI()

# Include routers
app.include_router(blog_link_checker_router)
app.include_router(blog_link_checker_stream_router)
app.include_router(schema_markup_checker_router)
app.include_router(schema_markup_checker_stream_router)
app.include_router(heading_structure_router)
app.include_router(schema_v2_router)

# Global cache for sitemaps
sitemap_cache = {}
sitemap_cache_time = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

class URLCheckRequest(BaseModel):
    urls: List[str]
    max_workers: int = 10
    sitemap_url: Optional[str] = None

class SitemapTestRequest(BaseModel):
    sitemap_url: str
    sample_url: Optional[str] = None

class URLCheckResult(BaseModel):
    original_url: str
    status_code: Optional[int]
    final_url: Optional[str]
    is_404: bool
    error: Optional[str]
    checked_at: str
    suggested_redirect: Optional[str] = None
    match_score: Optional[float] = None

def check_url(url: str, timeout: int = 10) -> Dict:
    """Check if URL returns 404 or other errors"""
    try:
        response = requests.get(url, timeout=timeout, allow_redirects=True)
        status_code = response.status_code
        final_url = response.url
        
        return {
            'original_url': url,
            'status_code': status_code,
            'final_url': final_url,
            'is_404': status_code == 404,
            'error': None,
            'checked_at': datetime.now().isoformat()
        }
    except requests.exceptions.RequestException as e:
        return {
            'original_url': url,
            'status_code': None,
            'final_url': None,
            'is_404': False,
            'error': str(e),
            'checked_at': datetime.now().isoformat()
        }

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload CSV file and extract URLs"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    text = contents.decode('utf-8')
    
    csv_reader = csv.DictReader(io.StringIO(text))
    urls = []
    
    for row in csv_reader:
        if 'URL' in row:
            urls.append(row['URL'])
    
    if not urls:
        raise HTTPException(status_code=400, detail="No URLs found in CSV")
    
    return {"urls": urls, "count": len(urls)}

def fetch_sitemap(sitemap_url: str) -> List[str]:
    """Fetch and parse sitemap XML with caching"""
    global sitemap_cache, sitemap_cache_time
    
    # Check cache (valid for 5 minutes)
    current_time = time.time()
    if sitemap_url in sitemap_cache:
        if current_time - sitemap_cache_time.get(sitemap_url, 0) < 300:
            print(f"Using cached sitemap for: {sitemap_url}")
            return sitemap_cache[sitemap_url]
    
    try:
        print(f"Fetching sitemap from: {sitemap_url}")
        response = requests.get(sitemap_url, timeout=10)
        root = ET.fromstring(response.content)
        
        # Handle both regular sitemap and sitemap index
        namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = []
        
        # Try to get URLs from regular sitemap
        for url in root.findall('.//ns:url/ns:loc', namespaces):
            urls.append(url.text)
        
        # If no URLs found, try sitemap index format
        if not urls:
            for sitemap in root.findall('.//ns:sitemap/ns:loc', namespaces):
                sub_response = requests.get(sitemap.text, timeout=10)
                sub_root = ET.fromstring(sub_response.content)
                for url in sub_root.findall('.//ns:url/ns:loc', namespaces):
                    urls.append(url.text)
        
        # Cache the result
        sitemap_cache[sitemap_url] = urls
        sitemap_cache_time[sitemap_url] = current_time
        
        return urls
    except Exception as e:
        print(f"Error fetching sitemap: {e}")
        # Cache empty result to avoid repeated failures
        sitemap_cache[sitemap_url] = []
        sitemap_cache_time[sitemap_url] = current_time
        return []

def find_best_redirect(broken_url: str, sitemap_urls: List[str]) -> tuple[str, float]:
    """Find the best matching URL from sitemap for a broken URL"""
    if not sitemap_urls:
        return None, 0.0
    
    parsed_broken = urlparse(broken_url)
    broken_path = unquote(parsed_broken.path.lower())
    broken_segments = [s for s in broken_path.split('/') if s]
    
    # Extract language/locale from subdomain if exists
    broken_subdomain = parsed_broken.netloc.split('.')[0] if '.' in parsed_broken.netloc else ''
    
    best_match = None
    best_score = 0.0
    
    for sitemap_url in sitemap_urls:
        parsed_sitemap = urlparse(sitemap_url)
        sitemap_path = unquote(parsed_sitemap.path.lower())
        sitemap_segments = [s for s in sitemap_path.split('/') if s]
        
        # Calculate similarity score
        score = 0.0
        
        # 1. Path segment matching
        if broken_segments and sitemap_segments:
            # Check for matching segments
            matching_segments = set(broken_segments) & set(sitemap_segments)
            if matching_segments:
                score += len(matching_segments) / max(len(broken_segments), len(sitemap_segments)) * 0.4
        
        # 2. String similarity of the whole path
        path_similarity = SequenceMatcher(None, broken_path, sitemap_path).ratio()
        score += path_similarity * 0.35
        
        # 3. Check for language/locale patterns in path
        # If subdomain is a language code, look for similar patterns in sitemap path
        if broken_subdomain in ['cs', 'ko', 'lo', 'da', 'es', 'ja', 'zh-cn', 'ar', 'tl', 'sv', 'fi', 'de', 'en', 'ro', 'it', 'vi']:
            # Check if path contains language-specific keywords
            if any(lang_keyword in sitemap_path for lang_keyword in ['blog', 'services', 'category', 'location']):
                score += 0.1
        
        # 4. Bonus for matching keywords in segments
        if broken_segments and sitemap_segments:
            # Check for blog posts
            if 'blog' in broken_segments and 'blog' in sitemap_segments:
                score += 0.15
            # Check for services
            if any('service' in seg for seg in broken_segments) and any('service' in seg for seg in sitemap_segments):
                score += 0.1
            # Check for categories
            if any('categor' in seg for seg in broken_segments) and any('categor' in seg for seg in sitemap_segments):
                score += 0.1
        
        # 5. Special handling for language-specific URLs
        # Try to match the main content part ignoring language prefix
        if broken_segments and sitemap_segments:
            # Remove common language-specific segments
            broken_content = [s for s in broken_segments if s not in ['kategorie', 'categoria', 'categoría', '범주', 'ປະເພດ']]
            sitemap_content = [s for s in sitemap_segments if s not in ['category', 'categories']]
            
            if broken_content and sitemap_content:
                content_match = set(broken_content) & set(sitemap_content)
                if content_match:
                    score += len(content_match) / max(len(broken_content), len(sitemap_content)) * 0.2
        
        if score > best_score:
            best_score = score
            best_match = sitemap_url
    
    # Lower threshold for better matching
    if best_score >= 0.25:
        return best_match, best_score
    
    return None, 0.0

@app.post("/api/check-urls")
async def check_urls(request: URLCheckRequest):
    """Check multiple URLs for 404 errors and suggest redirects"""
    loop = asyncio.get_event_loop()
    
    with ThreadPoolExecutor(max_workers=request.max_workers) as executor:
        futures = [
            loop.run_in_executor(executor, check_url, url)
            for url in request.urls
        ]
        results = await asyncio.gather(*futures)
    
    # For 404 URLs, fetch sitemap from their final URL domain and find best match
    for result in results:
        if result['is_404'] or (result['status_code'] and result['status_code'] >= 400):
            # Use final_url if available, otherwise original_url
            url_to_check = result.get('final_url') or result['original_url']
            
            if url_to_check:
                # Extract domain and construct sitemap URL
                parsed = urlparse(url_to_check)
                base_domain = f"{parsed.scheme}://{parsed.netloc}"
                
                # Use custom sitemap URL if provided, otherwise use default
                if request.sitemap_url:
                    # If sitemap_url starts with /, prepend base domain
                    if request.sitemap_url.startswith('/'):
                        sitemap_url = base_domain + request.sitemap_url
                    elif request.sitemap_url.startswith('http'):
                        sitemap_url = request.sitemap_url
                    else:
                        sitemap_url = base_domain + '/' + request.sitemap_url
                else:
                    sitemap_url = f"{base_domain}/sitemap.xml"
                
                # Fetch sitemap for this specific domain
                sitemap_urls = fetch_sitemap(sitemap_url)
                
                if sitemap_urls:
                    # Find best matching URL from sitemap
                    suggested_url, score = find_best_redirect(url_to_check, sitemap_urls)
                    if suggested_url:
                        result['suggested_redirect'] = suggested_url
                        result['match_score'] = round(score, 2)
                    else:
                        # If no match found, use homepage
                        result['suggested_redirect'] = base_domain + '/'
                        result['match_score'] = 0.0
                else:
                    # If no sitemap found, mark as sitemap error
                    result['suggested_redirect'] = None
                    result['match_score'] = 0.0
                    result['sitemap_error'] = True
                    result['sitemap_error_message'] = f"Cannot access sitemap at {sitemap_url}"
                    print(f"No sitemap found at: {sitemap_url}")
    
    summary = {
        'total': len(results),
        'status_404': sum(1 for r in results if r['is_404']),
        'status_200': sum(1 for r in results if r.get('status_code') == 200),
        'errors': sum(1 for r in results if r['error']),
        'other_status': 0,
        'with_suggestions': sum(1 for r in results if r.get('suggested_redirect')),
        'sitemap_errors': sum(1 for r in results if r.get('sitemap_error'))
    }
    summary['other_status'] = summary['total'] - summary['status_404'] - summary['status_200'] - summary['errors']
    
    return {
        'results': results,
        'summary': summary
    }

@app.get("/api/export/{format}")
async def export_results(format: str, data: str):
    """Export results in CSV or JSON format"""
    results = json.loads(data)
    
    if format == 'json':
        output = json.dumps(results, indent=2)
        media_type = 'application/json'
        filename = 'results_404_check.json'
    elif format == 'csv':
        output = io.StringIO()
        fieldnames = ['original_url', 'status_code', 'final_url', 'is_404', 'error', 'checked_at']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
        output.seek(0)
        media_type = 'text/csv'
        filename = 'results_404_check.csv'
    else:
        raise HTTPException(status_code=400, detail="Format must be 'json' or 'csv'")
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode() if isinstance(output, io.StringIO) else output),
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )

@app.post("/api/test-sitemap")
async def test_sitemap(request: SitemapTestRequest):
    """Test if sitemap URL is valid and accessible"""
    try:
        # Build full sitemap URL
        sitemap_url = request.sitemap_url
        
        # If sample_url is provided, use its domain
        if request.sample_url:
            parsed = urlparse(request.sample_url)
            base_domain = f"{parsed.scheme}://{parsed.netloc}"
            
            if sitemap_url.startswith('/'):
                sitemap_url = base_domain + sitemap_url
            elif not sitemap_url.startswith('http'):
                sitemap_url = base_domain + '/' + sitemap_url
        
        # Try to fetch the sitemap
        print(f"Testing sitemap: {sitemap_url}")
        response = requests.get(sitemap_url, timeout=10)
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Sitemap returned status code {response.status_code}",
                "sitemap_url": sitemap_url,
                "suggestion": "Please check if the sitemap URL is correct"
            }
        
        # Try to parse as XML
        try:
            root = ET.fromstring(response.content)
            namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            # Count URLs in sitemap
            urls = root.findall('.//ns:url/ns:loc', namespaces)
            sitemap_urls = root.findall('.//ns:sitemap/ns:loc', namespaces)
            
            total_urls = len(urls) + len(sitemap_urls)
            
            if total_urls == 0:
                return {
                    "success": False,
                    "error": "Sitemap is empty or invalid format",
                    "sitemap_url": sitemap_url,
                    "suggestion": "The sitemap exists but contains no URLs. Try /sitemap_index.xml or another sitemap path"
                }
            
            return {
                "success": True,
                "sitemap_url": sitemap_url,
                "url_count": len(urls),
                "sitemap_index_count": len(sitemap_urls),
                "total_items": total_urls,
                "type": "sitemap_index" if len(sitemap_urls) > 0 else "url_sitemap"
            }
            
        except ET.ParseError as e:
            return {
                "success": False,
                "error": "Invalid XML format",
                "sitemap_url": sitemap_url,
                "details": str(e),
                "suggestion": "The URL exists but is not a valid XML sitemap. Please check the URL"
            }
            
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Timeout - sitemap took too long to respond",
            "sitemap_url": sitemap_url,
            "suggestion": "The server is too slow. Try again or use a different sitemap URL"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Cannot connect to sitemap URL",
            "sitemap_url": sitemap_url,
            "suggestion": "Check if the domain is correct and accessible"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "sitemap_url": sitemap_url,
            "suggestion": "An unexpected error occurred. Please try a different sitemap URL"
        }

@app.get("/")
async def root():
    return {"message": "404 URL Checker API"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)