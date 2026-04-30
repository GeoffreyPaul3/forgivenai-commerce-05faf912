
import sys

def check_tags(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = []
    for i, line in enumerate(lines):
        # Very simple tag finding, doesn't handle all cases but good for divs
        import re
        opens = re.findall(r'<div\b', line)
        closes = re.findall(r'</div\b', line)
        
        for _ in opens:
            stack.append(i + 1)
        for _ in closes:
            if stack:
                stack.pop()
            else:
                print(f"Extra closing div at line {i + 1}")
    
    for line_num in stack:
        print(f"Unclosed div starting at line {line_num}")

check_tags('src/pages/dashboard/VendorsPage.tsx')
