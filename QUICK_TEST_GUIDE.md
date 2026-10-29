# 🚀 Quick Testing Guide - TAD DOOH Platform

Guía rápida para probar todos los servicios y validar que funcionan correctamente.

---

## ⚡ Test Rápido (5 minutos)

### 1. Login en Admin

```
URL: http://localhost:3001/login
Email: variable `TEST_ADMIN_EMAIL`
Password: variable `TEST_ADMIN_PASSWORD`
```

**Verificar:**
- ✅ Login sin splash screen
- ✅ Redirección inmediata al dashboard
- ✅ Dashboard carga sin errores

### 2. Validar Loading Performance

```bash
# En consola del navegador:
# Ver los últimos logs
logger.getLogs().slice(-20)

# Ver logs de performance
logger.getLogs().filter(log => log.performanceMs)

# Exportar para análisis
copy(logger.exportLogs())
```

### 3. Verificar Credenciales Funcionan

```bash
# Terminal:
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_ADMIN_EMAIL}\",\"password\":\"${TEST_ADMIN_PASSWORD}\"}"

# Esperado:
# { "valid": true, "role": "ADMIN", "token": "eyJ..." }
```

---

## 📋 Checklist de Testing Completo

### Admin Console

- [ ] **Login**
  - [ ] Configurar `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD` fuera del repositorio
  - [ ] Sin splash screen (redirección inmediata)
  - [ ] Dashboard carga correctamente

- [ ] **Dashboard**
  - [ ] Muestra estadísticas
  - [ ] Gráficos cargan
  - [ ] No hay errores en consola

- [ ] **Campaña**
  - [ ] Crear campaña
  - [ ] Editar campaña
  - [ ] Eliminar campaña

### Driver App

- [ ] **Login**
  - [ ] Configurar `TEST_DRIVER_EMAIL` y `TEST_DRIVER_PASSWORD` fuera del repositorio
  - [ ] Muestra dispositivos asignados

- [ ] **GPS/Mapa**
  - [ ] Mapa carga
  - [ ] Ubicación actualiza en tiempo real
  - [ ] Historial disponible

### Advertiser Dashboard

- [ ] **Login**
  - [ ] Configurar `TEST_ADVERTISER_EMAIL` y `TEST_ADVERTISER_PASSWORD` fuera del repositorio
  - [ ] Muestra campañas

- [ ] **Crear Campaña**
  - [ ] Carga editor
  - [ ] Upload de medios
  - [ ] Seleccionar dispositivos target
  - [ ] Guardar campaña

---

## 🐛 Debugging

### Si el login falla

```bash
# 1. Verificar que Supabase está funcionando
curl https://ltdcdhqixvbpdcitthqf.supabase.co/rest/v1/

# 2. Limpiar localStorage
localStorage.clear()

# 3. Verificar que las credenciales son correctas
# Ver TEST_CREDENTIALS.md
```

### Si hay splash screen

```bash
# 1. Verificar que middleware está actualizado
# File: apps/admin/middleware.ts
# Debe redirigir inmediatamente desde /

# 2. Verificar que pages/index.tsx devuelve null
# No debe renderizar UI alguna

# 3. Purgar caché del navegador
Ctrl+Shift+Delete (Windows) o Cmd+Shift+Delete (Mac)
```

### Si el logging no funciona

```bash
# 1. Verificar env variables
echo $NEXT_PUBLIC_LOG_LEVEL
echo $NEXT_PUBLIC_LOG_PERSISTENCE

# 2. En consola:
window.logger // Debe existir

# 3. Si es null, revisar que el archivo está siendo importado
// En _app.tsx:
import { logger } from '@libs/logging/logger';
```

---

## 🎯 Casos de Uso

### Testing de Campaña Completa

```
1. Admin crea campaña
2. Asigna a dispositivos
3. Driver ve campaña en su app
4. Tabletinador reproduce
5. Analytics registra impresión
```

### Testing de Finanzas V12

```
1. Admin asigna 3 campañas a un dispositivo.
2. Sistema calcula balance: 3 campañas × RD$500 = RD$1,500.
3. Driver ve RD$1,500 en su "Total Earnings".
4. Driver refiere a un anunciante: +RD$500.
5. Balance final: RD$2,000.
```

---

## 📊 Performance Targets

| Métrica | Target | Actual |
|---------|--------|--------|
| First Paint | < 1s | ? |
| Dashboard Load | < 2s | ? |
| Campaign Create | < 3s | ? |
| Login → Dashboard | < 1.5s | ? |
| API Response | < 500ms | ? |

**Medir:**
```bash
# En consola:
performance.getEntriesByType('navigation')[0]

# O usar logger:
logger.perfAsync('Dashboard', async () => {
  // tu código aquí
}, 'mi-operacion')
```

---

## 🔄 Comandos Útiles

### Reiniciar Servicios

```bash
# Terminal 1: Backend
cd apps/api
npm run dev

# Terminal 2: Admin
cd apps/admin
npm run dev

# Terminal 3: E2E Tests
npm run test:e2e -- --watch
```

### Limpiar Todo

```bash
# Borrar cache y logs
npm run clean

# Reinstalar dependencias
npm install --force

# Seed data de nuevo
npm run seed:dev
```

### Verificar Salud

```bash
# API health
curl http://localhost:3000/health

# Database
curl http://localhost:3000/api/health

# Frontend
curl http://localhost:3001
```

---

## 📱 Testing en Mobile

```bash
# Ver en tablet/mobile
# 1. Encuentra tu IP local
ipconfig getifaddr en0  # Mac
ipconfig             # Windows

# 2. Abre en dispositivo
http://[TU_IP]:3001

# 3. Login con las credenciales E2E inyectadas mediante variables de entorno
```

---

## 🎬 Video Test Scenario

**Duración:** ~5 minutos

1. Abrir <http://localhost:3001>
2. Ver redirección inmediata (sin splash)
3. Login con <admin@tad.do>
4. Esperar 2 segundos
5. Verificar "Welcome, Admin"
6. Navegar a Campañas
7. Crear campaña nueva
8. Guardar
9. Logout
10. ✅ Todo funciona

---

## 📞 Si Algo Falla

### Step 1: Recolectar Info

```javascript
// En consola del navegador:
{
  logs: logger?.getLogs().slice(-50),
  env: {
    logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  },
  localStorage: JSON.parse(localStorage.getItem('debug') || '{}'),
  userAgent: navigator.userAgent,
}
```

### Step 2: Revisar Docs

- [TEST_CREDENTIALS.md](TEST_CREDENTIALS.md) - Credenciales por servicio
- [LOGGING_AND_PERFORMANCE.md](LOGGING_AND_PERFORMANCE.md) - Sistema de logging
- [docs/DEPLOY_EASYPANEL.md](docs/DEPLOY_EASYPANEL.md) - Deploy troubleshooting

### Step 3: Reportar

```markdown
**Problema:** [Describir qué no funciona]
**Pasos para reproducir:**
1. ...
2. ...

**Logs:**
[Copiar output de logger.getLogs()]

**Esperado:**
[Qué debería pasar]

**Actual:**
[Qué pasa en realidad]
```

---

**Última actualización:** 22 de Abril, 2026  
**Testing Environment:** Development (localhost)
