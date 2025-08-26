#!/usr/bin/env python3
"""
Test Thai encoding in Schema Generator
"""
import json
from schema_generator_v2 import build_schema, BrandProfile, PageSpec, BreadcrumbItem, ServiceSpec, PageType

# Test data with Thai text
brand_profile = BrandProfile(
    base_url="https://example.co.th",
    brand_name="บริษัท ทดสอบ จำกัด",
    logo_url="https://example.co.th/logo.png",
    sameas=["https://facebook.com/example"],
    languages=["th", "en"],
    phone_e164="+66812345678"
)

page_spec = PageSpec(
    page_url="https://example.co.th/services/web-design",
    page_name="รับออกแบบเว็บไซต์ WordPress และ Webflow",
    breadcrumb_items=[
        BreadcrumbItem(position=1, name="หน้าแรก", item="https://example.co.th"),
        BreadcrumbItem(position=2, name="บริการ", item="https://example.co.th/services"),
        BreadcrumbItem(position=3, name="ออกแบบเว็บไซต์", item="https://example.co.th/services/web-design")
    ],
    page_type=PageType.SERVICE,
    service=ServiceSpec(
        name="บริการออกแบบเว็บไซต์",
        desc_short="รับออกแบบเว็บไซต์ WordPress และ Webflow แบบมืออาชีพ รองรับ SEO พร้อมระบบจัดการเนื้อหา",
        type="Web Design Service",
        image="https://example.co.th/images/web-design.jpg",
        country="ประเทศไทย"
    ),
    lang="th-TH"
)

# Generate schema
jsonld, score, warnings, errors = build_schema(brand_profile, page_spec)

print("=" * 70)
print("THAI ENCODING TEST RESULTS")
print("=" * 70)
print(f"\nScore: {score}/100")
print(f"Warnings: {warnings}")
print(f"Errors: {errors}")

# Check if Thai text is properly encoded
if "บริษัท ทดสอบ จำกัด" in jsonld:
    print("\n✅ Thai text is properly displayed in output!")
else:
    print("\n❌ Thai text is not properly displayed!")
    
# Show sample output
print("\n" + "=" * 70)
print("SAMPLE OUTPUT (first 1500 characters):")
print("=" * 70)
print(jsonld[:1500])

# Also test direct JSON encoding
test_data = {
    "name": "ทดสอบภาษาไทย",
    "description": "รับออกแบบเว็บไซต์ WordPress และ Webflow"
}

print("\n" + "=" * 70)
print("DIRECT JSON ENCODING TEST:")
print("=" * 70)
print("With ensure_ascii=False:")
print(json.dumps(test_data, ensure_ascii=False, indent=2))
print("\nWithout ensure_ascii=False (default):")
print(json.dumps(test_data, indent=2))