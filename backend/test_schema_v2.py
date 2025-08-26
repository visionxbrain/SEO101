#!/usr/bin/env python3
"""
Test Schema Generator V2 with example input/output
"""

import requests
import json

def test_service_page():
    """Test with Service page example from spec"""
    
    test_data = {
        "brand_profile": {
            "base_url": "https://www.wowwam-gemstones.com",
            "brand_name": "Wowwam Gemstones",
            "logo_url": "https://www.wowwam-gemstones.com/logo.png",
            "sameas": ["https://www.facebook.com/wowwamgemstones"],
            "languages": ["th", "en"],
            "phone_e164": "+66812345678"
        },
        "page_spec": {
            "page_url": "https://www.wowwam-gemstones.com/services/seo",
            "page_name": "บริการ SEO สำหรับอัญมณี",
            "breadcrumb_items": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://www.wowwam-gemstones.com/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "บริการ SEO",
                    "item": "https://www.wowwam-gemstones.com/services/seo"
                }
            ],
            "page_type": "service",
            "service": {
                "name": "ให้คำปรึกษา SEO สำหรับร้านอัญมณี",
                "desc_short": "วาง Technical SEO + AEO ให้ติดอันดับ",
                "type": "SEO Consulting",
                "image": "https://www.wowwam-gemstones.com/og/seo-service.jpg",
                "country": "Thailand"
            },
            "lang": "th-TH",
            "dateModified": "2025-08-25"
        }
    }
    
    print("=" * 70)
    print("🚀 Testing Schema Generator V2 - Service Page")
    print("=" * 70)
    
    response = requests.post(
        "http://localhost:8000/api/generate-schema-v2",
        json=test_data,
        timeout=10
    )
    
    if response.status_code == 200:
        result = response.json()
        
        print("\n📊 Results:")
        print(f"  Score: {result['score']}/100")
        print(f"  Warnings: {len(result['warnings'])}")
        print(f"  Errors: {len(result['errors'])}")
        
        if result['warnings']:
            print("\n⚠️ Warnings:")
            for warning in result['warnings']:
                print(f"  - {warning}")
        
        if result['errors']:
            print("\n❌ Errors:")
            for error in result['errors']:
                print(f"  - {error}")
        
        print("\n📝 Generated JSON-LD:")
        print("-" * 70)
        print(result['jsonld'])
        
        # Parse and validate structure
        if '<script' in result['jsonld']:
            json_str = result['jsonld'].replace('<script type="application/ld+json">', '').replace('</script>', '').strip()
            try:
                parsed = json.loads(json_str)
                print("\n✅ JSON-LD is valid!")
                print(f"  @graph contains {len(parsed.get('@graph', []))} nodes:")
                for node in parsed.get('@graph', []):
                    print(f"    - {node.get('@type')} ({node.get('@id', 'no-id')})")
            except:
                print("\n❌ JSON-LD is invalid!")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

def test_product_page():
    """Test with Product page"""
    
    test_data = {
        "brand_profile": {
            "base_url": "https://www.example-shop.com",
            "brand_name": "Example Shop",
            "logo_url": "https://www.example-shop.com/logo.png",
            "sameas": [],
            "languages": ["th"],
            "phone_e164": "+66823456789"
        },
        "page_spec": {
            "page_url": "https://www.example-shop.com/products/blue-sapphire",
            "page_name": "พลอยไพลินสีน้ำเงิน 2.5 กะรัต",
            "breadcrumb_items": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "หน้าแรก",
                    "item": "https://www.example-shop.com/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "สินค้า",
                    "item": "https://www.example-shop.com/products"
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "พลอยไพลิน",
                    "item": "https://www.example-shop.com/products/blue-sapphire"
                }
            ],
            "page_type": "product",
            "product": {
                "name": "พลอยไพลินสีน้ำเงิน Ceylon",
                "desc_short": "พลอยไพลินธรรมชาติจากศรีลังกา น้ำหนัก 2.5 กะรัต",
                "sku": "BS-2025-001",
                "images": [
                    "https://www.example-shop.com/images/sapphire-1.jpg",
                    "https://www.example-shop.com/images/sapphire-2.jpg"
                ],
                "price": 85000.00,
                "currency": "THB",
                "availability": "InStock"
            },
            "lang": "th-TH",
            "dateModified": "2025-08-25T10:00:00+07:00"
        }
    }
    
    print("\n" + "=" * 70)
    print("🛍️ Testing Schema Generator V2 - Product Page")
    print("=" * 70)
    
    response = requests.post(
        "http://localhost:8000/api/generate-schema-v2",
        json=test_data,
        timeout=10
    )
    
    if response.status_code == 200:
        result = response.json()
        
        print("\n📊 Results:")
        print(f"  Score: {result['score']}/100")
        print(f"  Warnings: {len(result['warnings'])}")
        print(f"  Errors: {len(result['errors'])}")
        
        # Check for Product and Offer
        if '<script' in result['jsonld']:
            json_str = result['jsonld'].replace('<script type="application/ld+json">', '').replace('</script>', '').strip()
            parsed = json.loads(json_str)
            
            has_product = False
            has_offer = False
            
            for node in parsed.get('@graph', []):
                if node.get('@type') == 'Product':
                    has_product = True
                    if node.get('offers'):
                        has_offer = True
            
            print(f"\n✅ Has Product: {has_product}")
            print(f"✅ Has Offer: {has_offer}")

def test_faq_page():
    """Test with FAQ page"""
    
    test_data = {
        "brand_profile": {
            "base_url": "https://www.example.com",
            "brand_name": "Example Site",
            "logo_url": "https://www.example.com/logo.png",
            "sameas": [],
            "languages": ["th"]
        },
        "page_spec": {
            "page_url": "https://www.example.com/faq",
            "page_name": "คำถามที่พบบ่อย",
            "breadcrumb_items": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "หน้าแรก",
                    "item": "https://www.example.com/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "FAQ",
                    "item": "https://www.example.com/faq"
                }
            ],
            "page_type": "faq",
            "faq": [
                {
                    "question": "ส่งสินค้าภายในกี่วัน?",
                    "answer": "ส่งภายใน 1-3 วันทำการหลังชำระเงิน"
                },
                {
                    "question": "มีการรับประกันสินค้าหรือไม่?",
                    "answer": "รับประกันสินค้า 1 ปีสำหรับความเสียหายจากการผลิต"
                },
                {
                    "question": "สามารถคืนสินค้าได้หรือไม่?",
                    "answer": "คืนได้ภายใน 7 วันหากสินค้ายังไม่แกะซีล"
                },
                {
                    "question": "มีส่วนลดสำหรับสมาชิกหรือไม่?",
                    "answer": "สมาชิกได้รับส่วนลด 10% ทุกรายการ"
                }
            ],
            "lang": "th-TH"
        }
    }
    
    print("\n" + "=" * 70)
    print("❓ Testing Schema Generator V2 - FAQ Page")
    print("=" * 70)
    
    response = requests.post(
        "http://localhost:8000/api/generate-schema-v2",
        json=test_data,
        timeout=10
    )
    
    if response.status_code == 200:
        result = response.json()
        
        print("\n📊 Results:")
        print(f"  Score: {result['score']}/100")
        print(f"  Warnings: {len(result['warnings'])}")
        print(f"  Errors: {len(result['errors'])}")
        
        if result['warnings']:
            print("\n⚠️ Warnings:")
            for warning in result['warnings']:
                print(f"  - {warning}")

def test_invalid_cases():
    """Test error handling"""
    
    print("\n" + "=" * 70)
    print("🔍 Testing Error Handling")
    print("=" * 70)
    
    # Test 1: XML/Sitemap page
    test_data = {
        "brand_profile": {
            "base_url": "https://www.example.com",
            "brand_name": "Test",
            "logo_url": "https://www.example.com/logo.png",
            "sameas": [],
            "languages": ["en"]
        },
        "page_spec": {
            "page_url": "https://www.example.com/sitemap.xml",
            "page_name": "Sitemap",
            "breadcrumb_items": [],
            "page_type": "generic"
        }
    }
    
    print("\n1. Testing XML/Sitemap rejection:")
    response = requests.post(
        "http://localhost:8000/api/generate-schema-v2",
        json=test_data
    )
    
    if response.status_code == 400:
        print("  ✅ Correctly rejected XML page")
    else:
        print("  ❌ Should have rejected XML page")
    
    # Test 2: Invalid phone format
    test_data['page_spec']['page_url'] = "https://www.example.com/test"
    test_data['brand_profile']['phone_e164'] = "081-234-5678"  # Not E.164
    
    print("\n2. Testing invalid phone format:")
    response = requests.post(
        "http://localhost:8000/api/generate-schema-v2",
        json=test_data
    )
    
    if response.status_code == 200:
        result = response.json()
        if any("E.164" in w for w in result.get('warnings', [])):
            print("  ✅ Correctly warned about phone format")
    
    # Test 3: Product without price
    test_data = {
        "brand_profile": {
            "base_url": "https://www.example.com",
            "brand_name": "Test",
            "logo_url": "https://www.example.com/logo.png",
            "sameas": [],
            "languages": ["en"]
        },
        "page_spec": {
            "page_url": "https://www.example.com/product",
            "page_name": "Product",
            "breadcrumb_items": [],
            "page_type": "product"
            # Missing product data!
        }
    }
    
    print("\n3. Testing Product without data:")
    response = requests.post(
        "http://localhost:8000/api/generate-schema-v2",
        json=test_data
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('errors'):
            print("  ✅ Correctly reported missing product data")

if __name__ == "__main__":
    import time
    
    # Wait for server to be ready
    time.sleep(2)
    
    # Run all tests
    test_service_page()
    test_product_page()
    test_faq_page()
    test_invalid_cases()
    
    print("\n" + "=" * 70)
    print("✅ All tests completed!")
    print("=" * 70)