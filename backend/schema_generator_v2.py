"""
Schema Markup Generator V2 - Production Ready
Based on comprehensive specification with @graph structure
"""

from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field, validator
from datetime import datetime
import json
import re
from urllib.parse import urlparse
from enum import Enum

# ============================================
# 1) CONSTANTS & ENUMS
# ============================================

class PageType(str, Enum):
    HOME = "home"
    SERVICE = "service"
    PRODUCT = "product"
    CATEGORY = "category"
    ARTICLE = "article"
    FAQ = "faq"
    LOCAL = "local"
    CONTACT = "contact"
    GENERIC = "generic"

class AvailabilityType(str, Enum):
    IN_STOCK = "InStock"
    OUT_OF_STOCK = "OutOfStock"
    PRE_ORDER = "PreOrder"
    LIMITED = "LimitedAvailability"

# ============================================
# 2) INPUT MODELS
# ============================================

class Address(BaseModel):
    street: Optional[str] = None
    locality: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "TH"

class GeoCoordinates(BaseModel):
    latitude: float
    longitude: float

class OpeningHours(BaseModel):
    dayOfWeek: List[str]
    opens: str  # "09:00"
    closes: str  # "18:00"

class BrandProfile(BaseModel):
    base_url: str
    brand_name: str
    logo_url: str
    sameas: List[str] = []
    languages: List[str] = ["th", "en"]
    phone_e164: Optional[str] = None
    # Optional Local Business fields
    address: Optional[Address] = None
    geo: Optional[GeoCoordinates] = None
    opening_hours: Optional[List[OpeningHours]] = None
    cover_image: Optional[str] = None

class BreadcrumbItem(BaseModel):
    type: str = Field(default="ListItem", alias="@type")
    position: int
    name: str
    item: str

class ServiceSpec(BaseModel):
    name: str
    desc_short: str
    type: str
    image: str
    country: str = "Thailand"

class ProductSpec(BaseModel):
    name: str
    desc_short: str
    sku: str
    images: List[str]
    price: float
    currency: str = "THB"
    availability: AvailabilityType
    brand_name: Optional[str] = None

class FAQItem(BaseModel):
    question: str
    answer: str

class ArticleSpec(BaseModel):
    headline: str
    description: str
    author_name: str
    date_published: str
    image: Optional[str] = None

class PageSpec(BaseModel):
    page_url: str
    page_name: str
    breadcrumb_items: List[BreadcrumbItem]
    page_type: PageType
    # Type-specific fields
    service: Optional[ServiceSpec] = None
    product: Optional[ProductSpec] = None
    faq: Optional[List[FAQItem]] = None
    article: Optional[ArticleSpec] = None
    # Common fields
    lang: str = "th-TH"
    dateModified: str = Field(default_factory=lambda: datetime.now().isoformat())

# ============================================
# 3) VALIDATORS & HELPERS
# ============================================

def is_valid_url(url: str) -> bool:
    """Validate URL format"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def is_e164_phone(phone: str) -> bool:
    """Check if phone is in E.164 format"""
    if not phone:
        return False
    pattern = r'^\+[1-9]\d{1,14}$'
    return bool(re.match(pattern, phone))

def is_valid_image_url(url: str) -> bool:
    """Check if image URL is valid and not SVG"""
    if not url:
        return False
    return is_valid_url(url) and not url.lower().endswith('.svg')

def make_ids(base_url: str, page_url: str, page_type: str) -> Dict[str, str]:
    """Generate all required @id values"""
    ids = {
        'org_id': f"{base_url}/#organization",
        'site_id': f"{base_url}/#website",
        'page_id': f"{page_url}#webpage",
        'breadcrumb_id': f"{page_url}#breadcrumb"
    }
    
    # Add type-specific IDs
    if page_type == PageType.SERVICE:
        ids['service_id'] = f"{page_url}#service"
    elif page_type == PageType.PRODUCT:
        ids['product_id'] = f"{page_url}#product"
    elif page_type == PageType.FAQ:
        ids['faq_id'] = f"{page_url}#faq"
    elif page_type == PageType.LOCAL:
        ids['local_id'] = f"{page_url}#local"
    elif page_type == PageType.ARTICLE:
        ids['article_id'] = f"{page_url}#article"
    
    return ids

# ============================================
# 4) CORE BUILDERS
# ============================================

def build_organization_node(brand: BrandProfile, org_id: str) -> Dict:
    """Build Organization node"""
    node = {
        "@type": "Organization",
        "@id": org_id,
        "name": brand.brand_name,
        "url": f"{brand.base_url}/",
        "logo": {
            "@type": "ImageObject",
            "url": brand.logo_url,
            "width": 600,
            "height": 60
        }
    }
    
    if brand.sameas:
        node["sameAs"] = brand.sameas
    
    # Contact Point
    contact_point = {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": brand.languages
    }
    
    if brand.phone_e164 and is_e164_phone(brand.phone_e164):
        contact_point["telephone"] = brand.phone_e164
    
    node["contactPoint"] = [contact_point]
    
    return node

def build_website_node(brand: BrandProfile, site_id: str, org_id: str) -> Dict:
    """Build WebSite node with SearchAction"""
    return {
        "@type": "WebSite",
        "@id": site_id,
        "url": f"{brand.base_url}/",
        "name": brand.brand_name,
        "publisher": {"@id": org_id},
        "inLanguage": brand.languages[0] if brand.languages else "th",
        "potentialAction": {
            "@type": "SearchAction",
            "target": f"{brand.base_url}/search?q={{search_term_string}}",
            "query-input": "required name=search_term_string"
        }
    }

def build_webpage_node(page: PageSpec, page_id: str, site_id: str, org_id: str, breadcrumb_id: str) -> Dict:
    """Build WebPage node"""
    return {
        "@type": "WebPage",
        "@id": page_id,
        "url": page.page_url,
        "name": page.page_name,
        "isPartOf": {"@id": site_id},
        "about": {"@id": org_id},
        "breadcrumb": {"@id": breadcrumb_id},
        "inLanguage": page.lang,
        "dateModified": page.dateModified
    }

def build_breadcrumb_node(items: List[BreadcrumbItem], breadcrumb_id: str) -> Dict:
    """Build BreadcrumbList node"""
    list_items = []
    for item in items:
        list_items.append({
            "@type": "ListItem",
            "position": item.position,
            "name": item.name,
            "item": item.item
        })
    
    return {
        "@type": "BreadcrumbList",
        "@id": breadcrumb_id,
        "itemListElement": list_items
    }

def build_service_node(page: PageSpec, service_id: str, org_id: str) -> Dict:
    """Build Service node"""
    if not page.service:
        return {}
    
    return {
        "@type": "Service",
        "@id": service_id,
        "name": page.service.name,
        "description": page.service.desc_short,
        "serviceType": page.service.type,
        "provider": {
            "@type": "Organization",
            "@id": org_id
        },
        "areaServed": {
            "@type": "Country",
            "name": page.service.country
        },
        "availableChannel": {
            "@type": "ServiceChannel",
            "serviceUrl": page.page_url
        },
        "image": {
            "@type": "ImageObject",
            "url": page.service.image,
            "width": 1200,
            "height": 630
        },
        "inLanguage": page.lang
    }

def build_product_node(page: PageSpec, product_id: str, brand: BrandProfile) -> Dict:
    """Build Product node with Offer"""
    if not page.product:
        return {}
    
    return {
        "@type": "Product",
        "@id": product_id,
        "name": page.product.name,
        "description": page.product.desc_short,
        "image": page.product.images,
        "sku": page.product.sku,
        "brand": {
            "@type": "Brand",
            "name": page.product.brand_name or brand.brand_name
        },
        "offers": {
            "@type": "Offer",
            "url": page.page_url,
            "priceCurrency": page.product.currency,
            "price": str(page.product.price),
            "availability": f"https://schema.org/{page.product.availability}",
            "itemCondition": "https://schema.org/NewCondition"
        },
        "inLanguage": page.lang
    }

def build_faq_node(faq_items: List[FAQItem], faq_id: str, lang: str) -> Dict:
    """Build FAQPage node"""
    main_entity = []
    for item in faq_items:
        main_entity.append({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
            }
        })
    
    return {
        "@type": "FAQPage",
        "@id": faq_id,
        "inLanguage": lang,
        "mainEntity": main_entity
    }

def build_local_business_node(brand: BrandProfile, local_id: str) -> Dict:
    """Build LocalBusiness node"""
    node = {
        "@type": "LocalBusiness",
        "@id": local_id,
        "name": brand.brand_name,
        "url": f"{brand.base_url}/"
    }
    
    if brand.cover_image:
        node["image"] = brand.cover_image
    
    if brand.phone_e164 and is_e164_phone(brand.phone_e164):
        node["telephone"] = brand.phone_e164
    
    if brand.address:
        node["address"] = {
            "@type": "PostalAddress",
            "streetAddress": brand.address.street,
            "addressLocality": brand.address.locality,
            "addressRegion": brand.address.region,
            "postalCode": brand.address.postal_code,
            "addressCountry": brand.address.country
        }
    
    if brand.geo:
        node["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": brand.geo.latitude,
            "longitude": brand.geo.longitude
        }
    
    if brand.opening_hours:
        hours_spec = []
        for hours in brand.opening_hours:
            hours_spec.append({
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": hours.dayOfWeek,
                "opens": hours.opens,
                "closes": hours.closes
            })
        node["openingHoursSpecification"] = hours_spec
    
    if brand.sameas:
        node["sameAs"] = brand.sameas
    
    return node

def build_article_node(page: PageSpec, article_id: str, org_id: str) -> Dict:
    """Build Article/BlogPosting node"""
    if not page.article:
        return {}
    
    node = {
        "@type": "Article",
        "@id": article_id,
        "headline": page.article.headline,
        "description": page.article.description,
        "author": {
            "@type": "Person",
            "name": page.article.author_name
        },
        "publisher": {"@id": org_id},
        "datePublished": page.article.date_published,
        "dateModified": page.dateModified,
        "inLanguage": page.lang
    }
    
    if page.article.image:
        node["image"] = page.article.image
    
    return node

# ============================================
# 5) VALIDATION & LINTING
# ============================================

def strip_forbidden_props(graph: List[Dict]) -> List[Dict]:
    """Remove forbidden properties"""
    forbidden = ["speakable", "SpeakableSpecification", "hasOfferCatalog"]
    
    for node in graph:
        # Remove speakable
        if "speakable" in node:
            del node["speakable"]
        
        # Remove self-serving reviews on Service
        if node.get("@type") == "Service" and "review" in node:
            del node["review"]
        
        # Remove empty properties
        keys_to_remove = []
        for key, value in node.items():
            if value in [[], {}, "", None]:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del node[key]
    
    return graph

def dedupe_by_id(graph: List[Dict]) -> List[Dict]:
    """Remove duplicate nodes by @id"""
    seen_ids = set()
    deduped = []
    
    for node in graph:
        node_id = node.get("@id")
        if node_id and node_id not in seen_ids:
            seen_ids.add(node_id)
            deduped.append(node)
        elif not node_id:
            deduped.append(node)
    
    return deduped

def lint_graph(graph: List[Dict], page: PageSpec, brand: BrandProfile) -> Dict:
    """Lint the graph for errors and warnings"""
    warnings = []
    errors = []
    fatal = False
    
    # Check for XML/sitemap pages
    if page.page_url.endswith('.xml') or 'sitemap' in page.page_url.lower():
        errors.append("Do not schema-markup XML/sitemap pages")
        fatal = True
    
    # Check telephone format
    if brand.phone_e164 and not is_e164_phone(brand.phone_e164):
        warnings.append("Telephone not in E.164 format - will be dropped")
    
    # Check duplicate IDs
    ids = [node.get("@id") for node in graph if node.get("@id")]
    if len(ids) != len(set(ids)):
        errors.append("Duplicate @id found")
        fatal = True
    
    # Check required base nodes
    types = [node.get("@type") for node in graph]
    required_types = ["Organization", "WebSite", "WebPage", "BreadcrumbList"]
    for req_type in required_types:
        if req_type not in types:
            errors.append(f"Missing required {req_type} node")
            fatal = True
    
    # Check Service/Product images
    for node in graph:
        if node.get("@type") in ["Service", "Product"]:
            image = node.get("image")
            if image:
                if isinstance(image, dict):
                    img_url = image.get("url", "")
                else:
                    img_url = image[0] if isinstance(image, list) else image
                
                if img_url and img_url.lower().endswith('.svg'):
                    warnings.append(f"{node.get('@type')} uses SVG image - use 1200x630 raster image")
    
    # Check Product has Offer
    for node in graph:
        if node.get("@type") == "Product":
            if not node.get("offers"):
                errors.append("Product missing Offer")
                fatal = True
            else:
                offer = node["offers"]
                if not offer.get("price"):
                    errors.append("Offer missing price")
                    fatal = True
                if not offer.get("priceCurrency"):
                    errors.append("Offer missing priceCurrency")
                    fatal = True
                if not offer.get("availability"):
                    errors.append("Offer missing availability")
                    fatal = True
    
    # Check FAQ quality
    for node in graph:
        if node.get("@type") == "FAQPage":
            faqs = node.get("mainEntity", [])
            if len(faqs) < 3:
                warnings.append("FAQ should have at least 3 questions")
            if len(faqs) > 8:
                warnings.append("FAQ should not exceed 8 questions")
            
            for faq in faqs:
                question = faq.get("name", "")
                answer = faq.get("acceptedAnswer", {}).get("text", "")
                
                if len(question) > 160:
                    warnings.append(f"FAQ question too long ({len(question)} chars): {question[:50]}...")
                if len(answer) > 300:
                    warnings.append(f"FAQ answer too long ({len(answer)} chars)")
    
    return {
        "warnings": warnings,
        "errors": errors,
        "fatal": fatal
    }

# ============================================
# 6) SCORING
# ============================================

def score_graph(graph: List[Dict], page_type: PageType) -> int:
    """Calculate schema quality score"""
    score = 0
    
    # Correctness (25 points)
    try:
        json.dumps(graph)  # Check JSON serializable
        score += 15
    except:
        pass
    
    # No duplicate IDs
    ids = [node.get("@id") for node in graph if node.get("@id")]
    if len(ids) == len(set(ids)):
        score += 10
    
    # Relevance (20 points)
    types = [node.get("@type") for node in graph]
    if "Organization" in types and "WebSite" in types:
        score += 10
    if "WebPage" in types and "BreadcrumbList" in types:
        score += 10
    
    # Completeness (15 points)
    # Check if page-type specific nodes are present
    if page_type == PageType.SERVICE and "Service" in types:
        score += 15
    elif page_type == PageType.PRODUCT and "Product" in types:
        score += 15
    elif page_type == PageType.FAQ and "FAQPage" in types:
        score += 15
    elif page_type == PageType.LOCAL and "LocalBusiness" in types:
        score += 15
    elif page_type == PageType.ARTICLE and "Article" in types:
        score += 15
    elif page_type in [PageType.HOME, PageType.GENERIC, PageType.CONTACT]:
        score += 15  # Base nodes are sufficient
    
    # Consistency (15 points)
    # Check brand name consistency
    brand_names = []
    for node in graph:
        if "name" in node and node.get("@type") in ["Organization", "WebSite"]:
            brand_names.append(node["name"])
    
    if brand_names and len(set(brand_names)) == 1:
        score += 8
    
    # Check language consistency
    langs = [node.get("inLanguage") for node in graph if "inLanguage" in node]
    if langs and len(set(langs)) == 1:
        score += 7
    
    # Image & Media (10 points)
    for node in graph:
        if node.get("@type") in ["Service", "Product"]:
            if node.get("image"):
                score += 10
                break
    
    # FAQ Quality (10 points)
    for node in graph:
        if node.get("@type") == "FAQPage":
            faqs = node.get("mainEntity", [])
            if 3 <= len(faqs) <= 8:
                score += 5
            # Check question length
            all_good = all(len(faq.get("name", "")) <= 160 for faq in faqs)
            if all_good:
                score += 5
    
    # Cleanliness (5 points)
    # No empty fields
    has_empty = False
    for node in graph:
        for value in node.values():
            if value in [[], {}, "", None]:
                has_empty = True
                break
    
    if not has_empty:
        score += 5
    
    return min(score, 100)

# ============================================
# 7) MAIN BUILDER
# ============================================

def build_schema(brand_profile: BrandProfile, page_spec: PageSpec) -> Tuple[str, int, List[str], List[str]]:
    """
    Main schema builder function
    Returns: (jsonld, score, warnings, errors)
    """
    warnings = []
    errors = []
    
    # A. Preflight Validation
    if not is_valid_url(brand_profile.base_url) or not is_valid_url(page_spec.page_url):
        errors.append("Invalid URL")
        return "", 0, warnings, errors
    
    if page_spec.page_url.endswith('.xml'):
        errors.append("Do not schema-markup XML pages")
        return "", 0, warnings, errors
    
    if brand_profile.phone_e164 and not is_e164_phone(brand_profile.phone_e164):
        warnings.append("Telephone not E.164 format - will be dropped")
        brand_profile.phone_e164 = None
    
    # B. Generate IDs
    ids = make_ids(brand_profile.base_url, page_spec.page_url, page_spec.page_type)
    
    # C. Build Base Graph
    graph = []
    
    # Organization
    org_node = build_organization_node(brand_profile, ids['org_id'])
    if org_node:
        graph.append(org_node)
    
    # WebSite
    site_node = build_website_node(brand_profile, ids['site_id'], ids['org_id'])
    if site_node:
        graph.append(site_node)
    
    # WebPage
    page_node = build_webpage_node(page_spec, ids['page_id'], ids['site_id'], 
                                   ids['org_id'], ids['breadcrumb_id'])
    if page_node:
        graph.append(page_node)
    
    # BreadcrumbList
    breadcrumb_node = build_breadcrumb_node(page_spec.breadcrumb_items, ids['breadcrumb_id'])
    if breadcrumb_node:
        graph.append(breadcrumb_node)
    
    # D. Page-type specific nodes
    if page_spec.page_type == PageType.SERVICE:
        if page_spec.service:
            if not is_valid_image_url(page_spec.service.image):
                warnings.append("Service image invalid or SVG - use 1200x630 raster image")
            service_node = build_service_node(page_spec, ids.get('service_id', ''), ids['org_id'])
            if service_node:
                graph.append(service_node)
    
    elif page_spec.page_type == PageType.PRODUCT:
        if page_spec.product:
            product_node = build_product_node(page_spec, ids.get('product_id', ''), brand_profile)
            if product_node:
                graph.append(product_node)
        else:
            errors.append("Product page requires product data")
    
    elif page_spec.page_type == PageType.FAQ:
        if page_spec.faq:
            # Validate FAQ
            if len(page_spec.faq) < 3:
                warnings.append("FAQ should have at least 3 questions")
            elif len(page_spec.faq) > 8:
                warnings.append("FAQ should not exceed 8 questions")
            
            for item in page_spec.faq:
                if len(item.question) > 160:
                    warnings.append(f"FAQ question too long: {item.question[:50]}...")
                if len(item.answer) > 300:
                    warnings.append(f"FAQ answer too long")
            
            faq_node = build_faq_node(page_spec.faq, ids.get('faq_id', ''), page_spec.lang)
            if faq_node:
                graph.append(faq_node)
        else:
            errors.append("FAQ page requires FAQ data")
    
    elif page_spec.page_type == PageType.LOCAL:
        if not (brand_profile.address and brand_profile.geo):
            warnings.append("Local page should have address and geo coordinates")
        local_node = build_local_business_node(brand_profile, ids.get('local_id', ''))
        if local_node:
            graph.append(local_node)
    
    elif page_spec.page_type == PageType.ARTICLE:
        if page_spec.article:
            article_node = build_article_node(page_spec, ids.get('article_id', ''), ids['org_id'])
            if article_node:
                graph.append(article_node)
        else:
            errors.append("Article page requires article data")
    
    # E. Safety filters
    graph = strip_forbidden_props(graph)
    graph = dedupe_by_id(graph)
    
    # F. Lint
    lint_result = lint_graph(graph, page_spec, brand_profile)
    warnings.extend(lint_result['warnings'])
    errors.extend(lint_result['errors'])
    
    if lint_result['fatal']:
        return "", 0, warnings, errors
    
    # G. Score
    score = score_graph(graph, page_spec.page_type)
    
    # H. Render JSON-LD
    json_ld = {
        "@context": "https://schema.org",
        "@graph": graph
    }
    
    # Wrap in script tag
    json_str = json.dumps(json_ld, ensure_ascii=False, indent=2)
    jsonld_output = f'<script type="application/ld+json">\n{json_str}\n</script>'
    
    return jsonld_output, score, warnings, errors

# ============================================
# 8) API ENDPOINT
# ============================================

from fastapi import APIRouter, HTTPException

router = APIRouter()

class SchemaGenerateRequest(BaseModel):
    brand_profile: BrandProfile
    page_spec: PageSpec

class SchemaGenerateResponse(BaseModel):
    jsonld: str
    score: int
    warnings: List[str]
    errors: List[str]

@router.post("/api/generate-schema-v2")
async def generate_schema_v2(request: SchemaGenerateRequest):
    """Generate structured data markup with @graph"""
    try:
        jsonld, score, warnings, errors = build_schema(
            request.brand_profile,
            request.page_spec
        )
        
        if errors and not jsonld:
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        return SchemaGenerateResponse(
            jsonld=jsonld,
            score=score,
            warnings=warnings,
            errors=errors
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))