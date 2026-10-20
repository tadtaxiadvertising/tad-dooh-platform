# -*- coding: utf-8 -*-
import io

path = '/c/tad-dooh-platform/docs/qa/audit-2026-10-14/04-findings.md'
content = io.open(path, 'r', encoding='utf-8').read()
lines = content.split('\n')

new_lines = []
inserted = False
for i, line in enumerate(lines):
    new_lines.append(line)
    if not inserted and '1. **tsconfig types**' in line:
        new_lines.append('2. **isolatedModules** — ts-jest requires isolatedModules: true for module: node16 (warning TS151002)')
        for j in range(i+1, len(lines)):
            if '2. **Mocks rotos**' in lines[j]:
                lines[j] = '3. **Mocks rotos** — cambios en mock shapes (device_id, scan.qrCode, contactPhone)'
            elif '3. **Import rotos**' in lines[j]:
                lines[j] = '4. **Import rotos** — ../types → ../commission.service'
            elif '4. **Métodos mockeados**' in lines[j]:
                lines[j] = '5. **Métodos mockeados** — findUnique → findFirst (coincide con la API del servicio)'
        inserted = True

io.open(path, 'w', encoding='utf-8').write('\n'.join(new_lines))
print('Done')
