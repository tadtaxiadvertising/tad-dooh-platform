## -------------------------------------------------
## run_all_local.ps1
## Levanta todo el stack local del proyecto tad‑dooh‑platform
## -------------------------------------------------

# ---------- CONFIG ----------
# Cambia estos puertos si ya están ocupados en tu máquina
$apiPort          = 3000
$adminPort        = 3001
$advertiserPort   = 3002
$driverPort       = 3003
$tabletPort       = 8080      # http.server
$simulatorPort    = 3005      # Changed from 3000 to avoid conflict with API

# ---------- PRE‑REQ ----------
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker está disponible"
} else {
    Write-Warning "⚠️ Docker no está instalado o no está en el PATH."
}

# ---------- 1️⃣ INSTALAR DEPENDENCIAS ----------
Write-Host "`n🔧 Instalando dependencias de todo el monorepo..."
npm install

# ---------- 2️⃣ GENERAR CLIENTES PRISMA ----------
Write-Host "`n🗂️ Generando Prisma client para API..."
npx prisma generate --schema=apps/api/prisma/schema.prisma

Write-Host "`n🗂️ Generando Prisma client para el simulador..."
npx prisma generate --schema=apps/tad-simulator/prisma/schema.prisma

# ---------- 3️⃣ INICIAR BASE DE DATOS (Docker) ----------
if (Test-Path ".\docker-compose.yml") {
    Write-Host "`n🐳 Levantando contenedores Docker..."
    docker compose up -d
} else {
    Write-Warning "⚠️ No se encontró docker‑compose.yml."
}

# ---------- 4️⃣ INICIAR SERVICIOS ----------
Write-Host "`n🚀 Iniciando servicios (API:$apiPort, Admin:$adminPort, Adv:$advertiserPort, Driver:$driverPort, Tablet:$tabletPort, Sim:$simulatorPort)..."

Start-Process -FilePath "cmd.exe" -ArgumentList "/k title API (NestJS) & set PORT=$apiPort & npm run dev:backend" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Admin UI & set PORT=$adminPort & npm run dev:admin" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Advertiser UI & set PORT=$advertiserPort & npm run dev:advertiser" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Driver UI & set PORT=$driverPort & npm run dev:driver" -WorkingDirectory "$(Get-Location)"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Tablet Player & cd apps/tablet-player && python -m http.server $tabletPort" -WorkingDirectory "$(Get-Location)"

# Simulator
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title TAD Simulator & set PORT=$simulatorPort & npm run dev:simulator" -WorkingDirectory "$(Get-Location)"

Write-Host "`n✅ Se han abierto nuevas ventanas con los servicios."
Write-Host "`n💡 Revisa las ventanas de consola para ver el progreso de carga."
