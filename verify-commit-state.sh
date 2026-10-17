#!/usr/bin/env bash
# Verification script: check commit state alignment before and after each task
# Usage: ./verify-commit-state.sh [description]
set -euo pipefail

cd /c/tad-dooh-platform

echo "══════════════════════════════════════════════"
echo "  COMMIT STATE VERIFICATION"
echo "  ${1:-pre-task check}"
echo "══════════════════════════════════════════════"
echo ""

FAILED=0

# 1. Working tree status
echo "── Working Tree ──"
if git status --porcelain | grep -q .; then
    echo "⚠️  UNCLEAN: $(git status --porcelain | wc -l) modified files"
    git status --porcelain | head -10
    FAILED=1
else
    echo "✅ Clean"
fi

# 2. Branch vs origin
echo ""
echo "── Branch Sync ──"
BEHIND=$(git rev-list --left-right --count HEAD...origin/main 2>/dev/null | cut -f1)
AHEAD=$(git rev-list --left-right --count HEAD...origin/main 2>/dev/null | cut -f2)
echo "  Behind origin/main: $BEHIND | Ahead: $AHEAD"
if [ "$BEHIND" -gt 0 ]; then
    echo "⚠️  Branch is $BEHIND commit(s) behind origin/main"
    FAILED=1
fi

# 3. Last commits
echo ""
echo "── Last 5 Commits ──"
git log --oneline -5

# 4. Key files verification
echo ""
echo "── Key Files ──"
# dependabot.yml
if grep -q "open-pull-requests-limit" .github/dependabot.yml 2>/dev/null; then
    echo "✅ .github/dependabot.yml: open-pull-requests-limit present"
else
    echo "❌ .github/dependabot.yml: missing open-pull-requests-limit"
    FAILED=1
fi

# ci.yml summary job
if grep -q "needs\[job\]" .github/workflows/ci.yml 2>/dev/null; then
    echo "✅ .github/workflows/ci.yml: uses needs[job] (no dynamic dot notation)"
else
    echo "❌ .github/workflows/ci.yml: invalid needs.*.result syntax"
    FAILED=1
fi

# package-lock.json vs origin/main
echo ""
echo "── package-lock.json alignment ──"
if git diff --stat origin/main -- package-lock.json | grep -q "^$" 2>/dev/null; then
    echo "✅ package-lock.json in sync with origin/main"
else
    echo "⚠️  package-lock.json differs from origin/main (expected if not merged yet)"
fi

# 5. Summary
echo ""
echo "══════════════════════════════════════════════"
if [ "$FAILED" -eq 0 ]; then
    echo "  ✅ ALL CHECKS PASSED"
else
    echo "  ❌ SOME CHECKS FAILED"
fi
echo "══════════════════════════════════════════════"

exit $FAILED
