@echo off
REM quick-check.cmd — TAD DOOH production readiness spot checks
REM Ejecutar directamente con: cmd /c quick-check.cmd
cd /d "C:\tad-dooh-platform"

echo ============================================================
echo  TAD DOOH — Quick status checks (dist, lockfile, bin)
echo ============================================================
echo.

echo [1] API dist artifact
if exist "apps\api\dist\main.js" (
    echo   OK   apps\api\dist\main.js existe
) else (
    echo   FAIL apps\api\dist\main.js NO existe
)

echo.
echo [2] Lockfile
if exist "pnpm-lock.yaml" (
    for %%A in ("pnpm-lock.yaml") do echo   OK   pnpm-lock.yaml (%%~zA bytes)
) else (
    echo   FAIL pnpm-lock.yaml no encontrado
)

echo.
echo [3] Root node_modules/.bin tools
if exist "node_modules\.bin\tsc" (
    echo   OK   tsc bin existe
) else (
    echo   WARN tsc bin no encontrado en root
)
if exist "node_modules\.bin\eslint" (
    echo   OK   eslint bin existe
) else (
    echo   WARN eslint bin no encontrado en root
)
if exist "node_modules\.bin\jest" (
    echo   OK   jest bin existe
) else (
    echo   WARN jest bin no encontrado en root
)

echo.
echo [4] API node_modules jest/ts-jest
if exist "apps\api\node_modules\jest" (
    echo   OK   apps/api/node_modules/jest existe
) else (
    echo   WARN apps/api/node_modules/jest NO existe
)
if exist "apps\api\node_modules\ts-jest" (
    echo   OK   apps/api/node_modules/ts-jest existe
) else (
    echo   WARN apps/api/node_modules/ts-jest NO existe
)

echo.
echo [5] Driver eslint.config.mjs
if exist "apps\driver\eslint.config.mjs" (
    echo   OK   apps/driver/eslint.config.mjs existe
) else (
    echo   FAIL apps/driver/eslint.config.mjs NO existe
)

echo.
echo ============================================================
echo  Finished quick-check
echo ============================================================
