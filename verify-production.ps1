#!/usr/bin/env pwsh
# Verification Script - TAD DOOH Platform Production Readiness
# Verifies all legal pages, permissions, and configuration changes

Write-Host "=" * 70
Write-Host "TAD DOOH PLATFORM - PRODUCTION READINESS VERIFICATION"
Write-Host "=" * 70
Write-Host ""

$errors = 0
$warnings = 0

# 1. Verificar archivos .env actualizados
Write-Host "1. Verificando archivos .env..." -ForegroundColor Cyan

$envFiles = @(
    "C:\tad-dooh-platform\apps\advertiser\.env",
    "C:\tad-dooh-platform\apps\admin\.env", 
    "C:\tad-dooh-platform\apps\driver\.env"
)

foreach ($envFile in $envFiles) {
    $fileName = Split-Path $envFile -Leaf
    $content = Get-Content $envFile -Raw
    $hasNewUrl = $content -match "tad-api.tadprod.ibusiness.com.do"
    $hasNewSupabase = $content -match "tockqchhrzkopvjncdaj"
    $hasOldUrl = $content -match "tad-api.proyecto_ia.ibusiness.com.do"
    $hasOldSupabase = $content -match "ltdcdhqixvbpdcitthqf"
    
    Write-Host "   $fileName:" -ForegroundColor Gray
    if ($hasNewUrl -and $hasNewSupabase) {
        Write-Host "     URLs actualizadas a tadprod" -ForegroundColor Green
    } elseif ($hasOldUrl -or $hasOldSupabase) {
        Write-Host "     AÚN TIENEN URLs viejas" -ForegroundColor Red
        $errors++
    } else {
        Write-Host "     Estado desconocido" -ForegroundColor Yellow
        $warnings++
    }
}

Write-Host ""

# 2. Verificar next.config.ts/JS
Write-Host "2. Verificando next.config.ts/JS..." -ForegroundColor Cyan

$adminConfig = Get-Content "C:\tad-dooh-platform\apps\admin\next.config.ts" -Raw
$hasNewBackend = $adminConfig -match "tad-api.tadprod.ibusiness.com.do"

$advertiserConfig = Get-Content "C:\tad-dooh-platform\apps\advertiser\next.config.js" -Raw
$hasAdRedirectNew = $advertiserConfig -match "tad-admin.tadprod.ibusiness.com.do"

$driverConfig = Get-Content "C:\tad-dooh-platform\apps\driver\next.config.ts" -Raw
$hasDriverRedirectNew = $driverConfig -match "tad-admin.tadprod.ibusiness.com.do"

Write-Host "   Admin next.config.ts:" -ForegroundColor Gray
if ($hasNewBackend) { Write-Host "     Backend URL actualizada" -ForegroundColor Green } else { Write-Host "     URL vieja o faltante" -ForegroundColor Red; $errors++ }

Write-Host "   Advertiser next.config.js:" -ForegroundColor Gray
if ($hasAdRedirectNew) { Write-Host "     Redirect actualizado" -ForegroundColor Green } else { Write-Host "     Redirect viejo o faltante" -ForegroundColor Red; $errors++ }

Write-Host "   Driver next.config.ts:" -ForegroundColor Gray
if ($hasDriverRedirectNew) { Write-Host "     Redirect actualizado" -ForegroundColor Green } else { Write-Host "     Redirect viejo o faltante" -ForegroundColor Red; $errors++ }

Write-Host ""

# 3. Verificar permisos matrix en privacy policies
Write-Host "3. Verificando permisos matrix en Privacy Policies..." -ForegroundColor Cyan

$privacyFiles = @(
    "C:\tad-dooh-platform\apps\advertiser\pages\politica-de-privacidad.tsx",
    "C:\tad-dooh-platform\apps\admin\pages\politica-de-privacidad.tsx", 
    "C:\tad-dooh-platform\apps\driver\pages\politica-de-privacidad.tsx"
)

foreach ($pf in $privacyFiles) {
    $fileName = Split-Path $pf -Leaf
    $hasMatrix = (Get-Content $pf -Raw) -match "Matriz de permisos"
    Write-Host "   $fileName:" -ForegroundColor Gray
    if ($hasMatrix) {
        Write-Host "     Sección Matriz de permisos presente" -ForegroundColor Green
    } else {
        Write-Host "     Sección Matriz de permisos AUSente" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""

# 4. Verificar tables de categorías en cookie policies
Write-Host "4. Verificando tables de categorías en Cookie Policies..." -ForegroundColor Cyan

$cookieFiles = @(
    "C:\tad-dooh-platform\apps\advertiser\pages\politica-de-cookies.tsx",
    "C:\tad-dooh-platform\apps\admin\pages\politica-de-cookies.tsx",
    "C:\tad-dooh-platform\apps\driver\pages\politica-de-cookies.tsx"
)

foreach ($cf in $cookieFiles) {
    $fileName = Split-Path $cf -Leaf
    $content = Get-Content $cf -Raw
    $hasAppCategories = $content -match "Aplicaciones"
    $hasEstrictas = $content -match "Estrictamente necesarias"
    $hasTypesTable = $content -match "Tipo.*Propósito.*Duración"
    
    Write-Host "   $fileName:" -ForegroundColor Gray
    $status = ""
    if ($hasAppCategories) { $status += "App-categories " } else { $status += "Sin app-categories "; $errors++ }
    if ($hasEstrictas) { $status += "Estrictas " } else { $status += "Sin Estrictas "; $errors++ }
    if ($hasTypesTable) { $status += "Types table " } else { $status += "Sin types table "; $errors++ }
    Write-Host "     $status" -ForegroundColor If ($status -notlike "*Sin*" {Green} {Red})
}

Write-Host ""

# 5. Verificar LegalLayout components
Write-Host "5. Verificando LegalLayout y componentes..." -ForegroundColor Cyan

$legalComponents = @(
    "C:\tad-dooh-platform\packages\uI\components\LegalLayout.tsx",
    "C:\tad-dooh-platform\packages\uI\components\LegalTable.tsx",
    "C:\tad-dooh-platform\packages\uI\components\LegalCallout.tsx"
)

foreach ($lc in $legalComponents) {
    $fileName = Split-Path $lc -Leaf
    $hasLegalTable = (Get-Content $lc -Raw) -match "LegalTable"
    $hasLegalCallout = (Get-Content $lc -Raw) -match "LegalCallout"
    Write-Host "   $fileName:" -ForegroundColor Gray
    $status = ""
    if ($hasLegalTable) { $status += "LegalTable " } else { $status += "Sin LegalTable "; $errors++ }
    if ($hasLegalCallout) { $status += "LegalCallout " } else { $status += "Sin LegalCallout "; $errors++ }
    Write-Host "     $status" -ForegroundColor If ($status -notlike "*Sin*" {Green} {Red})
}

Write-Host ""

# 6. Verificar permisos matrix file
Write-Host "6. Verificando permisos-matrix.ts..." -ForegroundColor Cyan

$matrixFile = "C:\tad-dooh-platform\packages\permissions\permissions-matrix.ts"
if (Test-Path $matrixFile) {
    $hasCategories = (Get-Content $matrixFile -Raw) -match "DATA_CATEGORIES"
    $hasAppPermissions = (Get-Content $matrixFile -Raw) -match "APP_PERMISSIONS"
    $hasConsentRequirements = (Get-Content $matrixFile -Raw) -match "CONSENT_REQUIREMENTS"
    
    Write-Host "   permissions-matrix.ts:" -ForegroundColor Gray
    $status = ""
    if ($hasCategories) { $status += "DATA_CATEGORIES " } else { $status += "Sin DATA_CATEGORIES "; $errors++ }
    if ($hasAppPermissions) { $status += "APP_PERMISSIONS " } else { $status += "Sin APP_PERMISSIONS "; $errors++ }
    if ($hasConsentRequirements) { $status += "CONSENT_REQUIREMENTS " } else { $status += "Sin CONSENT_REQUIREMENTS "; $errors++ }
    Write-Host "     $status" -ForegroundColor If ($status -notlike "*Sin*" {Green} {Red})
} else {
    Write-Host "   permissions-matrix.ts: Archivo no encontrado" -ForegroundColor Red
    $errors++
}

Write-Host ""

# 7. Verificar Google OAuth redirect URI
Write-Host "7. Verificando Google OAuth redirect URI..." -ForegroundColor Cyan
Write-Host "   Requiere verificación manual en Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   - Ir a Authentication > Providers > Google" -ForegroundColor Gray
Write-Host "   - Verificar: https://tockqchhrzkopvjncdaj.supabase.co/auth/v1/callback" -ForegroundColor Gray

Write-Host ""

# Resumen final
Write-Host "=" * 70
Write-Host "RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host "Errores críticos: $errors" -ForegroundColor If ($errors -gt 0 {Red} {Green})
Write-Host "Advertencias: $warnings" -ForegroundColor Yellow
Write-Host ""

if ($errors -eq 0) {
    Write-Host "PLATFORMA LISTA PARA PRODUCCIÓN" -ForegroundColor Green
    Write-Host "   Todos los checked pasaron satisfactoriamente." -ForegroundColor Green
} elseif ($errors -le 3) {
    Write-Host "PLATFORMA CERTAINMENTE LISTA - Revisar errores menores" -ForegroundColor Yellow
    Write-Host "   Se pueden corregir antes del lanzamiento." -ForegroundColor Yellow
} else {
    Write-Host "PLATFORMA NO LISTA - Requerir correcciones críticas" -ForegroundColor Red
    Write-Host "   No proceder con el lanzamiento hasta resolver los errores." -ForegroundColor Red
}

Write-Host ""
Write-Host "Próximos pasos críticos:" -ForegroundColor Cyan
Write-Host "1. Configurar Google OAuth en Supabase project tockqchhrzkopvjncdaj" -ForegroundColor Gray
Write-Host "2. Ejecutar primer despliegue de prueba en Easypanel" -ForegroundColor Gray
Write-Host "3. Verificar sign-in Google en los 3 roles (admin, advertiser, driver)" -ForegroundColor Gray
Write-Host "3. Implementar banner de consentimiento de cookies si no está hecho" -ForegroundColor Gray