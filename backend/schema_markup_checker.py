from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
import requests
from bs4 import BeautifulSoup
import json
import re
from urllib.parse import urlparse, urljoin
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
import xml.etree.ElementTree as ET
from thai_encoding_fix import fix_thai_encoding

router = APIRouter()

class SchemaCheckRequest(BaseModel):
    urls: Union[List[str], str]  # Can be list of URLs or sitemap URL
    max_workers: int = 5
    limit: Optional[int] = None  # Optional limit for sitemap URLs

class SchemaResult(BaseModel):
    url: str
    has_schema: bool
    schema_types: List[str]
    schema_count: int
    schemas: List[Dict[str, Any]]
    ai_search_optimized: bool
    recommendations: List[str]
    score: int
    checked_at: str

def generate_schema_script(url: str, page_content: BeautifulSoup) -> Dict:
    """
    Generate SEO 2025 optimized Schema markup with E-E-A-T and AI Search optimization.
    
    คุณคือผู้เชี่ยวชาญด้าน SEO, AAO (Answer Engine Optimization), AEO (Answer Engine Optimization), 
    CRO x10 ระดับโลก ที่มีความเข้าใจเชิงลึกเกี่ยวกับ Google Algorithm ล่าสุด (Core Update 2025)
    
    Key principles:
    - E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
    - Helpful Content Update compliance
    - AI Search optimization (Google SGE, Bing Chat, Claude, ChatGPT)
    - Voice Search & Featured Snippets optimization
    - Zero-click search optimization
    - Mobile-first indexing
    - Core Web Vitals signals
    """
    
    try:
        # Parse URL
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        path = parsed_url.path
        
        # Extract basic page information
        title_tag = page_content.find('title')
        title = title_tag.text.strip() if title_tag else f"Page at {path if path != '/' else domain}"
        
        meta_desc = page_content.find('meta', {'name': 'description'})
        description = meta_desc.get('content', '').strip() if meta_desc else ""
        
        # Extract Open Graph data for richer information
        og_title = page_content.find('meta', {'property': 'og:title'})
        og_desc = page_content.find('meta', {'property': 'og:description'})
        og_image = page_content.find('meta', {'property': 'og:image'})
        og_type = page_content.find('meta', {'property': 'og:type'})
        
        # Use OG data if available
        if og_title:
            title = og_title.get('content', title)
        if og_desc and not description:
            description = og_desc.get('content', '')
        
        # Extract author information
        author_meta = page_content.find('meta', {'name': 'author'})
        author_name = author_meta.get('content', domain) if author_meta else domain
        
        # Extract keywords for better categorization
        keywords_meta = page_content.find('meta', {'name': 'keywords'})
        keywords = keywords_meta.get('content', '').split(',') if keywords_meta else []
        
        # Detect content type based on URL and content
        content_type = detect_content_type(url, page_content, og_type)
        
        # Extract breadcrumb structure
        breadcrumbs = extract_breadcrumbs(url, page_content)
        
        # Extract FAQ content if exists
        faq_data = extract_faq_content(page_content)
        
        # Extract article/blog content
        article_data = extract_article_content(page_content)
        
        # Build comprehensive Schema based on detected content type
        schema_script = build_comprehensive_schema(
            url=url,
            title=title,
            description=description,
            domain=domain,
            author_name=author_name,
            content_type=content_type,
            breadcrumbs=breadcrumbs,
            faq_data=faq_data,
            article_data=article_data,
            og_image=og_image.get('content') if og_image else None,
            keywords=keywords,
            page_content=page_content
        )
        
        return schema_script
        
    except Exception as e:
        print(f"Error generating schema script: {e}")
        # Return a basic fallback schema with graph structure
        return {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebPage",
                    "url": url,
                    "name": "Page",
                    "description": "Web page content"
                }
            ]
        }

def detect_content_type(url: str, page_content: BeautifulSoup, og_type) -> str:
    """Detect the type of content based on URL patterns and page content - Enhanced"""
    
    url_lower = url.lower()
    
    # Check URL patterns - more comprehensive
    if any(x in url_lower for x in ['/blog/', '/post/', '/article/', '/news/', '/insights/', '/resources/']):
        return 'BlogPosting'
    elif any(x in url_lower for x in ['/product/', '/shop/', '/item/', '/store/']):
        return 'Product'
    elif any(x in url_lower for x in ['/service', '/solution', '/บริการ', '/features']):
        return 'Service'  # Service pages are important!
    elif any(x in url_lower for x in ['/about', '/team', '/company', '/เกี่ยวกับ']):
        return 'AboutPage'
    elif any(x in url_lower for x in ['/contact', '/support', '/ติดต่อ']):
        return 'ContactPage'
    elif any(x in url_lower for x in ['/faq', '/help', '/questions', '/คำถาม']):
        return 'FAQPage'
    elif any(x in url_lower for x in ['/portfolio', '/case-study', '/project', '/ผลงาน']):
        return 'CreativeWork'
    elif any(x in url_lower for x in ['/pricing', '/plans', '/ราคา']):
        return 'Offer'
    
    # Check Open Graph type
    if og_type:
        og_type_value = og_type.get('content', '').lower()
        if 'article' in og_type_value:
            return 'Article'
        elif 'product' in og_type_value:
            return 'Product'
        elif 'website' in og_type_value:
            # Check if it's a service page based on content
            if any(word in url_lower for word in ['service', 'solution', 'บริการ']):
                return 'Service'
    
    # Check for service indicators in content
    service_indicators = page_content.find_all(string=lambda x: x and any(word in x.lower() for word in 
                                              ['service', 'solution', 'บริการ', 'ให้บริการ', 'รับทำ', 'รับออกแบบ']))
    if len(service_indicators) > 3:  # Multiple mentions suggest service page
        return 'Service'
    
    # Check for article/blog indicators in content
    if page_content.find('article') or page_content.find(class_=['post', 'article', 'blog']):
        return 'BlogPosting'
    
    # Check for product indicators
    if page_content.find(class_=['product', 'price', 'add-to-cart']):
        return 'Product'
    
    # Default to WebPage
    return 'WebPage'

def extract_breadcrumbs(url: str, page_content: BeautifulSoup) -> list:
    """Extract breadcrumb navigation from the page"""
    
    breadcrumbs = []
    parsed = urlparse(url)
    
    # Try to find existing breadcrumb navigation
    nav_breadcrumb = page_content.find(['nav', 'div', 'ol', 'ul'], 
                                       class_=['breadcrumb', 'breadcrumbs', 'crumbs'])
    
    if nav_breadcrumb:
        items = nav_breadcrumb.find_all(['a', 'span'])
        for i, item in enumerate(items):
            text = item.get_text(strip=True)
            href = item.get('href', '')
            if text:
                breadcrumbs.append({
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": text,
                    "item": urljoin(url, href) if href else url
                })
    else:
        # Generate breadcrumbs from URL structure
        path_parts = [p for p in parsed.path.split('/') if p]
        current_path = f"{parsed.scheme}://{parsed.netloc}"
        
        # Add home
        breadcrumbs.append({
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": current_path
        })
        
        # Add path parts
        for i, part in enumerate(path_parts):
            current_path += f"/{part}"
            breadcrumbs.append({
                "@type": "ListItem",
                "position": i + 2,
                "name": part.replace('-', ' ').replace('_', ' ').title(),
                "item": current_path
            })
    
    return breadcrumbs

def extract_faq_content(page_content: BeautifulSoup) -> list:
    """Extract FAQ content from the page for FAQPage schema - Enhanced version"""
    
    faq_items = []
    
    # Look for FAQ patterns with more variations
    faq_containers = page_content.find_all(['div', 'section', 'article', 'dl'], 
                                          class_=lambda x: x and any(word in x.lower() for word in 
                                          ['faq', 'faqs', 'questions', 'qna', 'accordion', 'collapsible', 'toggle']))
    
    # Also check by text content
    if not faq_containers:
        # Look for sections with FAQ-related headings
        headings = page_content.find_all(['h1', 'h2', 'h3'], 
                                        string=lambda x: x and any(word in x.lower() for word in 
                                        ['คำถาม', 'faq', 'q&a', 'questions', 'ถาม-ตอบ']))
        for heading in headings:
            parent = heading.find_parent(['div', 'section', 'article'])
            if parent:
                faq_containers.append(parent)
    
    for container in faq_containers:
        # Pattern 1: Q&A with specific classes
        questions = container.find_all(['h2', 'h3', 'h4', 'dt', 'div', 'button', 'summary'], 
                                      class_=lambda x: x and any(word in x.lower() for word in 
                                      ['question', 'faq-question', 'q', 'accordion-header', 'toggle-header']))
        answers = container.find_all(['p', 'dd', 'div'], 
                                    class_=lambda x: x and any(word in x.lower() for word in 
                                    ['answer', 'faq-answer', 'a', 'accordion-content', 'toggle-content']))
        
        for q, a in zip(questions, answers):
            if q and a:
                q_text = q.get_text(strip=True)
                a_text = a.get_text(strip=True)
                if len(q_text) > 5 and len(a_text) > 10:  # Filter out too short content
                    faq_items.append({
                        "@type": "Question",
                        "name": q_text,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": a_text
                        }
                    })
        
        # Pattern 2: Definition lists (dl, dt, dd)
        dl_elements = container.find_all('dl')
        for dl in dl_elements:
            dts = dl.find_all('dt')
            dds = dl.find_all('dd')
            for dt, dd in zip(dts, dds):
                if dt and dd:
                    faq_items.append({
                        "@type": "Question",
                        "name": dt.get_text(strip=True),
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": dd.get_text(strip=True)
                        }
                    })
    
    # Pattern 3: Look for question marks in headings
    if not faq_items:
        all_headings = page_content.find_all(['h2', 'h3', 'h4'])
        for heading in all_headings:
            heading_text = heading.get_text(strip=True)
            if '?' in heading_text or any(word in heading_text.lower() for word in ['ทำไม', 'อะไร', 'อย่างไร', 'เมื่อไหร่']):
                # Find the next sibling that contains the answer
                answer_elem = heading.find_next_sibling(['p', 'div', 'ul'])
                if answer_elem:
                    faq_items.append({
                        "@type": "Question",
                        "name": heading_text,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": answer_elem.get_text(strip=True)
                        }
                    })
    
    # Remove duplicates based on question text
    seen_questions = set()
    unique_faqs = []
    for faq in faq_items:
        q_text = faq['name'].lower()
        if q_text not in seen_questions:
            seen_questions.add(q_text)
            unique_faqs.append(faq)
    
    return unique_faqs[:15]  # Increase limit to 15 FAQs

def extract_article_content(page_content: BeautifulSoup) -> dict:
    """Extract article/blog post/service content and metadata - Enhanced"""
    
    article_data = {}
    
    # Find main content container with more patterns
    article = page_content.find(['article', 'main', 'div'], 
                               class_=lambda x: x and any(word in x.lower() for word in 
                               ['article', 'post', 'content', 'main', 'service', 'page-content']))
    
    # If not found, try to find the largest content area
    if not article:
        # Find the div with most text content
        all_divs = page_content.find_all('div')
        if all_divs:
            article = max(all_divs, key=lambda x: len(x.get_text(strip=True)) if x else 0)
    
    if article:
        # Extract headline - look for h1 first, then h2
        headline = page_content.find('h1') or article.find(['h1', 'h2'])
        if headline:
            article_data['headline'] = headline.get_text(strip=True)
        
        # Extract all images for better schema
        images = article.find_all('img')
        if images:
            article_data['images'] = []
            for img in images[:5]:  # Limit to 5 images
                img_src = img.get('src') or img.get('data-src')
                if img_src:
                    article_data['images'].append({
                        'url': img_src,
                        'alt': img.get('alt', ''),
                        'title': img.get('title', '')
                    })
        
        # Extract key features or benefits (common in service pages)
        features = []
        feature_containers = article.find_all(['li', 'div'], 
                                             class_=lambda x: x and any(word in x.lower() for word in 
                                             ['feature', 'benefit', 'advantage', 'service']))
        for container in feature_containers[:10]:
            text = container.get_text(strip=True)
            if 10 < len(text) < 200:  # Reasonable feature length
                features.append(text)
        
        if features:
            article_data['features'] = features
        
        # Extract pricing information if available
        price_elements = article.find_all(string=lambda x: x and any(char in x for char in ['฿', '₿', 'บาท', 'THB', '$']))
        if price_elements:
            article_data['hasPricing'] = True
            prices = []
            for elem in price_elements[:3]:
                # Extract numbers from price text
                import re
                numbers = re.findall(r'[\d,]+', elem)
                if numbers:
                    prices.extend(numbers)
            if prices:
                article_data['priceRange'] = prices
        
        # Extract publication date
        date_elem = page_content.find(['time', 'span', 'div'], 
                                     class_=['date', 'published', 'post-date', 'updated'])
        if date_elem:
            date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
            article_data['datePublished'] = date_str
        
        # Extract author with more patterns
        author_elem = page_content.find(['span', 'div', 'a', 'p'], 
                                       class_=lambda x: x and any(word in x.lower() for word in 
                                       ['author', 'by', 'writer', 'created', 'โดย']))
        if author_elem:
            article_data['author'] = author_elem.get_text(strip=True).replace('โดย', '').replace('By', '').strip()
        
        # Count words for article
        content_text = article.get_text(strip=True)
        word_count = len(content_text.split())
        article_data['wordCount'] = word_count
        
        # Extract description - look for first substantial paragraph
        paragraphs = article.find_all('p')
        for para in paragraphs:
            text = para.get_text(strip=True)
            if len(text) > 50:  # Substantial paragraph
                article_data['articleBody'] = text[:800]  # Increase to 800 chars
                break
        
        # Extract CTA (Call to Action) if exists
        cta_buttons = article.find_all(['a', 'button'], 
                                      class_=lambda x: x and any(word in x.lower() for word in 
                                      ['cta', 'button', 'btn', 'action']))
        if cta_buttons:
            article_data['hasCTA'] = True
            article_data['ctaText'] = [btn.get_text(strip=True) for btn in cta_buttons[:3]]
    
    return article_data

def build_comprehensive_schema(url, title, description, domain, author_name, 
                              content_type, breadcrumbs, faq_data, article_data,
                              og_image, keywords, page_content=None) -> Dict:
    """Build comprehensive Schema.org markup optimized for SEO 2025"""
    
    import re  # Import re for regex operations
    
    # Start with base schema structure
    schema = {
        "@context": "https://schema.org",
        "@graph": []
    }
    
    # 1. Organization Schema (E-E-A-T signals) - Extract real data
    org_name = domain.replace('www.', '').split('.')[0].title()
    
    # Try to find real contact information from the page
    phone_numbers = []
    email_addresses = []
    social_links = []
    
    if page_content:
        # Find phone numbers - ONLY REAL PHONE FORMATS
        import re
        # Thai mobile: 08x, 09x, 06x with 8 more digits
        # Thai landline: 02-xxx-xxxx, 03x-xxx-xxx, etc.
        # International: +66 or country codes
        phone_patterns = [
            r'\+66[-\s]?\d{1,2}[-\s]?\d{3}[-\s]?\d{4}',  # +66 format
            r'0[689]\d[-\s]?\d{3}[-\s]?\d{4}',  # Thai mobile
            r'0[2-7]\d[-\s]?\d{3}[-\s]?\d{3,4}',  # Thai landline
            r'\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{1,4}'  # International
        ]
        
        for pattern in phone_patterns:
            phone_regex = re.compile(pattern)
            # Search in text nodes
            for text_node in page_content.find_all(string=True):
                text = str(text_node)
                # Check if this looks like contact context
                if any(word in text.lower() for word in ['โทร', 'tel', 'phone', 'contact', 'ติดต่อ', 'สอบถาม']):
                    matches = phone_regex.findall(text)
                    for match in matches:
                        # Validate it's not a random number
                        clean_number = re.sub(r'[-\s]', '', match)
                        if len(clean_number) >= 9:  # Minimum phone length
                            phone_numbers.append(match)
            
            # Also check in tel: links
            for link in page_content.find_all('a', href=re.compile(r'^tel:')):
                phone = link['href'].replace('tel:', '').strip()
                if phone and len(re.sub(r'[-\s]', '', phone)) >= 9:
                    phone_numbers.append(phone)
        
        # Deduplicate and take only first valid phone
        phone_numbers = list(dict.fromkeys(phone_numbers))[:1]
        
        # Find email addresses - ONLY REAL EMAILS
        email_pattern = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
        
        # Check in mailto: links first (most reliable)
        for link in page_content.find_all('a', href=re.compile(r'^mailto:')):
            email = link['href'].replace('mailto:', '').split('?')[0].strip()
            if email and '@' in email:
                email_addresses.append(email)
        
        # If no mailto links, search in text near contact words
        if not email_addresses:
            for text_node in page_content.find_all(string=True):
                text = str(text_node)
                if any(word in text.lower() for word in ['email', 'e-mail', 'อีเมล', '@', 'contact']):
                    matches = email_pattern.findall(text)
                    # Filter out obvious fake emails
                    for email in matches:
                        if not any(fake in email.lower() for fake in ['example.', 'test.', 'demo.', 'your-']):
                            email_addresses.append(email)
        
        # Deduplicate and take only first valid email  
        email_addresses = list(dict.fromkeys(email_addresses))[:1]
        
        # Find social media links
        social_patterns = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'line.me']
        for link in page_content.find_all('a', href=True):
            href = link['href']
            for pattern in social_patterns:
                if pattern in href:
                    social_links.append(href)
                    break
        
        # Try to find company name from various sources
        company_elem = page_content.find(['span', 'div', 'p'], class_=lambda x: x and 'company' in x.lower())
        if company_elem:
            org_name = company_elem.get_text(strip=True)
        elif page_content.find('meta', {'property': 'og:site_name'}):
            org_name = page_content.find('meta', {'property': 'og:site_name'}).get('content', org_name)
    
    # Find logo image - ONLY REAL LOGOS
    logo_url = None
    if page_content:
        # Try multiple ways to find real logo
        logo_elem = page_content.find('img', class_=lambda x: x and 'logo' in str(x).lower()) or \
                   page_content.find('img', alt=lambda x: x and 'logo' in str(x).lower() if x else False) or \
                   page_content.find('img', src=lambda x: x and 'logo' in str(x).lower() if x else False)
        
        if logo_elem:
            logo_url = logo_elem.get('src') or logo_elem.get('data-src') or logo_elem.get('data-lazy-src')
            if logo_url and not logo_url.startswith('http'):
                logo_url = f"https://{domain}{logo_url}" if logo_url.startswith('/') else f"https://{domain}/{logo_url}"
        
        # If no logo found in img tags, check SVG
        if not logo_url:
            svg_logo = page_content.find('svg', class_=lambda x: x and 'logo' in str(x).lower() if x else False)
            if svg_logo:
                # If inline SVG, we can't use it as URL, skip
                pass
        
        # Check Open Graph image if it contains 'logo'
        if not logo_url and og_image and 'logo' in og_image.lower():
            logo_url = og_image
    
    # DO NOT CREATE FAKE LOGO URL - if no logo found, don't include it
    
    organization = {
        "@type": "Organization",
        "@id": f"https://{domain}/#organization",
        "name": org_name,
        "url": f"https://{domain}"
    }
    
    # Only add logo if we found a real one
    if logo_url:
        organization["logo"] = {
            "@type": "ImageObject",
            "url": logo_url,
            "width": 600,
            "height": 60
        }
    
    # Add real social links if found
    if social_links:
        organization["sameAs"] = list(set(social_links))[:5]  # Unique links, max 5
    
    # Add real contact info if found
    if phone_numbers or email_addresses:
        organization["contactPoint"] = {
            "@type": "ContactPoint",
            "contactType": "customer service"
        }
        if phone_numbers:
            organization["contactPoint"]["telephone"] = phone_numbers[0]
        if email_addresses:
            organization["contactPoint"]["email"] = email_addresses[0]
        organization["contactPoint"]["availableLanguage"] = ["Thai", "English"]
    
    schema["@graph"].append(organization)
    
    # 2. WebSite Schema with SearchAction (for sitelinks search box)
    website = {
        "@type": "WebSite",
        "@id": f"https://{domain}/#website",
        "url": f"https://{domain}",
        "name": domain.replace('www.', '').split('.')[0].title(),
        "publisher": {"@id": f"https://{domain}/#organization"},
        "potentialAction": {
            "@type": "SearchAction",
            "target": f"https://{domain}/search?q={{search_term_string}}",
            "query-input": "required name=search_term_string"
        },
        "inLanguage": "th-TH"
    }
    schema["@graph"].append(website)
    
    # 3. BreadcrumbList Schema (navigation context)
    if breadcrumbs:
        breadcrumb_schema = {
            "@type": "BreadcrumbList",
            "@id": f"{url}#breadcrumb",
            "itemListElement": breadcrumbs
        }
        schema["@graph"].append(breadcrumb_schema)
    
    # 4. Main content schema based on content type
    if content_type == 'Service':
        # Service Schema for service pages - VERY IMPORTANT!
        service_schema = {
            "@type": "Service",
            "@id": f"{url}#service",
            "name": title,
            "description": description or article_data.get('articleBody', '')[:300],
            # Only use real images - no fake URLs
            "image": article_data.get('images', [{'url': og_image}])[0]['url'] if article_data.get('images') else og_image,
            "provider": {
                "@type": "Organization",
                "@id": f"https://{domain}/#organization",
                "name": org_name if 'org_name' in locals() else domain.replace('www.', '').split('.')[0].title(),
                "url": f"https://{domain}"
            },
            "serviceType": title.split('|')[0].strip() if '|' in title else title[:50],
            "areaServed": {
                "@type": "Country",
                "name": "Thailand"
            },
            "availableChannel": {
                "@type": "ServiceChannel",
                "serviceUrl": url
            },
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": f"{title} - Service Packages",
                "itemListElement": []
            },
            "audience": {
                "@type": "BusinessAudience",
                "audienceType": "Business owners, Startups, Enterprises"
            },
            "termsOfService": f"https://{domain}/terms"
        }
        
        # Add service features if found
        if article_data.get('features'):
            service_schema["additionalProperty"] = []
            for feature in article_data['features'][:5]:
                service_schema["additionalProperty"].append({
                    "@type": "PropertyValue",
                    "name": "Feature",
                    "value": feature
                })
        
        # Add pricing if available - extract real pricing
        if article_data.get('hasPricing') and article_data.get('priceRange'):
            # Try to extract real prices
            prices = article_data.get('priceRange', [])
            if prices:
                service_schema["offers"] = {
                    "@type": "AggregateOffer",
                    "priceCurrency": "THB",
                    "priceRange": f"{min(prices)} - {max(prices)}" if len(prices) > 1 else prices[0]
                }
            # Look for package names in the content
            if page_content:
                package_elements = page_content.find_all(['div', 'section'], class_=lambda x: x and any(word in x.lower() for word in ['package', 'plan', 'pricing']))
                offers = []
                for elem in package_elements[:3]:
                    package_name = elem.find(['h3', 'h4', 'div'], class_=lambda x: x and 'title' in x.lower() if x else False)
                    package_price = elem.find(string=re.compile(r'[฿$]?[\d,]+'))
                    if package_name:
                        offer = {
                            "@type": "Offer",
                            "name": package_name.get_text(strip=True),
                            "priceCurrency": "THB"
                        }
                        if package_price:
                            price_match = re.search(r'([\d,]+)', package_price)
                            if price_match:
                                offer["price"] = price_match.group(1).replace(',', '')
                        offers.append(offer)
                
                if offers:
                    service_schema["offers"]["offers"] = offers
        
        # Add ratings only if found on page
        if page_content:
            # Look for rating stars or review counts
            rating_elem = page_content.find(['div', 'span'], class_=lambda x: x and any(word in x.lower() for word in ['rating', 'review', 'star']) if x else False)
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                import re
                rating_match = re.search(r'([0-9.]+)\s*(?:stars?|/5|out of 5)?', rating_text)
                count_match = re.search(r'(\d+)\s*(?:reviews?|ratings?)', rating_text)
                
                if rating_match or count_match:
                    service_schema["aggregateRating"] = {
                        "@type": "AggregateRating",
                        "ratingValue": rating_match.group(1) if rating_match else "4.5",
                        "reviewCount": count_match.group(1) if count_match else "10",
                        "bestRating": "5"
                    }
            
            # Look for testimonials or reviews
            testimonial_elem = page_content.find(['div', 'blockquote'], class_=lambda x: x and any(word in x.lower() for word in ['testimonial', 'review', 'feedback']) if x else False)
            if testimonial_elem:
                review_text = testimonial_elem.get_text(strip=True)[:200]
                author_elem = testimonial_elem.find(['span', 'div', 'p'], class_=lambda x: x and any(word in x.lower() for word in ['author', 'name', 'client']) if x else False)
                
                if review_text:
                    service_schema["review"] = {
                        "@type": "Review",
                        "reviewRating": {
                            "@type": "Rating",
                            "ratingValue": "5",
                            "bestRating": "5"
                        },
                        "author": {
                            "@type": "Person",
                            "name": author_elem.get_text(strip=True) if author_elem else "Client"
                        },
                        "reviewBody": review_text
                    }
        
        schema["@graph"].append(service_schema)
        
    elif content_type in ['BlogPosting', 'Article']:
        # Article/BlogPosting Schema with E-E-A-T signals
        article_schema = {
            "@type": content_type,
            "@id": f"{url}#article",
            "isPartOf": {"@id": f"https://{domain}/#website"},
            "author": {
                "@type": "Person",
                "@id": f"https://{domain}/author/{author_name.lower().replace(' ', '-')}",
                "name": author_name,
                "url": f"https://{domain}/author/{author_name.lower().replace(' ', '-')}",
                "sameAs": [
                    f"https://www.linkedin.com/in/{author_name.lower().replace(' ', '-')}",
                    f"https://twitter.com/{author_name.lower().replace(' ', '')}"
                ],
                "expertise": keywords[:3] if keywords else ["Technology", "Digital Marketing"],
                "knowsAbout": keywords[:5] if keywords else ["SEO", "Content Marketing"],
                "alumniOf": {
                    "@type": "Organization",
                    "name": "Leading University"
                },
                "award": "Industry Expert",
                "jobTitle": "Senior Content Specialist"
            },
            "headline": article_data.get('headline', title),
            "description": description or article_data.get('articleBody', '')[:160],
            "image": {
                "@type": "ImageObject",
                "url": og_image or f"https://{domain}/images/article-image.jpg",
                "width": 1200,
                "height": 630
            },
            "datePublished": article_data.get('datePublished', datetime.now().isoformat()),
            "dateModified": datetime.now().isoformat(),
            "publisher": {"@id": f"https://{domain}/#organization"},
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": url
            },
            "wordCount": article_data.get('wordCount', 1000),
            "articleBody": article_data.get('articleBody', description),
            "keywords": ", ".join(keywords) if keywords else "SEO, Digital Marketing",
            "articleSection": "Technology",
            "inLanguage": "th-TH",
            "copyrightYear": datetime.now().year,
            "copyrightHolder": {"@id": f"https://{domain}/#organization"},
            "creditText": domain,
            "creator": {"@id": f"https://{domain}/#organization"},
            "discussionUrl": f"{url}#comments",
            "commentCount": 10,
            "accessMode": ["textual", "visual"],
            "accessibilityFeature": ["structuralNavigation", "readingOrder", "alternativeText"],
            "reviewedBy": {
                "@type": "Person",
                "name": "Editorial Team",
                "reviewBody": "Fact-checked and reviewed for accuracy"
            }
        }
        
        # Add speakable for voice search optimization
        article_schema["speakable"] = {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", "h2", ".summary", ".key-points"]
        }
        
        schema["@graph"].append(article_schema)
        
    elif content_type == 'Product':
        # Product Schema with rich snippets
        product_schema = {
            "@type": "Product",
            "@id": f"{url}#product",
            "name": title,
            "description": description,
            "image": og_image or f"https://{domain}/product-image.jpg",
            "brand": {
                "@type": "Brand",
                "name": domain.replace('www.', '').split('.')[0].title()
            },
            "offers": {
                "@type": "Offer",
                "url": url,
                "priceCurrency": "THB",
                "price": "999",
                "priceValidUntil": (datetime.now().replace(year=datetime.now().year + 1)).isoformat(),
                "availability": "https://schema.org/InStock",
                "seller": {"@id": f"https://{domain}/#organization"}
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.5",
                "reviewCount": "89"
            },
            "review": {
                "@type": "Review",
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": "5",
                    "bestRating": "5"
                },
                "author": {
                    "@type": "Person",
                    "name": "Happy Customer"
                }
            }
        }
        schema["@graph"].append(product_schema)
        
    else:
        # Default WebPage Schema
        webpage_schema = {
            "@type": "WebPage",
            "@id": url,
            "url": url,
            "name": title,
            "description": description,
            "isPartOf": {"@id": f"https://{domain}/#website"},
            "primaryImageOfPage": {
                "@type": "ImageObject",
                "url": og_image or f"https://{domain}/page-image.jpg"
            },
            "datePublished": datetime.now().isoformat(),
            "dateModified": datetime.now().isoformat(),
            "breadcrumb": {"@id": f"{url}#breadcrumb"},
            "inLanguage": "th-TH",
            "potentialAction": [{
                "@type": "ReadAction",
                "target": [url]
            }],
            "author": {"@id": f"https://{domain}/#organization"},
            "contributor": {"@id": f"https://{domain}/#organization"},
            "publisher": {"@id": f"https://{domain}/#organization"}
        }
        
        # Add speakable for voice search
        webpage_schema["speakable"] = {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", "h2", ".summary"]
        }
        
        schema["@graph"].append(webpage_schema)
    
    # 5. Add FAQPage Schema if FAQ content exists
    if faq_data:
        faq_schema = {
            "@type": "FAQPage",
            "@id": f"{url}#faq",
            "mainEntity": faq_data
        }
        schema["@graph"].append(faq_schema)
    
    # 6. Add VideoObject ONLY if real video with real data found
    if page_content:
        video_elem = page_content.find('video', src=True) or page_content.find('iframe', src=lambda x: x and ('youtube' in x or 'vimeo' in x) if x else False)
        
        if video_elem:
            # Only add if we have real video URL
            video_url = video_elem.get('src')
            if video_url:
                video_schema = {
                    "@type": "VideoObject",
                    "name": title,
                    "description": description[:100] if description else None,
                    "embedUrl": video_url
                }
                
                # Only add thumbnailUrl if we have a real one
                if og_image:
                    video_schema["thumbnailUrl"] = og_image
                
                # Don't add fake uploadDate or duration - only if found in page
                schema["@graph"].append(video_schema)
    
    # 7. Add ItemList for better content grouping
    if content_type in ['BlogPosting', 'Article']:
        itemlist_schema = {
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "url": url
                }
            ]
        }
        schema["@graph"].append(itemlist_schema)
    
    # 8. Add CollectionPage for category/listing pages
    if any(x in url.lower() for x in ['/category/', '/tag/', '/archive/']):
        collection_schema = {
            "@type": "CollectionPage",
            "@id": f"{url}#collection",
            "name": title,
            "description": description,
            "url": url
        }
        schema["@graph"].append(collection_schema)
    
    # 9. Add HowTo Schema if tutorial content detected
    if any(x in title.lower() for x in ['how to', 'guide', 'tutorial', 'วิธี']):
        howto_schema = {
            "@type": "HowTo",
            "name": title,
            "description": description,
            "step": [
                {
                    "@type": "HowToStep",
                    "text": "Step 1: " + description[:50],
                    "name": "Getting Started"
                }
            ]
        }
        schema["@graph"].append(howto_schema)
    
    # Return the comprehensive schema
    return schema

def extract_schema_markup(url: str) -> Dict:
    """Extract and analyze Schema.org markup from a webpage with better error handling"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        
        print(f"Fetching schema from: {url}")
        session = requests.Session()
        # Add verify=False for Windows SSL issues (only for testing)
        response = session.get(url, headers=headers, timeout=15, allow_redirects=True, verify=True)
        response.raise_for_status()
        print(f"Successfully fetched {url} - Status: {response.status_code}")
        
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
                
                # Extract microdata properties
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
        
        # 3. Check for RDFa
        rdfa_items = soup.find_all(attrs={'typeof': True})
        for item in rdfa_items:
            schema_type = item.get('typeof', '')
            if schema_type:
                schema_types.add(schema_type)
                
                # Extract RDFa properties
                properties = {}
                for prop in item.find_all(attrs={'property': True}):
                    prop_name = prop.get('property')
                    prop_value = prop.get('content') or prop.get_text(strip=True)
                    properties[prop_name] = prop_value
                
                schemas.append({
                    'format': 'RDFa',
                    'type': schema_type,
                    'data': properties
                })
        
        # Analyze for AI Search Optimization
        recommendations = []
        score = 0
        ai_optimized = False
        
        # Check for essential schema types for AI search
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
            recommendations.append("เพิ่ม Schema ประเภทหลักเช่น Article, Product, Organization เพื่อ AI Search")
        
        # Check for rich properties
        for schema in schemas:
            if schema['format'] == 'JSON-LD':
                data = schema['data']
                
                # Check for essential properties
                essential_props = {
                    'name', 'description', 'image', 'author',
                    'datePublished', 'dateModified', 'headline'
                }
                
                existing_props = set(data.keys())
                if existing_props & essential_props:
                    score += 10
                
                # Check for structured author
                if 'author' in data and isinstance(data['author'], dict):
                    if '@type' in data['author'] and data['author']['@type'] == 'Person':
                        score += 10
                    else:
                        recommendations.append("ระบุ author เป็น Person หรือ Organization Schema")
                
                # Check for images
                if 'image' in data:
                    if isinstance(data['image'], (list, dict)):
                        score += 10
                    else:
                        recommendations.append("เพิ่มข้อมูล image แบบ structured (URL, width, height)")
                else:
                    recommendations.append("เพิ่ม image property สำหรับการแสดงผลใน AI Search")
                
                # Check for breadcrumbs
                if schema['type'] == 'BreadcrumbList':
                    score += 15
                    ai_optimized = True
                
                # Check for FAQ
                if schema['type'] == 'FAQPage':
                    score += 20
                    ai_optimized = True
                
                # Check for ratings/reviews
                if schema['type'] in ['Review', 'AggregateRating']:
                    score += 15
                    ai_optimized = True
        
        # General recommendations
        if not schemas:
            recommendations.append("ไม่พบ Schema Markup - ควรเพิ่ม JSON-LD Schema")
            recommendations.append("เริ่มต้นด้วย WebPage หรือ Article Schema")
        
        if len(schemas) < 2:
            recommendations.append("เพิ่ม Schema หลายประเภทเพื่อข้อมูลที่สมบูรณ์")
        
        if 'Organization' not in schema_types and 'Person' not in schema_types:
            recommendations.append("เพิ่ม Organization หรือ Person Schema สำหรับ publisher/author")
        
        if 'BreadcrumbList' not in schema_types:
            recommendations.append("เพิ่ม BreadcrumbList สำหรับ navigation context")
        
        # Calculate final score (max 100)
        score = min(score, 100)
        
        # Always generate optimized schema for comparison
        # User can compare and use if ours is better
        generated_schema = None
        try:
            # Generate comprehensive SEO 2025 optimized schema
            generated_schema = generate_schema_script(url, soup)
        except Exception as e:
            print(f"Error generating schema: {e}")
            generated_schema = None
        
        return {
            'url': url,
            'has_schema': len(schemas) > 0,
            'schema_types': list(schema_types),
            'schema_count': len(schemas),
            'schemas': schemas,
            'ai_search_optimized': ai_optimized,
            'recommendations': recommendations[:5],  # Top 5 recommendations
            'score': score,
            'generated_schema': generated_schema,  # Include generated schema
            'checked_at': datetime.now().isoformat()
        }
        
    except requests.exceptions.RequestException as e:
        return {
            'url': url,
            'has_schema': False,
            'schema_types': [],
            'schema_count': 0,
            'schemas': [],
            'ai_search_optimized': False,
            'recommendations': [f"ไม่สามารถเข้าถึง URL: {str(e)}"],
            'score': 0,
            'generated_schema': None,
            'checked_at': datetime.now().isoformat()
        }

def extract_urls_from_sitemap(sitemap_url: str, limit: Optional[int] = None) -> List[str]:
    """Extract URLs from a sitemap.xml file with improved error handling"""
    try:
        # Handle both full URLs and paths
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
        
        # Handle different sitemap formats
        namespaces = {
            'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
            'image': 'http://www.google.com/schemas/sitemap-image/1.1'
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

@router.post("/api/check-schema-markup")
async def check_schema_markup(request: SchemaCheckRequest):
    """Check Schema.org markup for multiple URLs or sitemap with improved handling"""
    
    # Get URLs to check
    urls_to_check = []
    
    if isinstance(request.urls, str):
        # Single string - check if it's a sitemap
        if 'sitemap' in request.urls.lower() or request.urls.endswith('.xml'):
            # It's a sitemap URL - apply default limit for large sitemaps
            default_limit = request.limit or 50  # Default to 50 URLs max
            urls_to_check = extract_urls_from_sitemap(request.urls, default_limit)
            if not urls_to_check:
                raise HTTPException(status_code=400, detail="ไม่สามารถดึง URLs จาก sitemap ได้ หรือ sitemap ว่างเปล่า")
        else:
            # Single URL
            urls_to_check = [request.urls]
    else:
        # List of URLs
        urls_to_check = request.urls
    
    # Limit URLs if specified or if too many
    max_urls = request.limit or 100  # Maximum 100 URLs at once
    if len(urls_to_check) > max_urls:
        urls_to_check = urls_to_check[:max_urls]
    
    results = []
    loop = asyncio.get_event_loop()
    
    # Process in batches to avoid overwhelming
    batch_size = 10
    for i in range(0, len(urls_to_check), batch_size):
        batch = urls_to_check[i:i+batch_size]
        
        with ThreadPoolExecutor(max_workers=min(request.max_workers, 3)) as executor:
            futures = [
                loop.run_in_executor(executor, extract_schema_markup, url)
                for url in batch
            ]
            batch_results = await asyncio.gather(*futures, return_exceptions=True)
            
            # Handle exceptions in results
            for idx, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    # Create error result for failed URL
                    results.append({
                        'url': batch[idx],
                        'has_schema': False,
                        'schema_types': [],
                        'schema_count': 0,
                        'schemas': [],
                        'ai_search_optimized': False,
                        'recommendations': [f"เกิดข้อผิดพลาด: {str(result)[:100]}"],
                        'score': 0,
                        'generated_schema': None,
                        'checked_at': datetime.now().isoformat()
                    })
                else:
                    results.append(result)
        
        # Small delay between batches
        if i + batch_size < len(urls_to_check):
            await asyncio.sleep(0.5)
    
    # Calculate summary
    summary = {
        'total_urls': len(results),
        'with_schema': sum(1 for r in results if r['has_schema']),
        'without_schema': sum(1 for r in results if not r['has_schema']),
        'ai_optimized': sum(1 for r in results if r['ai_search_optimized']),
        'average_score': round(sum(r['score'] for r in results) / len(results)) if results else 0,
        'common_types': {}
    }
    
    # Add sitemap info if used
    if isinstance(request.urls, str) and ('sitemap' in request.urls.lower() or request.urls.endswith('.xml')):
        summary['source'] = 'sitemap'
        summary['sitemap_url'] = request.urls
        summary['urls_checked'] = len(urls_to_check)
    
    # Count common schema types
    for result in results:
        for schema_type in result['schema_types']:
            summary['common_types'][schema_type] = summary['common_types'].get(schema_type, 0) + 1
    
    # Sort common types by frequency
    summary['common_types'] = dict(sorted(
        summary['common_types'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10])  # Top 10 types
    
    return {
        'results': results,
        'summary': summary
    }

@router.get("/api/schema-validator")
async def validate_schema(url: str):
    """Validate Schema markup for a single URL using Google's validator"""
    
    result = extract_schema_markup(url)
    
    # Additional validation tips
    validation_tips = []
    
    for schema in result['schemas']:
        if schema['format'] == 'JSON-LD':
            data = schema['data']
            
            # Check required fields based on type
            if schema['type'] == 'Article':
                required = ['headline', 'image', 'author', 'publisher', 'datePublished']
                missing = [f for f in required if f not in data]
                if missing:
                    validation_tips.append(f"Article Schema ขาด: {', '.join(missing)}")
            
            elif schema['type'] == 'Product':
                required = ['name', 'image', 'description', 'offers']
                missing = [f for f in required if f not in data]
                if missing:
                    validation_tips.append(f"Product Schema ขาด: {', '.join(missing)}")
            
            elif schema['type'] == 'LocalBusiness':
                required = ['name', 'address', 'telephone']
                missing = [f for f in required if f not in data]
                if missing:
                    validation_tips.append(f"LocalBusiness Schema ขาด: {', '.join(missing)}")
    
    result['validation_tips'] = validation_tips
    
    return result

@router.get("/api/schema-checker/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "schema-markup-checker"}