# TAD RBAC QA — Reporte Maestro del Ciclo Autónomo
## Generado: 2026-08-20T21:18:20.798Z

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total pruebas | 27 |
| ✅ PASS | 27 |
| ❌ FAIL | 0 |
| ⏭ SKIP | 0 |
| Tasa de éxito | 100.0% |
| Latencia promedio | 728ms |

### Veredicto: ✅ TODAS LAS PRUEBAS PASARON

---

## Credenciales de Prueba

| Rol | Email | Password | Tabla DB |
|-----|-------|----------|----------|
| Admin | admin@tad.do | TAD-QA-2026! | users |
| Driver | qa-driver@tad.do | TAD-QA-2026! | drivers |
| Advertiser | qa-advertiser@tad.do | TAD-QA-2026! | advertisers |

---

## Resultados por Fase

### Fase 1: PURGA DE DATOS (respetando R8 — sin wallet force-delete)

| Estado | Acción | Detalle | Latencia |
|--------|--------|---------|----------|
| ✅ PASS | Verificar transacciones financieras | 0 transacciones financieras — purga segura. | - |
| ✅ PASS | Eliminar registros padre | antes: users=1 adv=1 drv=1 → después: users=0 adv=0 drv=0 | - |

### Fase 2: SEEDING DE ROLES

| Estado | Acción | Detalle | Latencia |
|--------|--------|---------|----------|
| ✅ PASS | Auth user Admin | admin@tad.do → YA EXISTÍA (95fd1d06-fe1d-43ff-b8ab-ee1716189a1a) | - |
| ✅ PASS | DB record Admin | users → 40a73a59-9f83-48a3-8ef1-b0bff8d6e2ec | - |
| ✅ PASS | Auth user Driver | qa-driver@tad.do → YA EXISTÍA (b3a7c8d1-2e4f-5a6b-9c0d-e1f2a3b4c5d6) | - |
| ✅ PASS | DB record Driver | drivers → 1dfefd24-ed67-4cac-a3ae-b624994dba75 | - |
| ✅ PASS | Auth user Advertiser | qa-advertiser@tad.do → YA EXISTÍA (e8a24bd5-bedc-4ecc-9fea-b3f6104dc794) | - |
| ✅ PASS | DB record Advertiser | advertisers → 62eed5b0-6ed6-4cd7-aa2f-9e1ca6ecef66 | - |
| ✅ PASS | Verificación post-seed | users=1 advertisers=1 drivers=1 | - |

### Fase 3: VERIFICACIÓN RBAC EN BASE DE DATOS

| Estado | Acción | Detalle | Latencia |
|--------|--------|---------|----------|
| ✅ PASS | Admin existe en users | users.id=40a73a59-9f83-48a3-8ef1-b0bff8d6e2ec role=ADMIN email=admin@tad.do | - |
| ✅ PASS | Driver existe en drivers | drivers.id=1dfefd24-ed67-4cac-a3ae-b624994dba75 status=OPERATIVO fullName=QA Driver Test | - |
| ✅ PASS | Advertiser existe en advertisers | advertisers.id=62eed5b0-6ed6-4cd7-aa2f-9e1ca6ecef66 status=ACTIVE companyName=QA Advertiser Audit | - |
| ✅ PASS | Todos los auth users existen | auth.users: [admin@tad.do confirmed=true, qa-advertiser@tad.do confirmed=true, qa-driver@tad.do confirmed=true] | - |
| ✅ PASS | Mapeo rol→tabla correcto | admin→users=true driver→drivers=true advertiser→advertisers=true | - |
| ✅ PASS | Sin contaminación cruzada de roles | admin-in-drivers=false driver-in-users=false | - |

### Fase 4: TEST DE AUTENTICACIÓN (Supabase GoTrue)

| Estado | Acción | Detalle | Latencia |
|--------|--------|---------|----------|
| ✅ PASS | GoTrue Login → Admin | token_sub=ADMIN email=admin@tad.do token_valid=true role_match=true latency=436ms | 436ms |
| ✅ PASS | GoTrue Login → Driver | token_sub=N/A email=qa-driver@tad.do token_valid=true role_match=true latency=242ms | 242ms |
| ✅ PASS | GoTrue Login → Advertiser | token_sub=ADVERTISER email=qa-advertiser@tad.do token_valid=true role_match=true latency=230ms | 230ms |
| ✅ PASS | GoTrue Login → Wrong Password | 400 correctamente rechazado: invalid_credentials | 226ms |

### Fase 5: TEST DE RBAC API (NestJS endpoints)

| Estado | Acción | Detalle | Latencia |
|--------|--------|---------|----------|
| ✅ PASS | API availability check | API disponible en http://localhost:3000/api/v1 | - |
| ✅ PASS | API Login → Admin | role=ADMIN role_match=true | 1138ms |
| ✅ PASS | API Login → Driver | role=DRIVER role_match=true | 1005ms |
| ✅ PASS | API Login → Advertiser | role=ADVERTISER role_match=true | 911ms |
| ✅ PASS | Admin→/drivers | expect=2xx actual=200 | 1564ms |
| ✅ PASS | Admin→/finance/summary | expect=2xx actual=200 | 1925ms |
| ✅ PASS | Advertiser→/drivers (denied) | expect=403 actual=403 | 165ms |
| ✅ PASS | Driver→/finance/summary (denied) | expect=403 actual=403 | 166ms |

---

## Infraestructura

| Componente | Estado |
|------------|--------|
| Supabase Project | ltdcdhqixvbpdcitthqf (us-west-2) |
| API NestJS | ✅ Disponible |
| Prisma ORM | ✅ Conectado |
| GoTrue Auth | ✅ Operativo |

---
_Reporte generado automáticamente por TAD RBAC QA Loop — 2026-08-20T21:18:20.799Z_
