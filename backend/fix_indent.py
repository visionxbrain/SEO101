#!/usr/bin/env python3

# Read the file
with open('schema_markup_checker.py', 'r') as f:
    lines = f.readlines()

# Fix indentation in generate_schema_script function
in_function = False
in_try_block = False
fixed_lines = []

for i, line in enumerate(lines):
    if 'def generate_schema_script' in line:
        in_function = True
        fixed_lines.append(line)
    elif in_function and line.strip().startswith('try:'):
        in_try_block = True
        fixed_lines.append(line)
    elif in_function and 'def extract_schema_markup' in line:
        in_function = False
        in_try_block = False
        fixed_lines.append(line)
    elif in_function and in_try_block:
        # Inside the try block of generate_schema_script
        if line.startswith('    except'):
            # This is the except block - keep it at same level as try
            fixed_lines.append(line)
            in_try_block = False
        elif line.startswith('    ') and not line.startswith('        '):
            # Line has 4 spaces, should have 8 (inside try block)
            fixed_lines.append('    ' + line)
        else:
            fixed_lines.append(line)
    else:
        fixed_lines.append(line)

# Write the fixed file
with open('schema_markup_checker_fixed.py', 'w') as f:
    f.writelines(fixed_lines)

print("Fixed indentation and saved to schema_markup_checker_fixed.py")