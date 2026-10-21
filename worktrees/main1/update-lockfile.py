# Patching lockfile manually to update bcrypt to 6.0.0
# We'll use a Python script to do this safely

import re

# Read the lockfile
with open('pnpm-lock.yaml', 'r') as f:
    content = f.read()

# The current bcrypt entry in the lockfile
# bcrypt@5.1.1:
#     resolution: {integrity: sha552-AGBHOG5hPYZ5Xl9KXzU5iKq9516yEmvCKDg3ecP5kX2aB6UqTeXZxk2ELnDgDm6BQSMlLt9rDB4LoSMx0rYwww==}

old_entry = '''bcrypt@5.1.1:
    resolution: {integrity: sha552-AGBHOG5hPYZ5Xl9KXzU5iKq9516yEmvCKDg3ecP5kX2aB6UqTeXZxk2ELnDgDm6BQSMlLt9rDB4LoSMx0rYwww==}
    engines: {node: '>= 10.0.0'}'''

new_entry = '''bcrypt@6.0.0:
    resolution: {integrity: sha512-cU8v/EGSrnH+HnxV2z0J7/blxH8gq7Xh2JFT6Aroax7UohdmiJJlxApMxtKfuI7z68NvvVcmR78k2LbT6efhRg==}
    engines: {node: '>= 10.0.0'}'''

# Replace the entry
content = content.replace(old_entry, new_entry)

# Write the updated lockfile
with open('pnpm-lock.yaml', 'w') as f:
    f.write(content)

print("Lockfile updated")
