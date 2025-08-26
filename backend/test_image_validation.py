#!/usr/bin/env python3
"""Test that all images in schema are real from the page"""

import requests
from bs4 import BeautifulSoup
import json

# First, let's check what images are actually on the page
url = "https://www.visionxbrain.com/services/webflow-design-development"
response = requests.get(url, timeout=10)
soup = BeautifulSoup(response.content, 'html.parser')

print("=" * 70)
print("🔍 ACTUAL IMAGES FOUND ON THE PAGE:")
print("=" * 70)

# Find all images on the page
all_images = soup.find_all('img')
actual_images = []

for img in all_images:
    img_src = img.get('src') or img.get('data-src')
    if img_src:
        img_alt = img.get('alt', 'No alt text')
        actual_images.append(img_src)
        print(f"\n✓ Found image: {img_src[:80]}...")
        print(f"  Alt: {img_alt[:50]}")

print(f"\n📊 Total images on page: {len(actual_images)}")

# Now check what our schema generator produces
print("\n" + "=" * 70)
print("🔍 CHECKING SCHEMA GENERATED IMAGES:")
print("=" * 70)

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
        schema_images = []
        
        # Extract all images from schema
        def extract_images(obj, path=""):
            if isinstance(obj, dict):
                if obj.get('@type') == 'ImageObject':
                    img_url = obj.get('url')
                    if img_url:
                        schema_images.append((img_url, path))
                elif 'image' in obj and isinstance(obj['image'], str):
                    schema_images.append((obj['image'], path))
                elif 'logo' in obj and isinstance(obj['logo'], dict):
                    logo_url = obj['logo'].get('url')
                    if logo_url:
                        schema_images.append((logo_url, path + '/logo'))
                
                for key, value in obj.items():
                    extract_images(value, f"{path}/{key}")
                    
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    extract_images(item, f"{path}[{i}]")
        
        extract_images(schema)
        
        print("\nImages in generated schema:")
        for img_url, location in schema_images:
            print(f"\n📷 Image: {img_url[:80]}...")
            print(f"   Location in schema: {location}")
            
            # Check if this image actually exists on the page
            is_real = False
            
            # Check exact match
            if img_url in actual_images:
                is_real = True
                print("   ✅ REAL - Found exact match on page")
            # Check if it's a partial match (for relative URLs)
            elif any(img_url in actual for actual in actual_images):
                is_real = True
                print("   ✅ REAL - Found partial match on page")
            # Check if actual image is in the URL (for absolute URLs)
            elif any(actual in img_url for actual in actual_images if actual.startswith('http')):
                is_real = True
                print("   ✅ REAL - Found as absolute URL on page")
            else:
                # Check if it might be a default/fallback image
                if any(word in img_url.lower() for word in ['logo.png', 'image.jpg', 'thumb.jpg', 'video-thumb']):
                    print("   ⚠️  MOCK - This is a fallback/default image, not from page!")
                else:
                    print("   ❓ UNKNOWN - Could not verify if this image is real")
        
        print("\n" + "=" * 70)
        print(f"📊 Total images in schema: {len(schema_images)}")
        
        # Count mock vs real
        mock_count = sum(1 for url, _ in schema_images if any(word in url.lower() for word in ['logo.png', 'image.jpg', 'thumb.jpg', 'video-thumb']) and not any(url in actual or actual in url for actual in actual_images))
        
        if mock_count > 0:
            print(f"⚠️  WARNING: Found {mock_count} mock/fallback images that need fixing!")
        else:
            print("✅ All images appear to be from the actual page!")
            
print("\n" + "=" * 70)