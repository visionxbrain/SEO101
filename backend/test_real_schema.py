#!/usr/bin/env python3
"""Test Schema generation with a real website"""

import requests
import json

def test_real_website():
    """Test with a real website URL"""
    
    print("Testing Schema Generation with Real Website")
    print("=" * 60)
    
    # Test with a real website
    test_url = "https://www.google.com"
    
    print(f"Testing: {test_url}")
    
    response = requests.post(
        "http://localhost:8000/api/check-schema-markup",
        json={"urls": [test_url], "max_workers": 1},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        result = data['results'][0]
        
        print(f"\n✅ Has existing schema: {result['has_schema']}")
        print(f"📊 Score: {result['score']}/100")
        print(f"🤖 AI Optimized: {result['ai_search_optimized']}")
        
        if result.get('generated_schema'):
            print("\n🚀 Generated SEO 2025 Optimized Schema:")
            print("-" * 40)
            
            schema = result['generated_schema']
            
            # Check structure
            if '@graph' in schema:
                print(f"✓ Graph-based structure with {len(schema['@graph'])} nodes")
                
                # List all schema types
                for node in schema['@graph']:
                    if '@type' in node:
                        print(f"  • {node['@type']} Schema")
                        
                        # Show key features
                        if node['@type'] == 'Organization':
                            print("    - E-E-A-T publisher signals")
                            print("    - Contact information")
                            print("    - Social media links")
                        elif node['@type'] == 'WebSite':
                            print("    - SearchAction for sitelinks")
                            print("    - Language specification")
                        elif node['@type'] == 'BreadcrumbList':
                            print("    - Navigation hierarchy")
                        elif node['@type'] in ['Article', 'BlogPosting']:
                            print("    - Author expertise signals")
                            print("    - Speakable for voice search")
                            print("    - Accessibility features")
            
            print("\n📝 Schema Script (first 500 chars):")
            script = json.dumps(schema, indent=2)[:500]
            print(script)
            
            print(f"\n📏 Total schema size: {len(json.dumps(schema))} characters")
            
    else:
        print(f"Error: {response.status_code}")

if __name__ == "__main__":
    test_real_website()