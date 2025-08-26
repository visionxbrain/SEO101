#!/usr/bin/env python3
"""
Test Thai encoding fix for Schema markup
"""
import json

def fix_thai_encoding(obj):
    """Fix incorrectly encoded Thai text in JSON data"""
    if isinstance(obj, str):
        # Check if string contains Unicode escape sequences for Thai characters
        if r'\u0e' in obj or '\\u0e' in obj:
            try:
                # Try to decode Unicode escapes
                # First handle double-escaped sequences
                fixed = obj.replace('\\\\', '\\')
                # Then decode the Unicode escapes
                fixed = fixed.encode().decode('unicode-escape')
                # If result contains Thai characters, return it
                if any('\u0e00' <= c <= '\u0e7f' for c in fixed):
                    return fixed
            except:
                pass
        
        # Also try to detect and fix mojibake patterns
        # Common pattern: à¸ represents Thai character encoding issues
        if 'à¸' in obj or 'à¹' in obj or 'Ã' in obj:
            try:
                # Try to fix UTF-8 decoded as Latin-1
                fixed = obj.encode('latin-1').decode('utf-8', errors='ignore')
                if any('\u0e00' <= c <= '\u0e7f' for c in fixed):
                    return fixed
            except:
                pass
        
        return obj
    elif isinstance(obj, dict):
        return {key: fix_thai_encoding(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [fix_thai_encoding(item) for item in obj]
    else:
        return obj

# Test with the problematic schema from visionxbrain.com
test_data = {
    "name": "\\u0e17\\u0e35\\u0e48\\u0e1b\\u0e23\\u0e36\\u0e01\\u0e29\\u0e32\\u0e14\\u0e49\\u0e32\\u0e19\\u0e01\\u0e32\\u0e23\\u0e15\\u0e25\\u0e32\\u0e14\\u0e14\\u0e34\\u0e08\\u0e34\\u0e17\\u0e31\\u0e25 | Digital Marketing Consultant",
    "description": "\\u0e40\\u0e27\\u0e47\\u0e1a\\u0e44\\u0e0b\\u0e15\\u0e4c\\u0e02\\u0e2d\\u0e07\\u0e40\\u0e23\\u0e32\\u0e04\\u0e37\\u0e2d\\u0e17\\u0e35\\u0e48\\u0e1b\\u0e23\\u0e36\\u0e01\\u0e29\\u0e32\\u0e14\\u0e49\\u0e32\\u0e19 Marketing"
}

print("=" * 70)
print("TESTING THAI ENCODING FIX")
print("=" * 70)

print("\nOriginal (with Unicode escapes):")
print(json.dumps(test_data, indent=2))

print("\nFixed (proper Thai text):")
fixed_data = fix_thai_encoding(test_data)
print(json.dumps(fixed_data, ensure_ascii=False, indent=2))

print("\n" + "=" * 70)
print("TEST RESULTS:")
print("=" * 70)

# Check if Thai text appears correctly
if "ที่ปรึกษา" in fixed_data['name']:
    print("✅ Thai text is properly decoded!")
    print(f"Name: {fixed_data['name']}")
    print(f"Description: {fixed_data['description']}")
else:
    print("❌ Thai text is still not properly decoded")

# Test with double-escaped sequences
print("\n" + "=" * 70)
print("TESTING DOUBLE-ESCAPED SEQUENCES:")
print("=" * 70)

double_escaped = "\\\\u0e17\\\\u0e35\\\\u0e48\\\\u0e1b\\\\u0e23\\\\u0e36\\\\u0e01\\\\u0e29\\\\u0e32"
print(f"Original: {double_escaped}")
fixed_double = fix_thai_encoding(double_escaped)
print(f"Fixed: {fixed_double}")