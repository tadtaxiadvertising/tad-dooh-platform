#!/usr/bin/env python3
"""TAD DOOH Platform — fast verification gates (TSC + ESLint).
Guarda resultados detallados en archivos .txt en el directorio de scratch.
"""
import os, subprocess, sys, time
from pathlib import Path

BASE = r"C:\tad-dooh-platform"
SCRATCH = os.environ.get(
    "HERMES_SCRATCH",
    os.path.expandvars(r"%LOCALAPPDATA%\hermes\profiles\develop-tad\cache\scratch")
)
OUT = Path(SCRATCH) / "fastgate-results"
OUT.mkdir(parents=True, exist_ok=True)

def run(cmd, timeout=600, cwd=BASE):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd,
                           capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"TIMEOUT after {timeout}s"

def save(name, rc, out, err):
    path = OUT / name
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"RC: {rc}\n")
        f.write(f"STDOUT ({len(out)} bytes):\n{out}\n")
        f.write(f"STDERR ({len(err)} bytes):\n{err}\n")
    printed = (out or err or "").strip()
    status = "PASS" if rc == 0 else "FAIL"
    print(f"\n{'='*60}")
    print(f"[{status}] {name}  (rc={rc}, out={len(out)}B, err={len(err)}B)")
    print(f"Saved: {path}")
    print(f"{'='*60}")
    if printed:
        for line in (out.splitlines() + err.splitlines())[:30]:
            print(f"  {line}")
    return rc == 0

print("#"*70)
print("# TAD DOOH — Fast verification gates")
print("#"*70)
print(f"Scratch dir: {SCRATCH}")
print(f"Output dir:  {OUT}")
print()

results = {}

# 1. TSC (usando binario directo que sí funciona)
rc, out, err = run(
    'node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json',
    timeout=300
)
results['tsc'] = save("tsc-check.txt", rc, out, err)

# 2. ESLint API (binario local v8.57.1 que funciona)
api_eslint = os.path.join(BASE, "apps", "api", "node_modules", "eslint", "bin", "eslint.js")
if os.path.exists(api_eslint):
    rc, out, err = run(
        f'cd apps/api && node "{api_eslint}" src --format unix',
        timeout=180
    )
    results['eslint_api'] = save("eslint-api.txt", rc, out, err)
else:
    print("⚠️  ESLint API bin no encontrado")
    results['eslint_api'] = None

# 3. ESLint Driver (binario global v9 con formatter unix, que funciona)
rc, out, err = run(
    'node node_modules/eslint/bin/eslint.js '
    'apps/driver/src apps/driver/pages apps/driver/components --format unix',
    timeout=180
)
results['eslint_driver'] = save("eslint-driver.txt", rc, out, err)

# Summary
print("\n" + "#"*70)
print("# SUMMARY")
print("#"*70)
all_ok = True
for k, v in results.items():
    if v is None:
        print(f"  {k}: ⏭️  N/A")
    elif v:
        print(f"  {k}: ✅ PASS")
    else:
        print(f"  {k}: ❌ FAIL")
        all_ok = False

print(f"\nOverall: {'✅ ALL FAST GATES PASS' if all_ok else '❌ SOME GATES FAIL'}")

if all_ok:
    print("\n👉 Próximo paso: ejecutar Jest tests (lento, ~5-10 min)")
    print("   Comando: node node_modules/jest/bin/jest.js --runInBand --no-coverage")
else:
    print("\n👉 Corregir errores antes de continuar con Jest")

print(f"\nTodos los resultados guardados en: {OUT}")
