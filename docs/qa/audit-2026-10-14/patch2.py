# -*- coding: utf-8 -*-
import io

path = '/c/tad-dooh-platform/docs/qa/audit-2026-10-14/04-findings.md'
content = io.open(path, 'r', encoding='utf-8').read()
lines = content.split('\n')

new_lines = []
skip = 0
for i, line in enumerate(lines):
    if i == 690:
        # Line 691 (0-indexed 690): replace
        new_lines.append('2. **isolatedModules** — ts-jest requires isolatedModules: true for module: node16 (warning TS151002)')
        skip = 1
    elif i == 691:
        # Line 692 (0-indexed 691): skip
        skip = 1
        continue
    else:
        new_lines.append(line)

io.open(path, 'w', encoding='utf-8').write('\n'.join(new_lines))
print('Done')
