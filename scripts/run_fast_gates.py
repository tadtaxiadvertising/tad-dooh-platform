#!/usr/bin/env python3
"""TAD DOOH Platform — fast verification gates (TSC + ESLint).
Guarda resultados detallados en archivos .txt en el directorio de scratch.
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent


def output_directory():
    scratch = os.environ.get("HERMES_SCRATCH")
    if not scratch:
        local_appdata = os.environ.get("LOCALAPPDATA")
        scratch = (
            Path(local_appdata) / "hermes/profiles/develop-tad/cache/scratch"
            if local_appdata
            else Path(tempfile.gettempdir()) / "tad-dooh/scratch"
        )
    return Path(scratch) / "fastgate-results"


def run(cmd, timeout=600, cwd=BASE, env=None):
    try:
        r = subprocess.run(cmd, shell=False, cwd=cwd, env=env,
                           capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"TIMEOUT after {timeout}s"
    except FileNotFoundError:
        return 127, "", f"Required executable is unavailable: {cmd[0]}"
    except OSError:
        return 126, "", "Required check could not be started"


def save(directory, name, rc, out, err):
    path = directory / name
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"RC: {rc}\n")
        f.write(f"STDOUT ({len(out)} chars):\n{out}\n")
        f.write(f"STDERR ({len(err)} chars):\n{err}\n")
    printed = (out or err or "").strip()
    status = "PASS" if rc == 0 else "FAIL"
    print(f"\n{'='*60}")
    print(f"[{status}] {name}  (rc={rc}, out={len(out)}, err={len(err)})")
    print(f"Saved: {path}")
    print(f"{'='*60}")
    if printed:
        for line in (out.splitlines() + err.splitlines())[:30]:
            print(f"  {line}")
    return rc == 0


def main():
    directory = output_directory()
    directory.mkdir(parents=True, exist_ok=True)
    print("#"*70)
    print("# TAD DOOH - Fast verification gates")
    print("#"*70)
    print(f"Repository: {BASE}")
    print(f"Output dir: {directory}")

    tsc = BASE / "node_modules/typescript/bin/tsc"
    api_eslint = BASE / "apps/api/node_modules/eslint/bin/eslint.js"
    driver_eslint = BASE / "node_modules/eslint/bin/eslint.js"
    lint_args = ["--config", "eslint.config.mjs", "--format", "stylish", "--max-warnings", "0"]
    lint_env = {**os.environ, "ESLINT_USE_FLAT_CONFIG": "true"}
    checks = [
        ("tsc", "tsc-check.txt", tsc,
         ["node", str(tsc), "--noEmit", "-p", str(BASE / "apps/api/tsconfig.json")],
         BASE, 300, None),
        ("eslint_api", "eslint-api.txt", api_eslint,
         ["node", str(api_eslint), "src", *lint_args],
         BASE / "apps/api", 180, lint_env),
        ("eslint_driver", "eslint-driver.txt", driver_eslint,
         ["node", str(driver_eslint), ".", *lint_args],
         BASE / "apps/driver", 180, lint_env),
    ]
    results = {}
    for name, report, tool, command, cwd, timeout, env in checks:
        if tool.is_file():
            rc, out, err = run(command, timeout=timeout, cwd=cwd, env=env)
        else:
            rc, out, err = 127, "", f"Required tool file is unavailable: {tool}"
        results[name] = save(directory, report, rc, out, err)

    print("\n" + "#"*70)
    print("# SUMMARY")
    print("#"*70)
    for name, passed in results.items():
        print(f"  {name}: {'PASS' if passed else 'FAIL'}")
    all_ok = all(results.values())
    print(f"\nOverall: {'ALL FAST GATES PASS' if all_ok else 'SOME GATES FAIL'}")
    if all_ok:
        print("\nProximo paso: ejecutar Jest tests")
        print("   Comando: pnpm --filter api test --runInBand --no-coverage")
    else:
        print("\nCorregir errores antes de continuar con Jest")
    print(f"\nTodos los resultados guardados en: {directory}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
