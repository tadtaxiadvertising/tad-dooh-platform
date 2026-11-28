#!/usr/bin/env bash
# verify-production-checklist.sh
# Panorámico de estado de TAD DOOH Platform orientado a “¿listo para deploy?”.
# Regla interna: no toca código; solo lee estado y reporta. Salida compacta y decidida.
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; CYAN='\033[36m'; RESET='\033[0m'
OK(){ printf "${GREEN}✔${RESET} %s\n" "$1"; }
FAIL(){ printf "${RED}✖${RESET} %s\n" "$1"; }
WARN(){ printf "${YELLOW}▲${RESET} %s\n" "$1"; }
INFO(){ printf "${CYAN}ℹ${RESET} %s\n" "$1"; }

echo "═══════════════════════════════════════════"
echo "  TAD DOOH Platform — Production readiness"
echo "  Root: $ROOT"
echo "═══════════════════════════════════════════"
echo

# ---------- 1. GIT ----------
echo -e "\n${CYAN}── Git state ──${RESET}"
BRANCH=$(git branch --show-current 2>/dev/null || echo "?")
UPSTREAM=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null || echo "")
AHEAD=$(git rev-list --count "${UPSTREAM}..HEAD" 2>/dev/null || echo 0)
BEHIND=$(git rev-list --count "HEAD..${UPSTREAM}" 2>/dev/null || echo 0)
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
UNCHANGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
printf "  branch: %s\n" "$BRANCH"
printf "  upstream: %s  ahead: %s  behind: %s\n" "$UPSTREAM" "$AHEAD" "$BEHIND"
printf "  staged: %s  unstaged: %s  untracked: %s\n" "$STAGED" "$UNCHANGED" "$UNTRACKED"
if [ "$STAGED" -gt 0 ] || [ "$UNCHANGED" -gt 0 ] || [ "$UNTRACKED" -gt 0 ]; then
  FAIL "Hay cambios pendientes de commitear" >&2
else
  OK "Working tree limpio"
fi

echo -e "\n  ── Modified files by workspace ──"
git diff --name-only 2>/dev/null | grep -E '^(apps|packages)/' | cut -d/ -f1,2 | sort | uniq -c | sort -rn | while read -r cnt path; do
  printf "    %5s %s\n" "$cnt" "$path"
done || true

echo -e "\n  ── Status short (primeros 40) ──"
git status --short 2>/dev/null | head -40 || true

# ---------- 2. LOCKFILE + INSTALL ----------
echo -e "\n${CYAN}── Lockfile / install health ──"
if [ -f pnpm-lock.yaml ]; then
  OK "pnpm-lock.yaml existe ($(wc -c < pnpm-lock.yaml | tr -d ' ') bytes)"
else
  WARN "pnpm-lock.yaml no encontrado"
fi
if [ -f package-lock.json ]; then
  INFO "package-lock.json también presente (revisar consistencia si se usa npm)"
fi

# quick lockfile integrity check signal (no reinstalar nada aquí)
INFO "Evitando reinstalación masiva en este check (queda para fase de corrección)"

# ---------- 3. DISK / ARTIFACTS ----------
echo -e "\n${CYAN}── Disk & artifacts ──"
df -h . | tail -1 | awk '{printf "  disco: %s usado (%s libre)\n", $5, $4}'
if [ -f apps/api/dist/main.js ]; then
  OK "API artifact existe: apps/api/dist/main.js"
else
  FAIL "API artifact ausente: apps/api/dist/main.js"
fi
if [ -d node_modules ]; then
  NM_COUNT=$(find node_modules -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')
  printf "  root node_modules: %s paquetes\n" "$NM_COUNT"
else
  WARN "node_modules raíz ausente"
fi
if [ -d apps/api/node_modules ]; then
  API_NM_COUNT=$(find apps/api/node_modules -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')
  printf "  api node_modules: %s paquetes\n" "$API_NM_COUNT"
  if ! ls apps/api/node_modules/.bin/jest >/dev/null 2>&1; then
    WARN "jest bin ausente en apps/api/node_modules/.bin (posible hoisting mismatch)"
  fi
else
  WARN "apps/api/node_modules ausente"
fi

# ---------- 4. BACKEND BUILD + TYPECHECK ----------
echo -e "\n${CYAN}── Backend typecheck / build ──"
TSC_BIN="node_modules/typescript/bin/tsc"
if [ -x "$TSC_BIN" ] || [ -f "$TSC_BIN" ]; then
  TSC_RC=0
  TSC_OUT=$(timeout 120 "$TSC_BIN" --noEmit -p apps/api/tsconfig.json 2>&1) || TSC_RC=$?
  if [ "$TSC_RC" -eq 0 ]; then
    OK "tsc --noEmit: sin errores reportados"
  else
    FAIL "tsc --noEmit reporta errores (ver debajo)"
    echo "$TSC_OUT" | grep -E 'error TS' | head -20 | sed 's/^/    /'
    if [ "$(echo "$TSC_OUT" | grep -cE 'error TS')" -gt 20 ]; then
      echo "    … y más errores (truncado)"
    fi
  fi
else
  WARN "tsc bin no disponible en root; saltando typecheck global (revisar apps/api/tsconfig.json manualmente)"
fi

if [ -f apps/api/package.json ]; then
  API_BUILD_CMD="cd apps/api && npm run build 2>&1"
  echo -e "\n  ── API build (nest build) ──"
  BUILD_RC=0
  BUILD_OUT=$(timeout 120 bash -lc "cd '$ROOT/apps/api' && npm run build 2>&1") || BUILD_RC=$?
  if [ "$BUILD_RC" -eq 0 ]; then
    OK "nest build completado (exit 0)"
  else
    FAIL "nest build falló (exit $BUILD_RC); revisar logs locales protegidos"
  fi
fi

# ---------- 5. SUPERVISIÓN DE PROCESOS EN SEGUNDO PLANO (solo evidencia) ----------
echo -e "\n${CYAN}── Background processes (evidencia) ──"
SCRATCH="${TMPDIR:-/tmp}/hermes/scratch"
if [ -d "$SCRATCH" ]; then
  PIDS=$(find "$SCRATCH" -maxdepth 1 -name 'proc_*_output.txt' 2>/dev/null | head -20 || true)
  if [ -n "$PIDS" ]; then
    INFO "Hay outputs de procesos en segundo plano pendientes de revisión:"
    find "$SCRATCH" -maxdepth 1 -name 'proc_*_output.txt' 2>/dev/null | head -20 | while read -r f; do
      basename "$f"
    done | sed 's/^/    /'
  else
    INFO "No hay outputs de procesos en segundo plano acumulados"
  fi
else
  INFO "Scratch dir no accesible desde este script (se revisará fuera)"
fi

# ---------- 6. LINT SUPERFICIAL (solo donde hay bin) ----------
echo -e "\n${CYAN}── Lint superficial (frontend apps con eslint local) ──"
LINT_TOTAL_FAILS=0
for DIR in apps/admin apps/advertiser apps/driver apps/player; do
  BIN="$ROOT/$DIR/node_modules/.bin/eslint"
  if [ -x "$BIN" ] || [ -f "$BIN" ]; then
    LINT_RC=0
    LINT_OUT=$(timeout 90 bash -lc "cd '$ROOT/$DIR' && '$BIN' . --format json" 2>&1) || LINT_RC=$?
    if [ "$LINT_RC" -eq 0 ]; then
      OK "$DIR: eslint completado (exit 0)"
    else
      FAIL "$DIR: eslint falló (exit $LINT_RC); revisar logs locales protegidos"
      LINT_TOTAL_FAILS=$((LINT_TOTAL_FAILS+1))
    fi
  else
    FAIL "$DIR: eslint no disponible; validación pendiente"
    LINT_TOTAL_FAILS=$((LINT_TOTAL_FAILS+1))
  fi
done

# ---------- 7. TESTS (solo evidencia de runs previos) ----------
echo -e "\n${CYAN}── Test evidence (runs previos, no ejecuta tests ahora) ──"
# Revisar evidencia en scratch si existe
if [ -d "$SCRATCH" ]; then
  for pat in "proc_*_output.txt"; do
    for f in "$SCRATCH"/$pat; do
      [ -f "$f" ] || continue
      basef=$(basename "$f")
      if grep -qE 'Test Suites:|Tests:|ELIFECYCLE|error TS' "$f" 2>/dev/null; then
        INFO "$basef contiene evidencia de ejecución de tests/build"
      fi
    done
  done | head -20 || true
else
  INFO "Scratch no disponible; verificar procesos/outros fuera del script"
fi

# ---------- 8. PRODUCTION CHECKLIST ----------
echo -e "\n${CYAN}── Checklist lista para producción ──${RESET}"
CHECK_PASS=0
CHECK_FAIL=0

if [ "$LINT_TOTAL_FAILS" -gt 0 ]; then
  FAIL "Lint no verificado: $LINT_TOTAL_FAILS portal(es)"
  CHECK_FAIL=$((CHECK_FAIL+1))
fi

if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
  OK "Working tree limpio para commit"
  CHECK_PASS=$((CHECK_PASS+1))
else
  FAIL "Hay cambios sin commitear"
  CHECK_FAIL=$((CHECK_FAIL+1))
fi

if git rev-parse --verify "HEAD" >/dev/null 2>&1; then
  OK "Repo tiene commits"
  CHECK_PASS=$((CHECK_PASS+1))
else
  FAIL "Repo sin commits aún"
  CHECK_FAIL=$((CHECK_FAIL+1))
fi

# Comparar commits, no solo el contenido del árbol. Un commit vacío también
# significa que HEAD no coincide con la referencia local de main.
# Esta comprobación NO sustituye un fetch ni la verificación del remoto real.
MAIN_SHA=$(git rev-parse --verify refs/remotes/origin/main 2>/dev/null || true)
HEAD_SHA=$(git rev-parse --verify HEAD 2>/dev/null || true)
if [ -z "$MAIN_SHA" ] || [ -z "$HEAD_SHA" ]; then
  FAIL "No se pudo verificar HEAD contra origin/main local (fetch requerido)"
  CHECK_FAIL=$((CHECK_FAIL+1))
elif [ "$HEAD_SHA" != "$MAIN_SHA" ]; then
  FAIL "HEAD difiere de origin/main local; comparar y actualizar antes de publicar"
  CHECK_FAIL=$((CHECK_FAIL+1))
else
  OK "HEAD coincide con origin/main local (remoto en vivo no verificado)"
  CHECK_PASS=$((CHECK_PASS+1))
fi

if [ -f apps/api/dist/main.js ]; then
  OK "Artifact de API construido"
  CHECK_PASS=$((CHECK_PASS+1))
else
  FAIL "Artifact de API ausente"
  CHECK_FAIL=$((CHECK_FAIL+1))
fi

if [ -x "$TSC_BIN" ] || [ -f "$TSC_BIN" ]; then
  TSC_FINAL_RC=0
  TSC_FINAL=$(timeout 120 "$TSC_BIN" --noEmit -p apps/api/tsconfig.json 2>&1) || TSC_FINAL_RC=$?
  if [ "$TSC_FINAL_RC" -eq 0 ]; then
    OK "TypeScript sin errores (apps/api)"
    CHECK_PASS=$((CHECK_PASS+1))
  else
    FAIL "TypeScript falló (exit $TSC_FINAL_RC)"
    CHECK_FAIL=$((CHECK_FAIL+1))
  fi
else
  FAIL "TypeScript no disponible: no se pudo verificar"
  CHECK_FAIL=$((CHECK_FAIL+1))
fi

if [ "${BUILD_RC:-1}" -ne 0 ]; then
  FAIL "Build de API no verificado"
  CHECK_FAIL=$((CHECK_FAIL+1))
fi

if [ -d apps/api/node_modules/.bin ] && [ -f apps/api/node_modules/.bin/jest ]; then
  INFO "Jest bin presente en api (verificar runs exitosos fuera de este check)"
else
  WARN "Jest bin ausente en api; los tests unitarios requieren verificación manual"
fi

echo
echo "═══════════════════════════════════════════"
echo -e "  Resultado rápido: ${GREEN}${CHECK_PASS} verificación(es) OK${RESET}, ${RED}${CHECK_FAIL} falla(s)${RESET}"
echo "═══════════════════════════════════════════"

if [ "$CHECK_FAIL" -gt 0 ]; then
  exit 1
fi
