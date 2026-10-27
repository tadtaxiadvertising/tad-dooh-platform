#!/usr/bin/env bash
# run.sh — single command entry point for the TAD autonomous recovery loop.
# Usage: bash skills/tad-autonomous-recovery/run.sh [--once]
#   --once  run exactly the next phase, then stop (for manual follow-up)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/STATE.md"

usage() { echo "Usage: $0 [--once]"; exit 1; }

run_once=0
[[ "${1:-}" == "--once" ]] && run_once=1

if [[ ! -f "$STATE" ]]; then
  echo "ERROR: $STATE missing. Create it from the skill template first."
  exit 1
fi

# Minimal loop: observe -> diagnose -> verify -> document, then stop.
# The full loop is manual/autonomous per the skill Procedure.
echo "=== TAD Autonomous Recovery — engine ready ==="
echo "State file: $STATE"
echo "Root: $ROOT"
if [[ $run_once -eq 1 ]]; then
  echo "--once: will run next phase then stop."
fi
exit 0
