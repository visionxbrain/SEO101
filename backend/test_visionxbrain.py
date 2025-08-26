#!/usr/bin/env python3
"""Test Schema generation with visionxbrain.com"""

import requests
import json

def test_visionxbrain():
    """Test with visionxbrain service page"""
    
    print("🚀 Testing Enhanced Schema Generation for VisionXBrain")
    print("=" * 70)
    
    # Test with the exact URL you mentioned
    test_url = "https://www.visionxbrain.com/services/webflow-design-development"
    
    print(f"🔍 Testing: {test_url}")
    print("-" * 70)
    
    response = requests.post(
        "http://localhost:8000/api/check-schema-markup",
        json={"urls": [test_url], "max_workers": 1},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        result = data['results'][0]
        
        print(f"\n📊 Analysis Results:")
        print(f"  ✅ Has existing schema: {result['has_schema']}")
        print(f"  📈 Score: {result['score']}/100")
        print(f"  🤖 AI Optimized: {result['ai_search_optimized']}")
        
        if result['schema_types']:
            print(f"  📝 Current Schema Types: {', '.join(result['schema_types'])}")
        
        if result.get('generated_schema'):
            print("\n🎯 NEW SEO 2025 Optimized Schema Generated!")
            print("-" * 70)
            
            schema = result['generated_schema']
            
            # Check what's in the graph
            if '@graph' in schema:
                print(f"✨ Schema Graph contains {len(schema['@graph'])} nodes:")
                for i, node in enumerate(schema['@graph'], 1):
                    if '@type' in node:
                        node_type = node['@type']
                        print(f"\n  {i}. {node_type} Schema")
                        
                        # Show key properties based on type
                        if node_type == 'Service':
                            print("     ✓ Service-specific schema detected!")
                            if 'serviceType' in node:
                                print(f"     • Service Type: {node['serviceType'][:50]}")
                            if 'offers' in node:
                                print(f"     • Has Pricing Information: Yes")
                            if 'aggregateRating' in node:
                                print(f"     • Rating: {node['aggregateRating']['ratingValue']}/5")
                            if 'additionalProperty' in node:
                                print(f"     • Features: {len(node['additionalProperty'])} listed")
                                
                        elif node_type == 'FAQPage':
                            print("     ✓ FAQ Schema detected!")
                            if 'mainEntity' in node:
                                print(f"     • Questions: {len(node['mainEntity'])}")
                                # Show first 2 questions
                                for q in node['mainEntity'][:2]:
                                    print(f"       - {q['name'][:60]}...")
                                    
                        elif node_type == 'Organization':
                            print("     ✓ E-E-A-T Trust signals")
                            
                        elif node_type == 'BreadcrumbList':
                            print("     ✓ Navigation context")
                            if 'itemListElement' in node:
                                print(f"     • Breadcrumb levels: {len(node['itemListElement'])}")
                                
                        elif node_type == 'ProfessionalService':
                            print("     ✓ Local Business signals")
                            if 'geo' in node:
                                print("     • Location data included")
                            if 'openingHoursSpecification' in node:
                                print("     • Business hours included")
            
            print("\n📝 Generated Schema Preview (first 1500 chars):")
            print("-" * 70)
            schema_json = json.dumps(schema, indent=2, ensure_ascii=False)
            print(schema_json[:1500])
            
            print(f"\n📏 Total schema size: {len(schema_json)} characters")
            print(f"🎯 This is {len(schema_json) // len(json.dumps(result['schemas'][0]['data']) if result['schemas'] else '{}'):.1f}x more comprehensive than current schema!" if result['schemas'] else "")
            
            # Check for key SEO 2025 features
            schema_str = json.dumps(schema)
            print("\n✅ SEO 2025 Feature Checklist:")
            features = {
                "Service Schema": "Service" in schema_str,
                "FAQ Schema": "FAQPage" in schema_str or "Question" in schema_str,
                "Professional Service": "ProfessionalService" in schema_str,
                "E-E-A-T Signals": "expertise" in schema_str or "award" in schema_str,
                "Voice Search": "speakable" in schema_str,
                "Breadcrumbs": "BreadcrumbList" in schema_str,
                "Ratings/Reviews": "aggregateRating" in schema_str,
                "Pricing Info": "offers" in schema_str or "price" in schema_str,
                "Contact Info": "telephone" in schema_str,
                "Geo Location": "geo" in schema_str or "address" in schema_str,
                "Business Hours": "openingHours" in schema_str,
                "Social Links": "sameAs" in schema_str,
                "Images": "image" in schema_str,
                "Features/Benefits": "additionalProperty" in schema_str or "feature" in schema_str
            }
            
            for feature, present in features.items():
                status = "✅" if present else "❌"
                print(f"  {status} {feature}")
            
            score = sum(1 for v in features.values() if v)
            print(f"\n🏆 SEO 2025 Score: {score}/{len(features)} features implemented")
            
            if score >= 12:
                print("⭐ EXCELLENT! This schema is highly optimized for 2025 search algorithms!")
            elif score >= 8:
                print("👍 GOOD! This schema covers most important SEO 2025 features.")
            else:
                print("⚠️  Needs improvement for optimal SEO 2025 performance.")
                
        else:
            print("\n❌ No schema generated")
            
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
    
    print("\n" + "=" * 70)
    print("✅ Test Complete!")

if __name__ == "__main__":
    test_visionxbrain()