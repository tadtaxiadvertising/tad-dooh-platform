import re
import json

path = 'package.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print('Before:', repr(content[content.find('transform'):content.find('transform')+200]))

# The file has: \\\( (three backslashes + open paren) = invalid JSON
# We need: \\ (two backslashes + open paren) = valid JSON

# Find all occurrences of three backslashes before open paren
pattern = re.compile(r'\\\\{3}')
count = len(pattern.findall(content))
print(f'Found {count} occurrences')

# Replace three backslashes with two
content = pattern.sub(r'\\', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify JSON is now valid
try:
    with open(path, 'r', encoding='utf-8') as f:
        json.load(f)
    print('JSON is valid')
except json.JSONDecodeError as e:
    print(f'JSON error: {e}')
