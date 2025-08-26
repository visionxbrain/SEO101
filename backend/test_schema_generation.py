#!/usr/bin/env python3
"""Test script to verify Schema generation with SEO 2025 optimization"""

import requests
import json
from datetime import datetime

def test_schema_generation():
    """Test the Schema Markup Checker with the new generation function"""
    
    print("=" * 60)
    print("Testing Schema Markup Generation - SEO 2025 Optimized")
    print("=" * 60)
    
    # Test URLs with different content types
    test_urls = [
        "https://example.com/blog/seo-tips-2025",  # Blog post
        "https://example.com/product/iphone-15",   # Product page
        "https://example.com/faq",                 # FAQ page
        "https://example.com",                     # Homepage
    ]
    
    for url in test_urls[:1]:  # Test first URL for now
        print(f"\n🔍 Testing URL: {url}")
        print("-" * 40)
        
        try:
            response = requests.post(
                "http://localhost:8000/api/check-schema-markup",
                json={"urls": [url], "max_workers": 1},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                result = data['results'][0] if data['results'] else None
                
                if result:
                    print(f"✅ Has existing schema: {result['has_schema']}")
                    print(f"📊 Score: {result['score']}/100")
                    print(f"🤖 AI Optimized: {result['ai_search_optimized']}")
                    
                    if result['schema_types']:
                        print(f"📝 Schema Types Found: {', '.join(result['schema_types'])}")
                    
                    if result['recommendations']:
                        print("\n📋 Recommendations:")
                        for rec in result['recommendations']:
                            print(f"  • {rec}")
                    
                    if result.get('generated_schema'):
                        print("\n🚀 Generated Schema (SEO 2025 Optimized):")
                        print("-" * 40)
                        
                        # Pretty print the generated schema
                        schema_json = json.dumps(result['generated_schema'], indent=2, ensure_ascii=False)
                        
                        # Show first 1000 characters
                        if len(schema_json) > 1000:
                            print(schema_json[:1000])
                            print(f"\n... (truncated, total {len(schema_json)} characters)")
                        else:
                            print(schema_json)
                        
                        # Analyze the generated schema
                        print("\n📈 Schema Analysis:")
                        schema = result['generated_schema']
                        
                        if '@graph' in schema:
                            print(f"  • Graph nodes: {len(schema['@graph'])}")
                            types = [node.get('@type') for node in schema['@graph'] if '@type' in node]
                            print(f"  • Schema types: {', '.join(types)}")
                        
                        print("\n✨ SEO 2025 Features:")
                        features = []
                        
                        # Check for E-E-A-T signals
                        schema_str = json.dumps(schema)
                        if 'expertise' in schema_str or 'knowsAbout' in schema_str:
                            features.append("E-E-A-T signals (expertise)")
                        if 'author' in schema_str and 'Person' in schema_str:
                            features.append("Author credibility")
                        if 'Organization' in schema_str:
                            features.append("Publisher trust signals")
                        if 'BreadcrumbList' in schema_str:
                            features.append("Navigation context")
                        if 'FAQPage' in schema_str:
                            features.append("FAQ for voice search")
                        if 'speakable' in schema_str:
                            features.append("Voice search optimization")
                        if 'SearchAction' in schema_str:
                            features.append("Sitelinks search box")
                        if 'reviewedBy' in schema_str:
                            features.append("Content review signals")
                        
                        for feature in features:
                            print(f"  ✓ {feature}")
                        
                        print(f"\n🎯 Total SEO 2025 features: {len(features)}/8")
                        
                    else:
                        print("\n⚠️ No schema generated")
                        
            else:
                print(f"❌ Error: Status {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ Error testing URL: {e}")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_schema_generation()