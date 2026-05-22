## -------------------------------------------------
## run_all_local.ps1
## Levanta todo el stack local del proyecto tad-dooh-platform
## -------------------------------------------------

# ---------- CONFIG ----------
$apiPort          = 3000
$adminPort        = 3001
$advertiserPort   = 3002
$driverPort       = 3003
$tabletPort       = 8080
$simulatorPort    = 3005

# ---------- PRE-REQ ----------
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker esta disponible"
} else {
    Write-Warning "Docker no esta instalado o no esta en el PATH."
}

# ---------- 1 INSTALAR DEPENDENCIAS ----------
Write-Host "Instalando dependencias de todo el monorepo..."
npm install

# ---------- 2 GENERAR CLIENTES PRISMA ----------
Write-Host "Generando Prisma client para API..."
npx prisma generate --schema=apps/api/prisma/schema.prisma

Write-Host "Generando Prisma client para el simulador..."
npx prisma generate --schema=apps/tad-simulator/prisma/schema.prisma

# ---------- 3 INICIAR BASE DE DATOS (Docker) ----------
if (Test-Path ".\docker-compose.yml") {
    Write-Host "Levantando contenedores Docker..."
    docker compose up -d
} else {
    Write-Warning "No se encontro docker-compose.yml."
}

# ---------- 4 INICIAR SERVICIOS ----------
Write-Host "Iniciando servicios (API:$apiPort, Admin:$adminPort, Adv:$advertiserPort, Driver:$driverPort, Tablet:$tabletPort, Sim:$simulatorPort)..."

Start-Process -FilePath "cmd.exe" -ArgumentList "/k title API (NestJS) & set PORT=$apiPort & npm run dev:backend" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Admin UI & set PORT=$adminPort & npm run dev:admin" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Advertiser UI & set PORT=$advertiserPort & npm run dev:advertiser" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Driver UI & set PORT=$driverPort & npm run dev:driver" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Tablet Player & cd apps/tablet-player && python -m http.server $tabletPort" -WorkingDirectory "$(Get-Location)"

# Simulator
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title TAD Simulator & set PORT=$simulatorPort & npm run dev:simulator" -WorkingDirectory "$(Get-Location)"

Write-Host "[OK] Se han abierto nuevas ventanas con los servicios."
Write-Host "[INFO] Revisa las ventanas de consola para ver el progreso de carga."
