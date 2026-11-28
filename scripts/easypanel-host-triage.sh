#!/bin/sh
# TAD incident #407: READ-ONLY, redacted VPS/EasyPanel triage via provider console.
# Does not print environment, network addresses, Docker service errors or log lines.
set -u
umask 077
export LC_ALL=C

section() { printf '\n== %s ==\n' "$1"; }
run_check() {
  title="$1"
  shift
  section "$title"
  if command -v timeout >/dev/null 2>&1; then
    timeout 6 "$@" 2>/dev/null || printf '[unavailable, permission denied, or timed out]\n'
  else
    "$@" 2>/dev/null || printf '[unavailable or permission denied]\n'
  fi
}

printf 'TAD / EasyPanel host diagnostics (read-only, sanitized)\n'
run_check 'UTC time' date -u '+%Y-%m-%dT%H:%M:%SZ'
run_check 'System uptime and load' uptime
run_check 'Memory and swap (MiB)' free -m
run_check 'Disk capacity' df -Ph / /var/lib/docker
run_check 'Inode capacity' df -Pi / /var/lib/docker
run_check 'Docker daemon state' systemctl is-active docker
run_check 'Docker Swarm state' docker info --format '{{.Swarm.LocalNodeState}}'
run_check 'Service replicas (names and counts only)' docker service ls --format '{{.Name}} {{.Replicas}}'
run_check 'EasyPanel tasks (no errors or logs)' docker service ps easypanel --format '{{.Name}} {{.CurrentState}}'
run_check 'Traefik tasks (no errors or logs)' docker service ps traefik --format '{{.Name}} {{.CurrentState}}'
run_check 'Docker disk summary' docker system df --format '{{.Type}} {{.Size}} {{.Reclaimable}}'

section 'Kernel OOM indicators (count only; last 1000 kernel records)'
if command -v journalctl >/dev/null 2>&1 && command -v grep >/dev/null 2>&1; then
  if command -v timeout >/dev/null 2>&1; then
    count=$(timeout 6 journalctl -k -b -n 1000 --no-pager -o cat 2>/dev/null | grep -Eic 'out of memory|oom-killer|killed process' || true)
  else
    count=$(journalctl -k -b -n 1000 --no-pager -o cat 2>/dev/null | grep -Eic 'out of memory|oom-killer|killed process' || true)
  fi
  case "$count" in
    ''|*[!0-9]*) printf '[unavailable]\n' ;;
    *) printf '%s matches (zero may indicate incomplete logs)\n' "$count" ;;
  esac
else
  printf '[journalctl or grep unavailable]\n'
fi
printf '\nNo containers, volumes, databases, services or images were changed.\n'
