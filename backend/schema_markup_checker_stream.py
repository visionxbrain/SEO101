from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Generator, Any
import requests
from bs4 import BeautifulSoup
import json
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
from thai_encoding_fix import fix_thai_encoding

router = APIRouter()

class SchemaCheckStreamRequest(BaseModel):
    sitemap_url: str
    max_workers: int = 5
    limit: Optional[int] = 50  # Default limit for streaming

def extract_urls_from_sitemap(sitemap_url: str, limit: Optional[int] = None) -> List[str]:
    """Extract URLs from a sitemap.xml file with improved error handling"""
    try:
        if not sitemap_url.startswith('http'):
            return []
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/xml,text/xml,*/*;q=0.8'
        }
        
        session = requests.Session()
        response = session.get(sitemap_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        namespaces = {
            'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        }
        
        urls = []
        
        # Check if it's a sitemap index
        sitemap_tags = root.findall('.//ns:sitemap/ns:loc', namespaces)
        if sitemap_tags:
            # It's a sitemap index
            for sitemap_tag in sitemap_tags:
                child_sitemap_url = sitemap_tag.text.strip()
                try:
                    child_urls = extract_urls_from_sitemap(child_sitemap_url, limit)
                    urls.extend(child_urls)
                    if limit and len(urls) >= limit:
                        return urls[:limit]
                except:
                    continue
        else:
            # Regular sitemap with URLs
            url_tags = root.findall('.//ns:url/ns:loc', namespaces)
            for url_tag in url_tags:
                url = url_tag.text.strip()
                urls.append(url)
                if limit and len(urls) >= limit:
                    return urls[:limit]
        
        return urls
        
    except Exception as e:
        print(f"Error extracting sitemap: {e}")
        return []

def extract_schema_markup(url: str) -> Dict:
    """Extract and analyze Schema.org markup from a webpage"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
        
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=12, allow_redirects=True)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        schemas = []
        schema_types = set()
        
        # 1. Check for JSON-LD Schema
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                # Get the raw script content
                raw_content = script.string
                
                # First try to parse as-is
                try:
                    schema_data = json.loads(raw_content)
                except json.JSONDecodeError:
                    # If it fails, try to fix common encoding issues
                    # Remove BOM if present
                    if raw_content.startswith('\ufeff'):
                        raw_content = raw_content[1:]
                    # Try again
                    schema_data = json.loads(raw_content)
                
                # Fix Thai encoding in the parsed data
                schema_data = fix_thai_encoding(schema_data)
                
                if isinstance(schema_data, list):
                    for item in schema_data:
                        if '@type' in item:
                            schema_types.add(item['@type'])
                            schemas.append({
                                'format': 'JSON-LD',
                                'type': item['@type'],
                                'data': item
                            })
                elif '@type' in schema_data:
                    schema_types.add(schema_data['@type'])
                    schemas.append({
                        'format': 'JSON-LD',
                        'type': schema_data['@type'],
                        'data': schema_data
                    })
            except (json.JSONDecodeError, Exception) as e:
                # Log the error but continue
                print(f"Error parsing JSON-LD: {str(e)[:100]}")
                continue
        
        # 2. Check for Microdata
        microdata_items = soup.find_all(attrs={'itemscope': True})
        for item in microdata_items:
            item_type = item.get('itemtype', '')
            if 'schema.org' in item_type:
                schema_type = item_type.split('/')[-1]
                schema_types.add(schema_type)
                
                properties = {}
                for prop in item.find_all(attrs={'itemprop': True}):
                    prop_name = prop.get('itemprop')
                    prop_value = prop.get('content') or prop.get_text(strip=True)
                    properties[prop_name] = prop_value
                
                schemas.append({
                    'format': 'Microdata',
                    'type': schema_type,
                    'data': properties
                })
        
        # Analyze for AI Search Optimization
        recommendations = []
        score = 0
        ai_optimized = False
        
        # Check for essential schema types
        ai_essential_types = {
            'Article', 'NewsArticle', 'BlogPosting', 'WebPage',
            'Product', 'Review', 'AggregateRating',
            'Organization', 'LocalBusiness', 'Person',
            'FAQPage', 'HowTo', 'Recipe', 'Event',
            'BreadcrumbList', 'VideoObject', 'ImageObject'
        }
        
        found_essential = schema_types & ai_essential_types
        if found_essential:
            score += 30
            ai_optimized = True
        else:
            recommendations.append("เพิ่ม Schema ประเภทหลักเช่น Article, Product, Organization")
        
        # Check for rich properties in schemas
        for schema in schemas:
            if schema['format'] == 'JSON-LD':
                data = schema['data']
                
                # Check for essential properties
                if 'name' in data or 'headline' in data:
                    score += 10
                if 'description' in data:
                    score += 10
                if 'image' in data:
                    score += 10
                if 'author' in data:
                    score += 10
                
                # Special schema bonuses
                if schema['type'] == 'BreadcrumbList':
                    score += 15
                    ai_optimized = True
                elif schema['type'] == 'FAQPage':
                    score += 20
                    ai_optimized = True
                elif schema['type'] in ['Review', 'AggregateRating']:
                    score += 15
                    ai_optimized = True
        
        # General recommendations
        if not schemas:
            recommendations.append("ไม่พบ Schema Markup - ควรเพิ่ม JSON-LD Schema")
            recommendations.append("เริ่มต้นด้วย WebPage หรือ Article Schema")
        
        if len(schemas) < 2:
            recommendations.append("เพิ่ม Schema หลายประเภทเพื่อข้อมูลที่สมบูรณ์")
        
        if 'BreadcrumbList' not in schema_types:
            recommendations.append("เพิ่ม BreadcrumbList สำหรับ navigation")
        
        # Calculate final score (max 100)
        score = min(score, 100)
        
        return {
            'url': url,
            'has_schema': len(schemas) > 0,
            'schema_types': list(schema_types),
            'schema_count': len(schemas),
            'schemas': schemas[:3],  # Limit schemas in response to reduce size
            'ai_search_optimized': ai_optimized,
            'recommendations': recommendations[:3],  # Top 3 recommendations
            'score': score,
            'checked_at': datetime.now().isoformat()
        }
        
    except requests.exceptions.Timeout:
        return {
            'url': url,
            'has_schema': False,
            'schema_types': [],
            'schema_count': 0,
            'schemas': [],
            'ai_search_optimized': False,
            'recommendations': ['Timeout - เว็บไซต์ตอบสนองช้า'],
            'score': 0,
            'error': 'Timeout'
        }
    except requests.exceptions.RequestException as e:
        return {
            'url': url,
            'has_schema': False,
            'schema_types': [],
            'schema_count': 0,
            'schemas': [],
            'ai_search_optimized': False,
            'recommendations': [f'ไม่สามารถเข้าถึง URL: {str(e)[:50]}'],
            'score': 0,
            'error': str(e)[:100]
        }
    except Exception as e:
        return {
            'url': url,
            'has_schema': False,
            'schema_types': [],
            'schema_count': 0,
            'schemas': [],
            'ai_search_optimized': False,
            'recommendations': ['เกิดข้อผิดพลาด'],
            'score': 0,
            'error': str(e)[:100]
        }

async def stream_schema_check(request: SchemaCheckStreamRequest) -> Generator:
    """Stream schema checking progress with improved stability"""
    
    # Send initial status
    yield f"data: {json.dumps({'type': 'status', 'message': 'กำลังดึงข้อมูลจาก Sitemap...', 'progress': 0}, ensure_ascii=False)}\\n\\n"
    yield f": keep-alive\\n\\n"
    
    # Step 1: Fetch URLs from sitemap
    urls = extract_urls_from_sitemap(request.sitemap_url, request.limit)
    
    if not urls:
        yield f"data: {json.dumps({'type': 'error', 'message': 'ไม่พบ URLs ใน sitemap หรือไม่สามารถเข้าถึง sitemap'}, ensure_ascii=False)}\\n\\n"
        return
    
    yield f"data: {json.dumps({'type': 'status', 'message': f'พบ {len(urls)} URLs กำลังตรวจสอบ Schema...', 'progress': 10, 'total_urls': len(urls)}, ensure_ascii=False)}\\n\\n"
    
    # Step 2: Check schema for each URL
    results = []
    with_schema = 0
    without_schema = 0
    ai_optimized = 0
    total_score = 0
    schema_types_count = {}
    
    # Process URLs in batches
    batch_size = 5
    for batch_start in range(0, len(urls), batch_size):
        batch_end = min(batch_start + batch_size, len(urls))
        batch = urls[batch_start:batch_end]
        
        yield f"data: {json.dumps({'type': 'log', 'message': f'ตรวจสอบ URLs {batch_start + 1}-{batch_end} จาก {len(urls)}', 'current': batch_end, 'total': len(urls)}, ensure_ascii=False)}\\n\\n"
        
        # Check schemas in batch
        with ThreadPoolExecutor(max_workers=min(request.max_workers, 3)) as executor:
            futures = [executor.submit(extract_schema_markup, url) for url in batch]
            
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=15)
                    results.append(result)
                    
                    # Update statistics
                    if result['has_schema']:
                        with_schema += 1
                        yield f"data: {json.dumps({'type': 'found', 'url': result['url'], 'schema_count': result['schema_count'], 'types': result['schema_types'][:3]}, ensure_ascii=False)}\\n\\n"
                    else:
                        without_schema += 1
                        yield f"data: {json.dumps({'type': 'not_found', 'url': result['url']}, ensure_ascii=False)}\\n\\n"
                    
                    if result.get('ai_search_optimized'):
                        ai_optimized += 1
                    
                    total_score += result['score']
                    
                    # Count schema types
                    for schema_type in result['schema_types']:
                        schema_types_count[schema_type] = schema_types_count.get(schema_type, 0) + 1
                    
                except Exception as e:
                    print(f"Error processing result: {e}")
                    continue
        
        # Update progress
        progress = 10 + (80 * batch_end / len(urls))
        yield f"data: {json.dumps({'type': 'progress', 'progress': round(progress)}, ensure_ascii=False)}\\n\\n"
        
        # Keep-alive between batches
        yield f": keep-alive\\n\\n"
        await asyncio.sleep(0.2)
    
    # Step 3: Prepare summary
    yield f"data: {json.dumps({'type': 'status', 'message': 'กำลังสรุปผลการตรวจสอบ...', 'progress': 90}, ensure_ascii=False)}\\n\\n"
    
    # Sort schema types by frequency
    common_types = dict(sorted(
        schema_types_count.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10])
    
    summary = {
        'total_urls': len(results),
        'with_schema': with_schema,
        'without_schema': without_schema,
        'ai_optimized': ai_optimized,
        'average_score': round(total_score / len(results)) if results else 0,
        'common_types': common_types
    }
    
    # Send final results
    final_data = {
        'type': 'complete',
        'results': results,
        'summary': summary,
        'progress': 100
    }
    
    yield f"data: {json.dumps(final_data, ensure_ascii=False)}\\n\\n"

@router.get("/api/check-schema-markup-stream")
async def check_schema_markup_stream(
    sitemap_url: str,
    limit: int = 50,
    max_workers: int = 5
):
    """Stream schema markup checking progress with improved stability"""
    
    # Limit max_workers for stability
    max_workers = min(max_workers, 3)
    
    request = SchemaCheckStreamRequest(
        sitemap_url=sitemap_url,
        limit=limit,
        max_workers=max_workers
    )
    
    return StreamingResponse(
        stream_schema_check(request),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff"
        }
    )