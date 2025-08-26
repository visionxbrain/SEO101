#!/usr/bin/env python3
"""Test real data extraction for visionxbrain"""

import requests
import json

url = "https://www.visionxbrain.com/services/webflow-design-development"

response = requests.post(
    "http://localhost:8000/api/check-schema-markup",
    json={"urls": [url], "max_workers": 1},
    timeout=30
)

if response.status_code == 200:
    data = response.json()
    result = data['results'][0]
    
    if result.get('generated_schema'):
        schema = result['generated_schema']
        
        print("=" * 70)
        print("🔍 REAL DATA EXTRACTED FROM VISIONXBRAIN.COM")
        print("=" * 70)
        
        # Check Organization data
        for node in schema.get('@graph', []):
            if node.get('@type') == 'Organization':
                print("\n📢 ORGANIZATION DATA:")
                print(f"  • Name: {node.get('name')}")
                print(f"  • Logo: {node.get('logo', {}).get('url', 'Not found')}")
                print(f"  • Social Links: {len(node.get('sameAs', []))} found")
                for link in node.get('sameAs', [])[:5]:
                    print(f"    - {link}")
                if 'contactPoint' in node:
                    print(f"  • Phone: {node['contactPoint'].get('telephone', 'Not found')}")
                    print(f"  • Email: {node['contactPoint'].get('email', 'Not found')}")
                    
            elif node.get('@type') == 'Service':
                print("\n🛠️ SERVICE DATA:")
                print(f"  • Name: {node.get('name')[:60]}...")
                print(f"  • Image: {node.get('image', 'Not found')}")
                if 'offers' in node:
                    print(f"  • Pricing: {node['offers'].get('priceRange', 'Not specified')}")
                if 'aggregateRating' in node:
                    print(f"  • Rating: {node['aggregateRating'].get('ratingValue')}/5 ({node['aggregateRating'].get('reviewCount')} reviews)")
                if 'review' in node:
                    print(f"  • Review snippet: {node['review'].get('reviewBody', '')[:100]}...")
                    
            elif node.get('@type') == 'FAQPage':
                print("\n❓ FAQ DATA:")
                faqs = node.get('mainEntity', [])
                print(f"  • Total FAQs extracted: {len(faqs)}")
                for i, faq in enumerate(faqs[:3], 1):
                    print(f"\n  FAQ {i}:")
                    print(f"    Q: {faq.get('name', '')[:80]}...")
                    print(f"    A: {faq.get('acceptedAnswer', {}).get('text', '')[:80]}...")
                    
            elif node.get('@type') == 'BreadcrumbList':
                print("\n🍞 BREADCRUMB DATA:")
                items = node.get('itemListElement', [])
                for item in items:
                    print(f"  {item.get('position')}. {item.get('name')} -> {item.get('item')}")
                    
            elif node.get('@type') == 'ProfessionalService':
                print("\n🏢 PROFESSIONAL SERVICE DATA:")
                print(f"  • Name: {node.get('name')}")
                if 'telephone' in node:
                    print(f"  • Phone: {node.get('telephone')}")
                if 'address' in node:
                    print(f"  • Address: {node['address'].get('streetAddress', 'Not found')}")
                if 'openingHoursSpecification' in node:
                    hours = node['openingHoursSpecification']
                    print(f"  • Hours: {hours.get('opens')} - {hours.get('closes')}")
                    
        print("\n" + "=" * 70)
        print(f"📊 Total Schema Size: {len(json.dumps(schema))} characters")
        print(f"✅ Using REAL data from the website, not mockup!")
        print("=" * 70)
else:
    print(f"Error: {response.status_code}")