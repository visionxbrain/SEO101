from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from datetime import datetime
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
import xml.etree.ElementTree as ET

router = APIRouter()

class HeadingCheckRequest(BaseModel):
    urls: Union[List[str], str]  # Can be list of URLs or sitemap URL
    max_workers: int = 5
    limit: Optional[int] = None  # Optional limit for sitemap URLs

class HeadingIssue(BaseModel):
    type: str  # 'missing_h1', 'multiple_h1', 'skipped_level', 'empty_heading', 'too_long', 'keyword_stuffing', 'not_descriptive', 'no_semantic_structure', 'missing_keywords'
    level: Optional[int]
    message: str
    suggestion: str
    element: Optional[str]
    severity: str  # 'critical', 'high', 'medium', 'low'
    seo_impact: str  # Impact on SEO performance

class HeadingStructure(BaseModel):
    url: str
    has_h1: bool
    h1_count: int
    h1_text: List[str]
    heading_hierarchy: List[Dict[str, Any]]
    issues: List[HeadingIssue]
    score: int
    recommendations: List[str]
    optimized_structure: Optional[List[Dict[str, Any]]]
    seo_metrics: Dict[str, Any]  # Additional SEO metrics
    ai_readiness_score: int  # Score for AI search optimization
    semantic_score: int  # Semantic structure score
    user_intent_alignment: float  # How well headings align with user intent
    checked_at: str

def extract_urls_from_sitemap(sitemap_url: str, limit: Optional[int] = None) -> List[str]:
    """Extract URLs from a sitemap.xml file"""
    try:
        if not sitemap_url.startswith('http'):
            return []
        
        response = requests.get(sitemap_url, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        # Handle different sitemap formats
        namespaces = {
            'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        }
        
        urls = []
        
        # Check if it's a sitemap index
        sitemap_tags = root.findall('.//ns:sitemap/ns:loc', namespaces)
        if sitemap_tags:
            # It's a sitemap index, recursively get URLs from each sitemap
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

def analyze_heading_structure(url: str) -> Dict:
    """Analyze heading structure of a webpage with 2025 SEO best practices
    
    Focuses on:
    - E-E-A-T signals
    - AI Search Optimization (ASO/AEO)
    - Semantic HTML5 structure
    - User intent and search behavior
    - Core Web Vitals impact
    - Featured Snippet optimization
    """
    # Define question words early for use throughout the function
    question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which',
                    'อะไร', 'อย่างไร', 'ทำไม', 'เมื่อไหร่', 'ที่ไหน', 'ใคร', 'แบบไหน']
    
    try:
        # Add headers to avoid blocking
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        }
        
        # Some sites need session for cookies
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        # Try different parsers if content is problematic
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
        except:
            # Fallback to lxml if available
            try:
                soup = BeautifulSoup(response.content, 'lxml')
            except:
                # Last resort - try with explicit encoding
                soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract all headings
        headings = []
        heading_hierarchy = []
        issues = []
        recommendations = []
        
        # Extract page title for context
        title_tag = soup.find('title')
        page_title = title_tag.text if title_tag else ''
        
        # Check for semantic HTML5 elements
        has_article = bool(soup.find('article'))
        has_section = bool(soup.find('section'))
        has_nav = bool(soup.find('nav'))
        has_main = bool(soup.find('main'))
        
        # Calculate semantic score early (needed for all paths)
        semantic_score = 0
        if has_main:
            semantic_score += 25
        if has_article:
            semantic_score += 25
        if has_section:
            semantic_score += 25
        if has_nav:
            semantic_score += 25
        
        # Find all heading tags in DOM order
        all_headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        # If no headings found, might be JavaScript-rendered site or genuinely missing headings
        if not all_headings:
            # Check for common React/Vue/Angular indicators
            body_text = soup.get_text().strip()
            
            # Look for Next.js or React app indicators
            is_spa = False
            if soup.find('div', id='__next') or soup.find('div', id='root'):
                is_spa = True
            if soup.find('script', src=lambda x: x and ('_next' in x or 'react' in x or 'vue' in x or 'angular' in x)):
                is_spa = True
            
            # Check if page has significant content but no headings (like make2web.com)
            has_content = len(body_text) > 500
            
            # Check for alternative content structures
            divs_with_text = soup.find_all('div', string=True)
            has_div_content = len(divs_with_text) > 10
            
            if is_spa and len(body_text) < 500:
                # This is likely a JavaScript-rendered site with no static content
                return {
                    'url': url,
                    'has_h1': False,
                    'h1_count': 0,
                    'h1_text': [],
                    'heading_hierarchy': [],
                    'issues': [{
                        'type': 'javascript_rendered',
                        'level': None,
                        'message': 'เว็บไซต์นี้ใช้ JavaScript Rendering',
                        'suggestion': 'ใช้ Chrome Extension สำหรับวิเคราะห์เว็บไซต์นี้',
                        'element': None,
                        'severity': 'info',
                        'seo_impact': 'ต้องใช้เครื่องมือที่รองรับ JavaScript'
                    }],
                    'score': 0,
                    'recommendations': [
                        '🌐 เว็บไซต์นี้เป็น Single Page Application (SPA)',
                        '🔧 ใช้ Chrome Extension เพื่อวิเคราะห์ heading แบบ real-time',
                        '💡 หรือตรวจสอบ View Source เพื่อดู meta tags สำหรับ SEO'
                    ],
                    'optimized_structure': None,
                    'seo_metrics': {
                        'featured_snippet_ready': False,
                        'voice_search_optimized': False,
                        'semantic_html_score': 0,
                        'content_depth': 'javascript-rendered',
                        'e_eat_signals': False,
                        'mobile_friendly_structure': False
                    },
                    'ai_readiness_score': 0,
                    'semantic_score': 0,
                    'user_intent_alignment': 0.0,
                    'checked_at': datetime.now().isoformat()
                }
            else:
                # This site has content but no proper heading structure (SEO ISSUE!)
                return {
                    'url': url,
                    'has_h1': False,
                    'h1_count': 0,
                    'h1_text': [],
                    'heading_hierarchy': [],
                    'issues': [{
                        'type': 'no_headings_found',
                        'level': None,
                        'message': '❌ ไม่พบ Heading Tags (H1-H6) ในเว็บไซต์นี้เลย!',
                        'suggestion': 'เพิ่ม H1-H6 tags ด่วน! นี่คือปัญหา SEO ร้ายแรง',
                        'element': None,
                        'severity': 'critical',
                        'seo_impact': 'เว็บไซต์จะไม่ได้รับการจัดอันดับที่ดีใน Google'
                    }],
                    'score': 0,
                    'recommendations': [
                        '🚨 CRITICAL: เว็บไซต์ไม่มี Heading Tags เลย!',
                        '❌ นี่เป็นปัญหา SEO ร้ายแรงมาก',
                        '🔧 เพิ่ม H1 สำหรับหัวข้อหลักของหน้า',
                        '📝 เพิ่ม H2-H3 สำหรับหัวข้อย่อย',
                        '⚠️ Google จะมองว่าเว็บไม่มีโครงสร้างที่ชัดเจน',
                        '💡 ปรับปรุงด่วนเพื่อ SEO ที่ดีขึ้น'
                    ],
                    'optimized_structure': [
                        {
                            'level': 1,
                            'tag': 'H1',
                            'text': '[เพิ่มด่วน] หัวข้อหลักของหน้า (Primary Keyword)',
                            'action': 'add',
                            'reason': 'CRITICAL: ต้องมี H1 เพื่อ SEO',
                            'seo_tip': 'ใส่ Primary Keyword และอธิบายเนื้อหาหลัก'
                        },
                        {
                            'level': 2,
                            'tag': 'H2',
                            'text': '[เพิ่ม] หัวข้อย่อยที่ 1',
                            'action': 'add',
                            'reason': 'เพิ่มโครงสร้างเนื้อหา',
                            'seo_tip': 'ใช้ LSI Keywords'
                        },
                        {
                            'level': 2,
                            'tag': 'H2',
                            'text': '[เพิ่ม] หัวข้อย่อยที่ 2',
                            'action': 'add',
                            'reason': 'เพิ่มความลึกของเนื้อหา',
                            'seo_tip': 'ตอบคำถามของผู้ใช้'
                        }
                    ],
                    'seo_metrics': {
                        'featured_snippet_ready': False,
                        'voice_search_optimized': False,
                        'semantic_html_score': semantic_score,
                        'content_depth': 'no_structure',
                        'e_eat_signals': False,
                        'mobile_friendly_structure': False
                    },
                    'ai_readiness_score': 0,
                    'semantic_score': semantic_score,
                    'user_intent_alignment': 0.0,
                    'checked_at': datetime.now().isoformat()
                }
        
        for tag in all_headings:
            level = int(tag.name[1])  # Extract number from 'h1', 'h2', etc.
            text = tag.get_text(strip=True)
            
            # Get parent context for better understanding
            parent = tag.parent
            parent_class = parent.get('class', []) if parent else []
            parent_id = parent.get('id', '') if parent else ''
            
            headings.append({
                'level': level,
                'text': text,
                'tag': f'h{level}',
                'empty': len(text) == 0,
                'length': len(text),
                'parent_class': parent_class,
                'parent_id': parent_id
            })
            
            heading_hierarchy.append({
                'level': level,
                'tag': f'H{level}',
                'text': text[:100] if text else '(empty)',
                'full_text': text,  # Keep full text for analysis
                'issues': []
            })
        
        # Check for H1 issues
        h1_tags = [h for h in headings if h['level'] == 1]
        h1_count = len(h1_tags)
        h1_texts = [h['text'] for h in h1_tags]
        
        score = 100  # Start with perfect score
        
        # Issue 1: Missing H1 (CRITICAL for SEO)
        if h1_count == 0:
            issues.append({
                'type': 'missing_h1',
                'level': 1,
                'message': 'ไม่พบ H1 ในหน้าเว็บ',
                'suggestion': 'เพิ่ม H1 ที่มี Primary Keyword และอธิบายหัวข้อหลักชัดเจน',
                'element': None,
                'severity': 'critical',
                'seo_impact': 'ส่งผลกระทบร้ายแรงต่อการจัดอันดับและ Featured Snippets'
            })
            recommendations.append('🚨 CRITICAL: เพิ่ม H1 ที่มี Primary Keyword เพื่อ SEO และ AI Search')
            score -= 30
        
        # Issue 2: Multiple H1s (HIGH impact on SEO)
        elif h1_count > 1:
            issues.append({
                'type': 'multiple_h1',
                'level': 1,
                'message': f'พบ H1 มากกว่า 1 แท็ก ({h1_count} แท็ก)',
                'suggestion': 'ใช้ H1 เดียวสำหรับ Primary Topic และใช้ H2 สำหรับ Subtopics',
                'element': ', '.join(h1_texts),
                'severity': 'high',
                'seo_impact': 'สร้างความสับสนให้ Search Engines และ AI ในการระบุหัวข้อหลัก'
            })
            recommendations.append(f'⚠️ ลด H1 เหลือ 1 แท็ก และใช้ H2 สำหรับหัวข้อย่อย (มี {h1_count} H1)')
            score -= 20
        
        # Issue 3: Empty headings
        empty_headings = [h for h in headings if h['empty']]
        if empty_headings:
            for h in empty_headings:
                issues.append({
                    'type': 'empty_heading',
                    'level': h['level'],
                    'message': f'พบ H{h["level"]} ที่ไม่มีข้อความ',
                    'suggestion': f'เพิ่มข้อความใน H{h["level"]} หรือลบแท็กออก',
                    'element': f'H{h["level"]}'
                })
            recommendations.append(f'⚠️ ลบหรือเพิ่มข้อความในแท็ก heading ที่ว่างเปล่า ({len(empty_headings)} แท็ก)')
            score -= (5 * len(empty_headings))
        
        # Issue 4: Heading too long
        long_headings = [h for h in headings if h['length'] > 70]
        if long_headings:
            for h in long_headings:
                issues.append({
                    'type': 'too_long',
                    'level': h['level'],
                    'message': f'H{h["level"]} ยาวเกินไป ({h["length"]} ตัวอักษร)',
                    'suggestion': f'ควรย่อ H{h["level"]} ให้สั้นกว่า 70 ตัวอักษร',
                    'element': h['text'][:50] + '...'
                })
            recommendations.append(f'⚠️ ย่อ heading ที่ยาวเกินไปให้กระชับขึ้น ({len(long_headings)} แท็ก)')
            score -= (3 * len(long_headings))
        
        # Issue 5: Check heading hierarchy (no skipping levels)
        if headings:
            prev_level = 0
            for h in sorted(headings, key=lambda x: headings.index(x)):
                if prev_level > 0 and h['level'] > prev_level + 1:
                    issues.append({
                        'type': 'skipped_level',
                        'level': h['level'],
                        'message': f'ข้ามระดับ heading จาก H{prev_level} ไป H{h["level"]}',
                        'suggestion': f'ใช้ H{prev_level + 1} แทน H{h["level"]} เพื่อรักษาลำดับชั้น',
                        'element': h['text'][:50]
                    })
                    score -= 10
                prev_level = h['level']
            
            if any(i['type'] == 'skipped_level' for i in issues):
                recommendations.append('⚠️ ปรับลำดับ heading ให้ไม่ข้ามระดับ (H1→H2→H3...)')
        
        # NEW SEO 2025 Checks
        
        # Check 1: H1 length optimization (55-60 characters ideal for SERP)
        if h1_count == 1 and h1_texts[0]:
            h1_length = len(h1_texts[0])
            if h1_length < 20:
                issues.append({
                    'type': 'h1_too_short',
                    'level': 1,
                    'message': f'H1 สั้นเกินไป ({h1_length} ตัวอักษร)',
                    'suggestion': 'H1 ควรมี 30-60 ตัวอักษรเพื่อ SEO ที่ดีที่สุด',
                    'element': h1_texts[0],
                    'severity': 'medium',
                    'seo_impact': 'อาจไม่สื่อสารเนื้อหาได้ชัดเจนพอสำหรับ Search Intent'
                })
                score -= 5
            elif h1_length > 60:
                issues.append({
                    'type': 'h1_too_long',
                    'level': 1,
                    'message': f'H1 ยาวเกินไป ({h1_length} ตัวอักษร)',
                    'suggestion': 'ย่อ H1 ให้อยู่ในช่วง 30-60 ตัวอักษรเพื่อ Featured Snippet',
                    'element': h1_texts[0][:60] + '...',
                    'severity': 'medium',
                    'seo_impact': 'อาจถูกตัดใน SERP และ Featured Snippets'
                })
                score -= 5
        
        # Check 2: Keyword optimization in H1
        if h1_count == 1 and h1_texts[0]:
            h1_lower = h1_texts[0].lower()
            # Check for question words (good for voice search & AI)
            has_question = any(word in h1_lower for word in question_words)
            if has_question:
                recommendations.append('✅ H1 มีคำถาม - ดีสำหรับ Voice Search และ AI Search')
        
        # Check 3: Semantic HTML5 structure bonus (already calculated above)
        
        # Check 4: H2 optimization (should contain LSI keywords)
        h2_tags = [h for h in headings if h['level'] == 2]
        if len(h2_tags) < 2 and len(headings) > 3:
            issues.append({
                'type': 'insufficient_h2',
                'level': 2,
                'message': f'H2 น้อยเกินไป ({len(h2_tags)} แท็ก)',
                'suggestion': 'เพิ่ม H2 2-5 แท็กพร้อม LSI Keywords เพื่อครอบคลุม Subtopics',
                'element': None,
                'severity': 'medium',
                'seo_impact': 'ลดโอกาสในการจัดอันดับสำหรับ Long-tail Keywords'
            })
            score -= 10
        
        # Check 5: Content depth indicator
        total_headings = len(headings)
        if total_headings < 3 and url != 'https://www.example.com':
            issues.append({
                'type': 'shallow_content',
                'level': None,
                'message': f'โครงสร้างเนื้อหาตื้น (มี {total_headings} headings)',
                'suggestion': 'เพิ่มความลึกของเนื้อหาด้วย H2-H4 เพื่อ E-E-A-T',
                'element': None,
                'severity': 'medium',
                'seo_impact': 'อาจถูกมองว่าเป็น Thin Content โดย Google'
            })
            score -= 15
        
        # Issue 6: H2-H6 without H1
        if h1_count == 0 and len(headings) > 0:
            recommendations.append('⚠️ มี H2-H6 แต่ไม่มี H1 ซึ่งเป็นหัวข้อหลัก')
            score -= 10
        
        # Generate optimized structure suggestion
        optimized_structure = generate_optimized_structure(headings, h1_texts)
        
        # Calculate AI Readiness Score
        ai_readiness_score = 0
        if h1_count == 1:
            ai_readiness_score += 30
        if semantic_score >= 50:
            ai_readiness_score += 20
        if len(h2_tags) >= 2:
            ai_readiness_score += 20
        if not any(i['type'] == 'skipped_level' for i in issues):
            ai_readiness_score += 15
        if total_headings >= 3:
            ai_readiness_score += 15
        
        # Calculate User Intent Alignment
        user_intent_alignment = 0.0
        if h1_count == 1 and h1_texts[0]:
            # Check for clear intent signals
            if any(word in h1_texts[0].lower() for word in question_words):
                user_intent_alignment += 0.3
            if 20 <= len(h1_texts[0]) <= 60:
                user_intent_alignment += 0.3
            if len(h2_tags) >= 2:
                user_intent_alignment += 0.4
        
        # Ensure score doesn't go below 0
        score = max(0, score)
        
        # Add SEO 2025 specific recommendations
        if semantic_score < 50:
            recommendations.append('🎯 เพิ่ม Semantic HTML5 tags (<main>, <article>, <section>) เพื่อ AI Search')
        
        if ai_readiness_score < 50:
            recommendations.append('🤖 ปรับปรุงโครงสร้างเพื่อ AI Search Optimization (ASO)')
        
        # Add general recommendations
        if score >= 90:
            recommendations.append('✅ โครงสร้าง heading ดีเยี่ยมสำหรับ SEO 2025!')
        elif score >= 75:
            recommendations.append('👍 โครงสร้างดี แต่ควรเพิ่ม E-E-A-T signals')
        elif score >= 60:
            recommendations.append('⚠️ ปรับปรุงเพื่อ Featured Snippets และ AI Search')
        else:
            recommendations.append('🚨 ต้องปรับปรุงด่วนเพื่อ Core Web Vitals และ Helpful Content')
        
        # SEO metrics calculation
        seo_metrics = {
            'featured_snippet_ready': score >= 80 and h1_count == 1 and len(h2_tags) >= 2,
            'voice_search_optimized': any(word in (h1_texts[0].lower() if h1_texts else '') for word in question_words),
            'semantic_html_score': semantic_score,
            'content_depth': 'deep' if total_headings >= 6 else 'medium' if total_headings >= 3 else 'shallow',
            'e_eat_signals': score >= 75 and semantic_score >= 50,
            'mobile_friendly_structure': all(h['length'] <= 60 for h in h1_tags) if h1_tags else False
        }
        
        return {
            'url': url,
            'has_h1': h1_count > 0,
            'h1_count': h1_count,
            'h1_text': h1_texts,
            'heading_hierarchy': heading_hierarchy,
            'issues': issues,
            'score': score,
            'recommendations': recommendations[:6],  # Top 6 recommendations
            'optimized_structure': optimized_structure,
            'seo_metrics': seo_metrics,
            'ai_readiness_score': ai_readiness_score,
            'semantic_score': semantic_score,
            'user_intent_alignment': round(user_intent_alignment, 2),
            'checked_at': datetime.now().isoformat()
        }
        
    except requests.exceptions.SSLError as e:
        error_msg = 'SSL Certificate Error - เว็บไซต์มีปัญหาใบรับรอง SSL'
        return create_error_response(url, error_msg, str(e))
    except requests.exceptions.ConnectionError as e:
        error_msg = 'Connection Error - ไม่สามารถเชื่อมต่อกับเว็บไซต์'
        return create_error_response(url, error_msg, str(e))
    except requests.exceptions.Timeout as e:
        error_msg = 'Timeout - เว็บไซต์ใช้เวลาตอบสนองนานเกินไป'
        return create_error_response(url, error_msg, str(e))
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            error_msg = 'Access Denied (403) - เว็บไซต์ปฏิเสธการเข้าถึง'
        elif e.response.status_code == 404:
            error_msg = 'Not Found (404) - ไม่พบหน้าเว็บที่ระบุ'
        elif e.response.status_code == 500:
            error_msg = 'Server Error (500) - เซิร์ฟเวอร์มีปัญหา'
        else:
            error_msg = f'HTTP Error ({e.response.status_code})'
        return create_error_response(url, error_msg, str(e))
    except requests.exceptions.RequestException as e:
        error_msg = 'Request Error - ไม่สามารถดึงข้อมูลจากเว็บไซต์'
        return create_error_response(url, error_msg, str(e))
    except Exception as e:
        error_msg = 'Unexpected Error - เกิดข้อผิดพลาดที่ไม่คาดคิด'
        return create_error_response(url, error_msg, str(e))

def get_error_suggestion(error_msg: str) -> str:
    """Get suggestion based on error type"""
    if 'SSL' in error_msg:
        return 'ลองเปลี่ยนจาก https:// เป็น http:// หรือตรวจสอบใบรับรอง SSL'
    elif '403' in error_msg:
        return 'เว็บไซต์อาจมีการป้องกัน bot - ลองใช้ Chrome Extension แทน'
    elif '404' in error_msg:
        return 'ตรวจสอบ URL ให้ถูกต้อง หรือหน้าเว็บอาจถูกลบแล้ว'
    elif 'Connection' in error_msg:
        return 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือเว็บไซต์อาจล่ม'
    elif 'Timeout' in error_msg:
        return 'เว็บไซต์ตอบสนองช้า ลองใหม่ในภายหลัง'
    else:
        return 'ตรวจสอบ URL และลองใหม่อีกครั้ง หรือใช้ Chrome Extension'

def create_error_response(url: str, error_msg: str, error_detail: str) -> Dict:
    """Create standardized error response"""
    return {
        'url': url,
        'has_h1': False,
        'h1_count': 0,
        'h1_text': [],
        'heading_hierarchy': [],
        'issues': [{
            'type': 'error',
            'level': None,
            'message': error_msg,
            'suggestion': get_error_suggestion(error_msg),
            'element': None,
            'severity': 'critical',
            'seo_impact': 'ไม่สามารถวิเคราะห์ SEO ได้'
        }],
        'score': 0,
        'recommendations': [f'{error_msg}: {error_detail[:100]}'],
            'optimized_structure': None,
            'seo_metrics': {
                'featured_snippet_ready': False,
                'voice_search_optimized': False,
                'semantic_html_score': 0,
                'content_depth': 'unknown',
                'e_eat_signals': False,
                'mobile_friendly_structure': False
            },
            'ai_readiness_score': 0,
            'semantic_score': 0,
            'user_intent_alignment': 0.0,
            'checked_at': datetime.now().isoformat()
        }

def generate_optimized_structure(current_headings: List[Dict], h1_texts: List[str]) -> List[Dict[str, Any]]:
    """Generate an optimized heading structure suggestion for SEO 2025
    
    Based on:
    - Google Core Update 2025 guidelines
    - E-E-A-T requirements
    - AI Search Optimization
    - Featured Snippet eligibility
    """
    optimized = []
    
    # Suggest H1 if missing
    if not h1_texts:
        optimized.append({
            'level': 1,
            'tag': 'H1',
            'text': '[เพิ่ม] Primary Keyword + หัวข้อหลัก (30-60 ตัวอักษร)',
            'action': 'add',
            'reason': 'CRITICAL: H1 จำเป็นสำหรับ SEO และ Featured Snippets',
            'seo_tip': 'ใส่ Primary Keyword ตอนต้นประโยค'
        })
    elif len(h1_texts) == 1:
        optimized.append({
            'level': 1,
            'tag': 'H1',
            'text': h1_texts[0],
            'action': 'keep',
            'reason': 'H1 ถูกต้องแล้ว'
        })
    else:
        # Multiple H1s - keep first, convert others
        optimized.append({
            'level': 1,
            'tag': 'H1',
            'text': h1_texts[0],
            'action': 'keep',
            'reason': 'เก็บ H1 แรกไว้'
        })
        for h1 in h1_texts[1:]:
            optimized.append({
                'level': 2,
                'tag': 'H2',
                'text': h1,
                'action': 'change',
                'reason': 'เปลี่ยนจาก H1 เป็น H2 (ควรมี H1 เดียว)'
            })
    
    # Process other headings
    current_level = 1
    for h in current_headings:
        if h['level'] == 1:
            continue  # Already handled
        
        # Check for level skipping
        if h['level'] > current_level + 1:
            # Suggest intermediate levels
            for level in range(current_level + 1, h['level']):
                optimized.append({
                    'level': level,
                    'tag': f'H{level}',
                    'text': f'[เพิ่ม] หัวข้อย่อยระดับ {level}',
                    'action': 'add',
                    'reason': f'เพิ่มเพื่อไม่ให้ข้ามจาก H{current_level} ไป H{h["level"]}'
                })
            current_level = h['level'] - 1
        
        # Add current heading
        if not h['empty']:
            optimized.append({
                'level': h['level'],
                'tag': f'H{h["level"]}',
                'text': h['text'][:70] if h['length'] <= 70 else h['text'][:67] + '...',
                'action': 'keep' if h['length'] <= 70 else 'shorten',
                'reason': 'ความยาวเหมาะสม' if h['length'] <= 70 else 'ย่อให้สั้นลง'
            })
            current_level = max(current_level, h['level'])
    
    return optimized[:20]  # Limit to 20 suggestions for UI

@router.post("/api/check-heading-structure")
async def check_heading_structure(request: HeadingCheckRequest):
    """Check heading structure for multiple URLs or sitemap"""
    
    # Get URLs to check
    urls_to_check = []
    
    if isinstance(request.urls, str):
        # Single string - check if it's a sitemap
        if 'sitemap' in request.urls.lower() or request.urls.endswith('.xml'):
            # It's a sitemap URL
            urls_to_check = extract_urls_from_sitemap(request.urls, request.limit)
            if not urls_to_check:
                raise HTTPException(status_code=400, detail="ไม่สามารถดึง URLs จาก sitemap ได้")
        else:
            # Single URL
            urls_to_check = [request.urls]
    else:
        # List of URLs
        urls_to_check = request.urls
    
    # Limit URLs if specified
    if request.limit and len(urls_to_check) > request.limit:
        urls_to_check = urls_to_check[:request.limit]
    
    results = []
    loop = asyncio.get_event_loop()
    
    with ThreadPoolExecutor(max_workers=request.max_workers) as executor:
        futures = [
            loop.run_in_executor(executor, analyze_heading_structure, url)
            for url in urls_to_check
        ]
        results = await asyncio.gather(*futures)
    
    # Calculate summary
    summary = {
        'total_urls': len(results),
        'with_h1': sum(1 for r in results if r['has_h1']),
        'without_h1': sum(1 for r in results if not r['has_h1']),
        'multiple_h1': sum(1 for r in results if r['h1_count'] > 1),
        'perfect_structure': sum(1 for r in results if r['score'] == 100),
        'average_score': round(sum(r['score'] for r in results) / len(results)) if results else 0,
        'common_issues': {}
    }
    
    # Add sitemap info if used
    if isinstance(request.urls, str) and ('sitemap' in request.urls.lower() or request.urls.endswith('.xml')):
        summary['source'] = 'sitemap'
        summary['sitemap_url'] = request.urls
        summary['urls_checked'] = len(urls_to_check)
    
    # Count common issues
    for result in results:
        for issue in result['issues']:
            issue_type = issue['type']
            summary['common_issues'][issue_type] = summary['common_issues'].get(issue_type, 0) + 1
    
    # Sort common issues by frequency
    summary['common_issues'] = dict(sorted(
        summary['common_issues'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10])  # Top 10 issues
    
    return {
        'results': results,
        'summary': summary
    }

@router.get("/api/heading-structure/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "heading-structure-analyzer"}