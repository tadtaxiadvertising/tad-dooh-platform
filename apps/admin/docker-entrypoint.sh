#!/bin/sh
set -e

# Si el CMD arranca con exec, la shell muere limpiamente y Node recibe señales
exec "$@"