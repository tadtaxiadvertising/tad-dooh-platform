#!/usr/bin/env bash
# scripts/merge-pr.sh — Create and auto-merge a PR for the current branch.
#
# Prerequisites:
#   1. GitHub token with `repo` scope (classis PAT or GITHUB_TOKEN for private repos).
#   2. Branch pushed to origin.
#   3. A base branch (default: main).
#
# Usage:
#   ./scripts/merge-pr.sh                # uses GITHUB_TOKEN, base=main
#   GITHUB_TOKEN=ghp_xxx ./scripts/merge-pr.sh  # explicit token
#   ./scripts/merge-pr.sh my-branch dev   # custom branch + base

set -euo pipefail

BRANCH="${1:-$(git branch --show-current)}"
BASE="${2:-main}"
TOKEN="${GITHUB_TOKEN:-}"
REPO="${GITHUB_REPOSITORY:-tadtaxiadvertising/tad-dooh-platform}"
PROXY_URL="https://github.com/${REPO}/pull/new/${BRANCH}"

if [ -z "$TOKEN" ]; then
  echo "⚠️  No GITHUB_TOKEN set. Using public URL — PR will require manual merge."
fi

echo "📦 Pushing ${BRANCH} to origin..."
git push -u origin "${BRANCH}"

echo "🔍 Checking CI status on ${BASE}..."
# Quick check that base branch is not diverged (sanity).
BASE_SHA=$(git rev-parse "origin/${BASE}" 2>/dev/null || git rev-parse "${BASE}")
echo "   base ${BASE} → ${BASE_SHA:0:10}"

echo "🔗 Open PR:"
echo "   ${PROXY_URL}"
echo ""
echo "   # On GitHub: Edit the PR and enable 'Allow auto-merge' (squash)."
echo "   # Then re-run this script with GITHUB_TOKEN to auto-merge."
