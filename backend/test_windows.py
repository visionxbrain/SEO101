#!/usr/bin/env python3
"""
Test script for Windows connectivity issues
"""
import platform
import socket
import requests
import json
import sys

def test_server_connectivity():
    """Test if server is accessible"""
    print("=" * 60)
    print("SEO101 Backend - Windows Connectivity Test")
    print("=" * 60)
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version}")
    print()
    
    # Test 1: Check if port 8000 is available
    print("1. Testing port 8000 availability...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', 8000))
    sock.close()
    
    if result == 0:
        print("   ✓ Port 8000 is open and server is running")
    else:
        print("   ✗ Port 8000 is not accessible")
        print("   Please start the server first: python app.py")
        return False
    
    # Test 2: Test API endpoints
    print("\n2. Testing API endpoints...")
    
    # Test root endpoint
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            print("   ✓ Root endpoint accessible")
        else:
            print(f"   ✗ Root endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error accessing root: {e}")
        return False
    
    # Test 3: Test Schema checker with a simple URL
    print("\n3. Testing Schema Markup Checker...")
    test_url = "https://example.com"
    
    try:
        response = requests.post(
            "http://localhost:8000/api/check-schema-markup",
            json={"urls": [test_url], "max_workers": 1},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Schema checker working")
            if data.get('results'):
                result = data['results'][0]
                print(f"   - URL: {result['url']}")
                print(f"   - Has Schema: {result['has_schema']}")
                print(f"   - Schema Types: {result['schema_types']}")
        else:
            print(f"   ✗ Schema checker returned: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except requests.exceptions.Timeout:
        print("   ✗ Request timeout - server may be slow")
    except requests.exceptions.ConnectionError as e:
        print(f"   ✗ Connection error: {e}")
    except Exception as e:
        print(f"   ✗ Unexpected error: {e}")
    
    # Test 4: Check SSL/TLS support
    print("\n4. Testing HTTPS connectivity...")
    try:
        response = requests.get("https://www.google.com", timeout=5)
        print("   ✓ HTTPS requests working")
    except Exception as e:
        print(f"   ✗ HTTPS error: {e}")
        print("   This might cause issues with fetching external schemas")
    
    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    # Check if we're on Windows
    if platform.system() == "Windows":
        print("Running on Windows - using Windows-specific settings")
    
    test_server_connectivity()
    
    input("\nPress Enter to exit...")