#!/usr/bin/env python3
"""TAD DOOH Platform — verification & fix orchestration.
Evita bash inestable: hace todo desde Python nativo (subprocess con TTL corto).
"""
import os, subprocess, json, sys, time

BASE = r"C:\tad-dooh-platform"
API = os.path.join(BASE, "apps", "api")

def run(cmd, timeout=120, cwd=BASE):
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=timeout
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"TIMEOUT after {timeout}s"

def sh(cmd, timeout=120, cwd=BASE):
    """Ejecuta comando de shell directamente (no node -e wrapper)"""
    return run(cmd, timeout=timeout, cwd=cwd)

def check(name, rc, out, err):
    status = "✅" if rc == 0 else "❌"
    print(f"\n{'='*50}")
    print(f"{status} {name} (rc={rc})")
    print(f"{'='*50}")
    if out.strip():
        lines = out.splitlines()
        print(f"  stdout ({len(lines)} líneas):")
        for line in lines[:40]:
            print(f"    {line}")
        if len(lines) > 40:
            print(f"    ... +{len(lines)-40} más")
    if err.strip():
        print(f"  stderr: {err[:500]}")
    return rc == 0

def main():
    print("#"*60)
    print("# TAD DOOH — VERIFICACIÓN PARA PRODUCCIÓN")
    print("#"*60)
    
    # 1. Git status
    rc, out, err = sh("git status --short")
    print(f"\n📦 GIT STATUS (short):")
    print(out if out else "(limpio)")
    
    rc, out, err = sh("git log --oneline -5")
    print(f"\n📝 Últimos commits:")
    for l in out.splitlines()[:5]:
        print(f"   {l}")
    
    # 2. TypeScript (usando npx tsc que funcionó antes)
    print("\n" + "="*50)
    rc, out, err = sh(
        "cd apps/api && npx tsc --noEmit 2>&1",
        timeout=300
    )
    ok = check("TypeScript (apps/api, npx tsc)", rc, out, err)
    
    # 3. ESLint API (local v8)
    api_eslint = os.path.join(API, "node_modules", "eslint", "bin", "eslint.js")
    if os.path.exists(api_eslint):
        rc, out, err = sh(
            f'cd apps/api && node "{api_eslint}" src --format unix 2>&1',
            timeout=120
        )
        ok = check("ESLint API (local v8)", rc, out, err)
    else:
        print("⚠️  ESLint bin no encontrado")
    
    # 4. ESLint Driver (v9 + unix formatter)
    rc, out, err = sh(
        'cd apps/driver && node ../../node_modules/eslint/bin/eslint.js '
        'src pages components --format unix 2>&1',
        timeout=180
    )
    ok = check("ESLint Driver (v9 + unix)", rc, out, err)
    
    # 5. Jest tests
    rc, out, err = sh(
        'cd apps/api && node ../jest/bin/jest.js '
        '--runInBand --no-coverage 2>&1',
        timeout=600
    )
    ok = check("Jest tests (apps/api)", rc, out, err)
    
    # Summary
    print("\n" + "="*60)
    print("RESUMEN")
    print("="*60)
    print(f"  TypeScript: {'✅' if rc == 0 else '❌'}")
    print(f"  ESLint API: {'✅' if rc == 0 else '❌'}")
    print(f"  ESLint Driver: {'✅' if rc == 0 else '❌'}")
    print(f"  Jest tests: {'✅' if rc == 0 else '❌'}")
    print("="*60)

if __name__ == "__main__":
    main()
