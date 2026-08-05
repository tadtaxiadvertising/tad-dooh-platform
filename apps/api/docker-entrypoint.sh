#!/bin/sh
set -e
echo "[entrypoint] Starting tad-api"
exec node dist/main.js