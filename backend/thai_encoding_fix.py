"""
Thai Encoding Fix Module
Handles various Thai text encoding issues commonly found in web scraping
"""
import re
import json

def fix_thai_encoding(obj):
    """
    Comprehensive fix for Thai text encoding issues.
    Handles:
    1. Mojibake (UTF-8 interpreted as Latin-1/ISO-8859-1/Windows-1252)
    2. Unicode escape sequences (\\u0e...)
    3. Double-escaped sequences
    4. Mixed encoding issues
    """
    if isinstance(obj, str):
        # First, try to fix mojibake patterns
        if has_mojibake_pattern(obj):
            fixed = fix_mojibake(obj)
            if fixed != obj:
                obj = fixed
        
        # Then handle unicode escapes if present
        if has_unicode_escape_pattern(obj):
            fixed = fix_unicode_escapes(obj)
            if fixed != obj:
                obj = fixed
        
        # Final check: if still has mojibake after unicode decode, fix again
        if has_mojibake_pattern(obj):
            obj = fix_mojibake(obj)
        
        return obj
    elif isinstance(obj, dict):
        return {key: fix_thai_encoding(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [fix_thai_encoding(item) for item in obj]
    else:
        return obj

def has_mojibake_pattern(text):
    """Check if text contains mojibake patterns"""
    if not isinstance(text, str):
        return False
    # Common mojibake patterns for Thai text
    mojibake_patterns = [
        'à¸', 'à¹', 'Ã¸', 'Ã¹', 'â', 
        'à¸\x81', 'à¸\x82', 'à¸\x83',  # Thai consonants encoded wrong
        'à¸¥', 'à¸§', 'à¸¨', 'à¸©',
        'à¸²', 'à¸³', 'à¸´', 'à¸µ',  # Thai vowels encoded wrong
        'Â', 'à¸­', 'à¸®'
    ]
    return any(pattern in text for pattern in mojibake_patterns)

def has_unicode_escape_pattern(text):
    """Check if text contains unicode escape patterns"""
    if not isinstance(text, str):
        return False
    # Patterns for Thai unicode escapes
    return bool(re.search(r'\\+u0[eE][0-9a-fA-F]{2}', text))

def fix_mojibake(text):
    """Fix mojibake encoding issues"""
    if not isinstance(text, str):
        return text
    
    # List of encoding pairs to try (interpreted_as, actually_is)
    encoding_fixes = [
        ('latin-1', 'utf-8'),
        ('iso-8859-1', 'utf-8'),
        ('windows-1252', 'utf-8'),
        ('cp1252', 'utf-8'),
    ]
    
    for interpreted_as, actually_is in encoding_fixes:
        try:
            # Try to fix the mojibake
            # Ignore errors to handle partial/mixed encoding
            fixed = text.encode(interpreted_as, errors='ignore').decode(actually_is, errors='ignore')
            
            # Check if the fix produced Thai characters
            if has_thai_chars(fixed) and not has_mojibake_pattern(fixed):
                return fixed
        except:
            continue
    
    return text

def fix_unicode_escapes(text):
    """Fix unicode escape sequences"""
    if not isinstance(text, str):
        return text
    
    try:
        # Handle different levels of escaping
        fixed = text
        
        # Replace multiple backslashes with single
        # \\\\u0e01 -> \\u0e01
        while '\\\\\\\\' in fixed:
            fixed = fixed.replace('\\\\\\\\', '\\\\')
        
        # Replace double escaped unicode
        # \\u0e01 -> \u0e01
        fixed = re.sub(r'\\\\u([0-9a-fA-F]{4})', r'\\u\\1', fixed)
        
        # Now decode unicode escapes
        # Try different approaches
        try:
            # First try: direct unicode-escape decode
            decoded = fixed.encode('utf-8').decode('unicode-escape')
            if has_thai_chars(decoded):
                return decoded
        except:
            pass
        
        try:
            # Second try: json loads for proper unicode handling
            # Wrap in quotes to make it valid JSON string
            if '\\u' in fixed:
                decoded = json.loads('"' + fixed.replace('"', '\\"') + '"')
                if has_thai_chars(decoded):
                    return decoded
        except:
            pass
        
        # Third try: manual replacement
        def replace_unicode(match):
            code = match.group(1)
            try:
                return chr(int(code, 16))
            except:
                return match.group(0)
        
        decoded = re.sub(r'\\u([0-9a-fA-F]{4})', replace_unicode, fixed)
        if has_thai_chars(decoded):
            return decoded
            
    except:
        pass
    
    return text

def has_thai_chars(text):
    """Check if text contains Thai characters"""
    if not isinstance(text, str):
        return False
    # Thai Unicode range: U+0E00 to U+0E7F
    return any('\u0e00' <= c <= '\u0e7f' for c in text)

# Export the main function
__all__ = ['fix_thai_encoding', 'has_thai_chars', 'has_mojibake_pattern']