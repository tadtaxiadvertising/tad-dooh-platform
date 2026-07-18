@echo off
REM =============================================
REM TAD Remotion Engine - Inicio Rápido (Windows)
REM =============================================
echo.
echo TAD Remotion Engine v1.0.0
echo ===========================
echo.

REM Ir al directorio de la app
cd /d "%~dp0"

REM Verificar que el .env existe
if not exist .env (
    echo [WARN] No se encontro .env, copiando desde .env.example...
    if exist .env.example (
        copy .env.example .env
    )
)

REM Build si es necesario
if not exist dist\index.js (
    echo [INFO] Ejecutando build...
    call npm run build
)

echo [OK] Iniciando servidor en http://localhost:8000
echo.
echo Abre http://localhost:8000 en tu navegador
echo Presiona Ctrl+C para detener
echo.
node dist/index.js

pause