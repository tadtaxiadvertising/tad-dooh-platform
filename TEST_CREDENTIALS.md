# 🧪 Test Credentials - TAD DOOH Platform

Credenciales para probar cada servicio de la plataforma TAD DOOH.

---

## 🔐 Credenciales por Rol

### Admin Console (`admin.tad.do`)

```
Email:    admin@tad.do
Password: TadAdmin2026!
Role:     ADMIN
```

**Permisos:**
- ✅ Gestión de campañas
- ✅ Control de dispositivos (fleet management)
- ✅ Analytics completo
- ✅ Gestión de usuarios y financiera

---

### Driver App (`driver.tad.do`)

```
Email:    driver@tad.do
Password: TadDriver2026!
Role:     DRIVER
```

**Permisos:**
- ✅ Ver dispositivos asignados
- ✅ Monitoreo GPS
- ✅ Historial de campañas
- ✅ Comisiones y pagos

---

### Advertiser Dashboard (`advertiser.tad.do`)

```
Email:    advertiser@tad.do
Password: TadAdvertiser2026!
Role:     ADVERTISER
```

**Permisos:**
- ✅ Crear y gestionar campañas
- ✅ Analytics de campañas
- ✅ Gestión de medios (videos, imágenes)
- ✅ Reportes de ROI

---

## 🔧 Variables de Entorno para Testing

### `.env.local` (Desarrollo)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=https://ltdcdhqixvbpdcitthqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Testing
TEST_ADMIN_EMAIL=admin@tad.do
TEST_ADMIN_PASSWORD=TadAdmin2026!
TEST_DRIVER_EMAIL=driver@tad.do
TEST_DRIVER_PASSWORD=TadDriver2026!

# Logging
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_LOG_PERSISTENCE=true
```

### `.env.test` (Playwright E2E)

```env
# Test User Credentials
TEST_ADMIN_EMAIL=admin@tad.do
TEST_ADMIN_PASSWORD=TadAdmin2026!
TEST_DRIVER_EMAIL=driver@tad.do
TEST_DRIVER_PASSWORD=TadDriver2026!

# Supabase Mock Tokens
TEST_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TEST_REFRESH_TOKEN=mock-refresh-token-for-dev

# Test Configuration
BASE_URL=http://localhost:3001
HEADLESS=true
SLOW_MO=0
```

---

## 🚀 Cómo Usar las Credenciales

### En Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local
cp .env.example .env.local
# Editar con las credenciales arriba

# 3. Ejecutar servidor
npm run dev

# 4. Ir a http://localhost:3001
# 5. Login con las credenciales
```

### En E2E Tests (Playwright)

```bash
# Ejecutar tests
npm run test:e2e

# Tests específicos
npm run test:e2e -- --grep "admin"

# Con UI
npm run test:e2e -- --ui
```

### En Producción (Staging)

```bash
# Credenciales en EasyPanel:
# Settings → Environment Variables

TEST_ADMIN_EMAIL=admin@tad.do
TEST_ADMIN_PASSWORD=TadAdmin2026!
# ... (resto de variables)
```

---

## 🧪 Inyección de Sesión para Testing

Si necesitas skipear el login en tests, usa el helper:

```typescript
import { injectSupabaseSession } from '@tests/e2e/helpers/auth.helper';

test('Dashboard loads with pre-authenticated session', async ({ page }) => {
  // Inyectar sesión en localStorage
  await injectSupabaseSession(page);
  
  // Navegar al dashboard
  await page.goto('/admin/dashboard');
  
  // Dashboard ya está autenticado
  await expect(page).toContainText('Welcome, Admin');
});
```

---

## 🔍 Verificación de Credenciales

### Endpoint de Verificación

```bash
# Verificar si las credenciales son válidas
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tad.do",
    "password": "TadAdmin2026!"
  }'

# Respuesta esperada (200 OK):
# { "valid": true, "role": "ADMIN", "token": "..." }
```

### Verificar Token JWT

```bash
# Decodificar JWT (online: jwt.io)
# Token contiene:
{
  "sub": "user-uuid",
  "email": "admin@tad.do",
  "app_metadata": {
    "role": "ADMIN"
  },
  "iat": 1703001234,
  "exp": 1703087634
}
```

---

## 🔄 Roles y Permisos

### ADMIN Role

| Recurso | Permiso |
|---------|----------|
| Campaigns | CRUD (Create, Read, Update, Delete) |
| Devices | Read, Update status |
| Analytics | Full access |
| Users | Manage |
| Billing | Full access |
| Settings | Full access |

### DRIVER Role

| Recurso | Permiso |
|---------|----------|
| Campaigns | Read only |
| Devices | Read (assigned only) |
| Analytics | Limited (own device) |
| Billing | Read only (own commissions) |

### ADVERTISER Role

| Recurso | Permiso |
|---------|----------|
| Campaigns | CRUD (own only) |
| Devices | Read (assigned) |
| Analytics | Read (own campaigns) |
| Billing | Read (own invoices) |

---

## 🐛 Troubleshooting

### Credenciales Rechazadas

```bash
# 1. Verificar que Supabase está funcionando
curl https://ltdcdhqixvbpdcitthqf.supabase.co/rest/v1/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Limpiar localStorage
localStorage.clear();

# 3. Reintentar login
```

### Token Expirado

```bash
# El token expira cada 1 hora
# Para refrescarlo automáticamente:
// En _app.tsx:
useEffect(() => {
  const interval = setInterval(async () => {
    await supabase.auth.refreshSession();
  }, 50 * 60 * 1000); // Cada 50 minutos
  
  return () => clearInterval(interval);
}, []);
```

### Sesión No Persiste

```bash
# Supabase debería guardar en localStorage
# Si no funciona:
const { data } = await supabase.auth.getSession();
console.log('Current session:', data.session);

# Si está null, re-login
```

---

## 📋 Checklist de Testing

- [ ] Admin login funciona
- [ ] Driver login funciona
- [ ] Advertiser login funciona
- [ ] Dashboard carga sin errores
- [ ] Analytics muestra datos
- [ ] Crear campaña funciona
- [ ] Upload de medios funciona
- [ ] GPS tracking en tiempo real
- [ ] Comisiones se calculan correctamente
- [ ] Logout funciona

---

## 🔒 Seguridad en Testing

⚠️ **IMPORTANTE:**
- ✅ Estas son credenciales de **TESTING SOLAMENTE**
- ✅ Nunca compartas en pública
- ❌ No usar en producción
- ❌ Las contraseñas son ficticias y no funcionan en producción
- ✅ Cambia en producción a credenciales reales

---

## 📞 Referencias

- [apps/admin/tests/e2e/helpers/auth.helper.ts](../apps/admin/tests/e2e/helpers/auth.helper.ts) - Funciones de login
- [apps/api/seed_testing.js](../apps/api/seed_testing.js) - Datos de seed
- [LOGGING_AND_PERFORMANCE.md](./LOGGING_AND_PERFORMANCE.md) - Sistema de logging mejorado

---

**Última actualización:** 22 de Abril, 2026  
**Testing Environment:** Development (localhost:3000-3001)
