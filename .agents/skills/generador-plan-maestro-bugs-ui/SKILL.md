---
name: generador-plan-maestro-bugs-ui
description: >
  Proporciona un plan maestro estructurado en 7 secciones para diagnosticar y corregir
  bugs críticos de ciclo de vida y renderizado UI en portales V12. Soluciona bucles
  infinitos de onboarding (Advertiser / Driver) y renderizado duplicado de navegación
  en Advertiser, garantizando cumplimiento de la regla R1 (Offline-First) y RBAC.
---

# Plan Maestro — Diagnóstico y Resolución de Bugs UI Recurrentes (V12 Portals)

> **Audiencia**: Agente implementador autónomo y equipo de QA.
> **Objetivo**: Diagnosticar y corregir bugs de estado y layout **sin romper la arquitectura offline-first (R1), sin cruzar contextos RBAC (R9), y sin provocar pantallas en blanco o regresiones visuales**.

---

## 0 — Contexto de Arquitectura y Stack (NO OMITIR)

| App | Router | Puerto | Ruta base | Rol / Tipo |
|-----|--------|--------|-----------|------------|
| `apps/admin` | **Pages Router** (Next.js 15) | `3002` | `/` | Portal Operativo Central |
| `apps/driver` | **Pages Router** (Next.js 15) | `3004` | `/driver/` | PWA Offline-First (Conductores) |
| `apps/advertiser` | **Pages Router** + Stub App Router | `3000` | `/advertiser/` | Portal Autoservicio Anunciantes |

### Stack de Presentación e Hidratación

- **Framework**: Next.js 15 + React 19.
- **Tailwind CSS 4**: Configuración declarativa vía `@theme` en `globals.css`. **PROHIBIDO** crear o modificar `tailwind.config.js` / `tailwind.config.ts`.
- **Estética & Layout**: Glassmorphism + Amarillo TAD `#FFD400` / `#FFD700` como acento primario.
- **Componentes Compartidos**: Paquete `@tad/ui` (`<Layout>`, `<AuthProvider>`, `<PaymentLockOverlay>`, `<CookieBanner>`).
- **Iconografía**: Exclusivamente **Lucide React**.

### Estrategia Offline-First (Regla R1 — Portal Driver)

- `useDriverHub()` utiliza caché en `localStorage` con clave `TAD_DRIVER_HUB_CACHE`.
- React Query configurado con `PersistQueryClientProvider` + `createSyncStoragePersister` (24 h `gcTime`).
- **REGLA R1 MANDATORIA**: Toda decisión de estado/onboarding debe leer `localStorage` / caché local **ANTES** de realizar peticiones remotas al backend.

---

## 1 — Diagnóstico de Componentes: Menú Duplicado en Portal Advertiser

### 1.1 Root-Cause: Doble Montaje de `<Layout>` (`_app.tsx` vs `AdvertiserLayout.tsx`)

**Mecanismo del Fallo**:
El menú lateral/bottom-nav se renderiza dos veces en la interfaz debido a un envoltorio redundante en dos niveles del árbol de componentes React:

1. Level 1 (`apps/advertiser/pages/_app.tsx`):
   ```tsx
   // AppWrapper envuelve TODAS las rutas privadas en <Layout> de @tad/ui
   return (
     <AuthProvider>
       <Layout>{content}</Layout>
     </AuthProvider>
   );
   ```
2. Level 2 (`apps/advertiser/components/layout/AdvertiserLayout.tsx`):
   ```tsx
   // AdvertiserLayout re-envuelve {children} dentro de otro <Layout>
   export function AdvertiserLayout({ title, subtitle, children }: AdvertiserLayoutProps) {
     return (
       <Layout>
         {/* Fondo visual y encabezados */}
         {children}
       </Layout>
     );
   }
   ```
3. Level 3 (Vistas en `apps/advertiser/pages/advertiser/*.tsx`):
   Cada vista (`dashboard.tsx`, `campaigns.tsx`, `media.tsx`, `reports.tsx`, etc.) importa y utiliza `<AdvertiserLayout>`. Esto genera la jerarquía de doble renderizado:
   `_app (_AppWrapper) -> <Layout> -> <AdvertiserLayout> -> <Layout> (DUPLICADO)`.

### 1.2 Auditoría de Estructura de Rutas y App Router Stub

- `apps/advertiser/app/layout.tsx`: Stub de Next.js 15 App Router conteniendo `<html>` y `<body>`.
- `apps/advertiser/pages/_document.tsx`: Manejador del documento HTML del Pages Router.
- **Instrucción de Control**: Confirmar que no existan envoltorios de navegación dentro de `app/layout.tsx`. Las rutas operativas reales residen en `pages/advertiser/`.

### 1.3 Protocolo de Corrección (Solución Arquitectónica)

```typescript
// REGLA: El componente <Layout> de @tad/ui DEBE montarse exactamente UNA VEZ.

// OPCIÓN A (RECOMENDADA): Desacoplar <Layout> de AdvertiserLayout.tsx
// En AdvertiserLayout.tsx: Eliminar la envoltura <Layout> y retornar fragmento container:
export function AdvertiserLayout({ title, subtitle, children }: AdvertiserLayoutProps) {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-40">
        <CityMapBackdrop />
      </div>
      {(title || subtitle) && (
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
            {title} {subtitle && <span className="text-[#FFD400]">{subtitle}</span>}
          </h1>
        </div>
      )}
      {children}
    </>
  );
}

// OPCIÓN B: Remover <Layout> de _app.tsx para rutas de advertiser y delegarlo a AdvertiserLayout.tsx.
```

---

## 2 — Diagnóstico de Estado: Bucle Infinito de Onboarding (Advertiser & Driver)

### 2.1 Portal Advertiser (`apps/advertiser/`) — Repetición del Wizard

**Archivos Intervenidos**:
- `apps/advertiser/pages/advertiser/dashboard.tsx`
- `apps/advertiser/components/advertiser/OnboardingWizard.tsx`

**Clave de Estado Local**: `tad_adv_onboarded_${advertiserId}` = `'1'`

**Mecanismo del Bug**:
1. En `dashboard.tsx`, `useEffect` evalúa `backendStatus === 'PENDING_REVIEW' && !localDone`.
2. Si la respuesta JWT no actualiza inmediatamente el claim `status` a `'ACTIVE'` en Supabase auth tras finalizar el wizard, o si `localStorage.setItem` en `OnboardingWizard.tsx` falla/silencia excepciones (ej. modo incógnito, quota exceeded), en el siguiente login/refresh el wizard reaparece.
3. Inestabilidad en la referencia `entityId` durante la deshidratación de sesión re-dispara el efecto.

**Protocolo de Reparación**:
```typescript
// 1. En OnboardingWizard.tsx (completeOnboarding):
const completeOnboarding = () => {
  try {
    if (typeof window !== 'undefined' && advertiserId) {
      window.localStorage.setItem(`tad_adv_onboarded_${advertiserId}`, '1');
    }
  } catch (err) {
    console.error('[OnboardingWizard] Error persistiendo estado local:', err);
  }
  onComplete();
};

// 2. En dashboard.tsx (doble guard defensivo y revalidación de sesión):
useEffect(() => {
  if (!entityId) return;
  try {
    const localDone = window.localStorage.getItem(`tad_adv_onboarded_${entityId}`) === '1';
    // Si ya completó localmente O el status en backend es ACTIVE, NO mostrar wizard
    const isCompleted = localDone || backendStatus === 'ACTIVE';
    setShowWizard(!isCompleted && backendStatus === 'PENDING_REVIEW');
  } catch {
    setShowWizard(false);
  }
}, [entityId, backendStatus]);
```

### 2.2 Portal Driver (`apps/driver/`) — Modal Cíclico en PWA Offline-First

**Archivos Intervenidos**:
- `apps/driver/pages/driver/dashboard.tsx`
- `apps/driver/pages/driver/login.tsx`
- `apps/driver/components/dashboard/BankForm.tsx`

**Claves de Estado Relevantes**:
- `tad_driver_dashboard_onboarding_seen_v2_${driverId}` (LocalStorage -> `'1'`)
- `tad_drv_bank_setup_done_${driverId}` (LocalStorage -> `'1'`)
- `tad_driver_force_onboarding` (SessionStorage -> `'1'`)
- `TAD_DRIVER_HUB_CACHE` (Cache offline del hub en LocalStorage)

**Mecanismo del Bug**:
1. En `login.tsx`, al iniciar sesión con `contractAccepted === false`, se setea `sessionStorage.setItem('tad_driver_force_onboarding', '1')`.
2. En `dashboard.tsx`, el `useEffect` de apertura lee `forceOnboarding` pero no lo remueve inmediatamente de `sessionStorage` tras la primera lectura, provocando que recargar la pestaña re-abra el modal.
3. Fluctctuaciones de red que hacen oscilar `hubData` a `null` reactivan el modal al re-obtener los datos.
4. La clave `_seen_v2` se escribía únicamente en el handler `onClose`, mas no en la confirmación del contrato o datos bancarios.

**Protocolo de Reparación**:
```typescript
// En dashboard.tsx:
const hasClosedRef = useRef(false);

useEffect(() => {
  if (!hubData?.driverId) return;

  const onboardingKey = getDriverOnboardingStorageKey(hubData.driverId);
  const bankSetupKey = `tad_drv_bank_setup_done_${hubData.driverId}`;
  
  const forceOnboarding = sessionStorage.getItem('tad_driver_force_onboarding') === '1';
  const hasSeenOnboarding = localStorage.getItem(onboardingKey) === '1';
  const hasBankDone = localStorage.getItem(bankSetupKey) === '1';

  // Si el usuario ya cerró manualmente en esta sesión o ya completó localmente + remoto:
  if (hasClosedRef.current) return;

  const isContractDone = hubData.contractAccepted === true;
  const isBankDone = hubData.bankAccountConfigured === true || hasBankDone;
  
  // Limpieza defensiva de flag temporal
  if (forceOnboarding) {
    sessionStorage.removeItem('tad_driver_force_onboarding');
  }

  const shouldOpen = !isContractDone && (!hasSeenOnboarding || forceOnboarding);

  setShowOnboardingModal(shouldOpen);
}, [hubData?.driverId, hubData?.contractAccepted, hubData?.bankAccountConfigured]);
```

---

## 3 — Fase de Loop Agéntico (Desarrollo y Corrección Incremental)

### Reglas Estrictas de Operación del Agente

1. **Iteración Unitaria**: Modificar un solo componente/archivo a la vez. Compilar y verificar tipos antes de avanzar.
2. **Respeto Absoluto a R1 (Offline-First)**: PROHIBIDO eliminar lecturas de `localStorage` o reemplazar caché local por llamadas directas requeridas al backend sin fallback offline.
3. **Aislamiento RBAC (R9)**: PROHIBIDO leer claves `tad_driver_*` en Advertiser o claves `tad_adv_*` en Driver. Preservar estricto espacio de nombres.
4. **Calidad de Código**: Identificadores en Inglés, comentarios/docstrings aclaratorios en Español Neutro.
5. **Cero Regresiones Visuales / Cero Pantallas en Blanco**: Preservar estructura Tailwind 4 `@theme` y no inyectar wrappers redundantes.

---

## 4 — Compuertas de Autoverificación Estricta (QA Empírico)

El agente NO declarará la tarea como finalizada sin antes ejecutar y superar las compuertas de compilación y verificación empírica.

### 4.1 Compuerta de Compilación TypeScript

```bash
# Validar app Advertiser
npx tsc --noEmit --project apps/advertiser/tsconfig.json

# Validar app Driver
npx tsc --noEmit --project apps/driver/tsconfig.json
```

### 4.2 Protocolo de Control de Calidad Empírico (Criterios de Entrega Mandatory)

El operador humano o el subagent de QA ejecutará los siguientes pasos empíricos para validar la entrega:

#### Paso A: Verificación de Bloqueo Permanente del Onboarding (Advertiser & Driver)

1. Abrir **DevTools -> Application -> Local Storage** en `http://localhost:3000` (Advertiser) y `http://localhost:3004` (Driver).
2. Borrar claves de onboarding anteriores para simular primer ingreso.
3. Iniciar sesión y completar/cerrar el flujo de Onboarding Wizard / Modal.
4. Inspeccionar LocalStorage y confirmar presencia de:
   - `tad_adv_onboarded_<id>` = `'1'` en Advertiser.
   - `tad_driver_dashboard_onboarding_seen_v2_<id>` = `'1'` y/o `tad_drv_bank_setup_done_<id>` = `'1'` en Driver.
5. **Prueba de Persistencia en Refresh**: Pulsar `F5` / `Ctrl+Shift+R` (Hard Refresh).
   - **Resultado Esperado**: El Onboarding **NO** reaparece bajo ninguna circunstancia.
6. **Prueba de Nueva Sesión**: Cerrar sesión, volver a autenticarse con las mismas credenciales.
   - **Resultado Esperado**: El Onboarding permanece bloqueado (no se dispara).

#### Paso B: Verificación DOM Inspector del Menú en Portal Advertiser

1. Navegar a cualquier vista privada del portal Advertiser (ej. `http://localhost:3000/advertiser/dashboard` o `/campaigns`).
2. Abrir **DevTools -> Elements (Inspector DOM)**.
3. Buscar elementos `<aside>`, `<nav>`, o el contenedor del menú lateral `.tad-sidebar` / `header`.
4. **Resultado Esperado**:
   - El árbol DOM contiene **únicamente 1 instancia** de la barra de navegación/sidebar.
   - No existen duplicados visuales ni superposición de elementos con `position: fixed`.

---

## 5 — Mapa de Riesgos Activos y Mitigación

| ID Riesgo | Dominio | Descripción del Riesgo | Estrategia de Mitigación |
|-----------|---------|------------------------|--------------------------|
| **R1** | Offline-First | Pérdida de estado de Driver en modo sin conexión al consultar API remota | Priorizar `localStorage` y `TAD_DRIVER_HUB_CACHE` antes de resolver `showModal`. |
| **R9** | RBAC / Privacidad | Fuga de llaves entre portales Driver/Advertiser | Validar prefijo estricto de claves: `tad_adv_*` en app advertiser y `tad_driver_*` / `tad_drv_*` en driver. |
| **R-Layout** | UI / DOM | Pantalla en blanco por desaparión total de `<Layout>` | Mantener `<Layout>` centralizado en `_app.tsx` o en `AdvertiserLayout.tsx`, NUNCA en ambos ni en ninguno. |
| **R-Hydration** | Next.js SSR | Mismatch entre servidor y cliente al leer `localStorage` | Envolver lecturas de `localStorage` dentro de `useEffect` o verificaciones `typeof window !== 'undefined'`. |

---

## 6 — Checklist de Cierre del Agente

Antes de generar el informe final, confirmar el cumplimiento de cada ítem:

- [ ] `npx tsc --noEmit` ejecuta sin errores en `apps/advertiser` y `apps/driver`.
- [ ] No existe montaje duplicado de `<Layout>` de `@tad/ui` en el árbol de Advertiser.
- [ ] La clave `tad_adv_onboarded_${advertiserId}` se escribe de forma segura al completar el wizard.
- [ ] La clave `tad_driver_dashboard_onboarding_seen_v2_${driverId}` bloquea permanentemente el modal de Driver.
- [ ] `sessionStorage.getItem('tad_driver_force_onboarding')` se limpia inmediatamente tras su consumo.
- [ ] Se mantienen intactas las capacidades offline PWA del Driver (Regla R1).
- [ ] Se incluyeron las instrucciones explícitas de prueba empírica A y B en la documentación de entrega.
