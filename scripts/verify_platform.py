#!/usr/bin/env python3
"""TAD DOOH Platform — verification & fix orchestration.
Evita bash inestable: hace todo desde Python nativo (subprocess con TTL corto).
"""
import os, subprocess, json, sys, time

BASE = r"C:\tad-dooh-platform"
API = os.path.join(BASE, "apps", "api")
DRIVER = os.path.join(BASE, "apps", "driver")

def run(cmd, timeout=120, cwd=BASE):
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=timeout
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"TIMEOUT after {timeout}s"

def node(cmd, timeout=120, cwd=BASE):
    full = f'node -e "require(\'child_process\').execSync(\'{cmd}\',{{encoding:\'utf8\',maxBuffer:100*1024*1024,timeout:{timeout*1000}}}).trim()" 2>&1'
    return run(full, timeout=timeout+30, cwd=cwd)

def check(name, rc, out, err):
    status = "✅" if rc == 0 else "❌"
    print(f"\n{'='*50}")
    print(f"{status} {name} (rc={rc})")
    print(f"{'='*50}")
    if out.strip():
        lines = out.splitlines()
        print(f"  stdout ({len(lines)} lines):")
        for line in lines[:40]:
            print(f"    {line}")
        if len(lines) > 40:
            print(f"    ... +{len(lines)-40} más")
    if err.strip():
        print(f"  stderr: {err[:500]}")
    return rc == 0

def main():
    results = {}
    
    # 1. Git status
    print("#"*60)
    print("# TAD DOOH — VERIFICACIÓN PARA PRODUCCIÓN")
    print("#"*60)
    rc, out, err = run("git status --short")
    print(f"\n📦 GIT STATUS (short):")
    print(out if out else "(limpio)")
    rc2, out2, err2 = run("git log --oneline -5")
    print(f"📝 Últimos commits:")
    for l in out2.splitlines()[:5]:
        print(f"   {l}")
    results['git'] = True  # info only
    
    # 2. TypeScript
    print("\n" + "="*50)
    rc, out, err = node(
        "cd apps/api && node ../../node_modules/typescript/bin/tsc --noEmit 2>&1",
        timeout=120
    )
    ok = check("TypeScript (apps/api)", rc, out, err)
    results['tsc'] = ok
    
    # 3. ESLint API (local v8)
    api_eslint = os.path.join(API, "node_modules", ".bin", "eslint")
    # fallback: use node_modules/eslint/bin/eslint.js
    if not os.path.exists(api_eslint):
        api_eslint = os.path.join(API, "node_modules", "eslint", "bin", "eslint.js")
    
    if os.path.exists(api_eslint):
        rc, out, err = node(
            f'cd apps/api && node "{api_eslint}" src --format unix 2>&1',
            timeout=120
        )
        ok = check("ESLint API (local v8)", rc, out, err)
        results['eslint_api'] = ok
    else:
        print("⚠️  ESLint bin no encontrado en apps/api/node_modules")
        results['eslint_api'] = None
    
    # 4. ESLint Driver (v9 + unix formatter)
    rc, out, err = node(
        'cd apps/driver && node ../../node_modules/eslint/bin/eslint.js '
        'src pages components --format unix 2>&1',
        timeout=180
    )
    ok = check("ESLint Driver (v9 + unix)", rc, out, err)
    results['eslint_driver'] = ok
    
    # 5. Jest tests
    rc, out, err = node(
        'cd apps/api && node ../jest/bin/jest.js '
        '--runInBand --no-coverage --config jest.config.js 2>&1',
        timeout=600
    )
    ok = check("Jest tests (apps/api)", rc, out, err)
    results['jest'] = ok
    
    # Summary
    print("\n" + "="*60)
    print("RESUMEN DE PUERTAS DE CALIDAD")
    print("="*60)
    all_pass = True
    for k, v in results.items():
        if v is None:
            print(f"  {k}: ⏭️  N/A (no verificado)")
        elif v:
            print(f"  {k}: ✅ Pasó")
        else:
            print(f"  {k}: ❌ Falló")
            all_pass = False
    
    print("\n" + "="*60)
    if all_pass:
        print("✅ TODAS LAS PUERTAS PASAN → listo para commit/push")
    else:
        print("❌ ALGUNAS PUERTAS FALLAN → requieren corrección")
    print("="*60)
    
    return 0 if all_pass else 1

if __name__ == "__main__":
    sys.exit(main())
