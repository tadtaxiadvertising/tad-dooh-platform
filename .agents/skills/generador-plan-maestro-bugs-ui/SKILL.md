---
name: generador-plan-maestro-bugs-ui
description: >
  Proporciona un plan maestro de instrucciones (prompt estructurado) para que un
  agente implementador de menor capacidad diagnostique y resuelva bugs de estado
  y layout recurrentes operando en bucle, garantizando la integridad de la
  arquitectura y previniendo regresiones. Triggers: fallos visuales, renderizados
  duplicados (menú en Advertiser), bucles infinitos de onboarding (Driver / Advertiser),
  persistencia de estados fallida en PWA offline-first.
---

# Plan Maestro — Diagnóstico y Resolución de Bugs UI Recurrentes

> **Audiencia**: Agente implementador autónomo (menor capacidad).
> **Objetivo**: Diagnosticar y parchear bugs de estado y layout **sin romper la
> arquitectura offline-first, sin cruzar contextos RBAC, y sin provocar
> regresiones visuales**.

---

## 0 — Contexto de Arquitectura (NO OMITIR)

| App | Router | Puerto | Ruta base |
|-----|--------|--------|-----------|
| `apps/admin` | **Pages Router** (Next.js 15) | `3002` | `/` |
| `apps/driver` | **Pages Router** (Next.js 15) | `3004` | `/driver/` |
| `apps/advertiser` | **Pages Router** + stub App Router | `3000` | `/advertiser/` |

### Stack de presentación

- **Tailwind CSS 4** — configuración vía `@theme` dentro de `globals.css`.
  **PROHIBIDO** crear o buscar `tailwind.config.js` / `tailwind.config.ts`.
- **Glassmorphism** + Amarillo TAD `#fad400` / `#FFD400` / `#FFD700` como
  color de acento.
- Componentes compartidos en `@tad/ui` — incluye `<Layout>`, `<AuthProvider>`,
  `<PaymentLockOverlay>`, `<CookieBanner>`.
- Iconografía: **Lucide React** exclusivamente.

### Estrategia Offline-First (PWA Driver)

- `useDriverHub()` → cache en `localStorage` key `TAD_DRIVER_HUB_CACHE`.
- React Query con `PersistQueryClientProvider` + `createSyncStoragePersister`
  (24 h gcTime).
- Toda decisión de onboarding lee localStorage **ANTES** de consultar backend.

---

## 1 — Fase de Diagnóstico de Componentes (Layout & Rendering)

### 1.1 Bug: Menú / Sidebar duplicado en Advertiser

**Causa raíz típica**: El componente `<Layout>` de `@tad/ui` (que contiene la
barra de navegación lateral / bottom-nav) se monta en **dos niveles** del
árbol:

1. `apps/advertiser/pages/_app.tsx` → `<AppWrapper>` envuelve las páginas
   privadas en `<Layout>` (línea ~56).
2. `apps/advertiser/components/layout/AdvertiserLayout.tsx` → envuelve
   `{children}` dentro de `<Layout>` (línea ~13).
3. **Cada vista hija** (dashboard, campaigns, media, reports, etc.) importa y
   usa `<AdvertiserLayout>`, lo que produce: `_app → Layout → AdvertiserLayout → Layout`.

**Árbol de archivos a inspeccionar (en orden)**:

```
apps/advertiser/pages/_app.tsx             ← ¿Envuelve en <Layout>?
apps/advertiser/components/layout/AdvertiserLayout.tsx  ← ¿Re-envuelve en <Layout>?
apps/advertiser/pages/advertiser/*.tsx      ← ¿Importan AdvertiserLayout?
apps/advertiser/app/layout.tsx             ← Stub de App Router (solo <html><body>)
```

**Instrucción de corrección**:

```
REGLA:  El <Layout> de @tad/ui DEBE montarse en UN SOLO NIVEL.

OPCIÓN A (preferida):
  - Eliminar <Layout> de _app.tsx para páginas privadas.
  - Mantener <AdvertiserLayout> como wrapper único en cada vista.
  - _app.tsx solo aporta <AuthProvider>, <QueryClientProvider>, <Toaster>,
    <CookieBanner>, y <PaymentLockOverlay>.

OPCIÓN B (alternativa):
  - Mantener <Layout> en _app.tsx.
  - Convertir AdvertiserLayout en un componente de sección que NO re-importe
    <Layout> de @tad/ui.

NUNCA HACER:
  - Importar <Layout> tanto en _app como en la vista hija.
  - Importar un componente de navegación (Sidebar, BottomNav) directamente
    en una página individual si ya se monta vía _app o AdvertiserLayout.
```

### 1.2 Bug: Doble renderizado de `<html>` / `<body>` (App Router stub)

El archivo `apps/advertiser/app/layout.tsx` contiene un `RootLayout` que
renderiza `<html>` y `<body>`. Si el Pages Router ya gestiona el document vía
`_document.tsx`, la coexistencia puede producir HTML duplicado.

**Verificación**: Abrir `apps/advertiser/pages/_document.tsx` y confirmar que
no hay conflicto. Si `app/layout.tsx` es un stub sin rutas reales, ignorar.
Si hay rutas en `app/`, considerar migrar todo a un solo router.

---

## 2 — Fase de Diagnóstico de Estado (Onboarding Loop)

### 2.1 Driver — `DriverOnboardingModal` (PWA, puerto 3004)

**Archivo principal**: `apps/driver/pages/driver/dashboard.tsx`

**Claves de localStorage involucradas**:

| Clave | Formato | Quién la escribe | Propósito |
|-------|---------|-------------------|-----------|
| `tad_driver_dashboard_onboarding_seen_v2_${driverId}` | `'1'` | `dashboard.tsx` ~L704 al cerrar el modal | Evitar re-apertura tras primer cierre |
| `tad_drv_bank_pending_sync_${driverId}` | `'1'` | `BankForm.tsx` ~L75 al guardar datos bancarios offline | Indicar sync pendiente a backend |
| `TAD_DRIVER_HUB_CACHE` | JSON | `useDriverHub.ts` ~L94 | Cache offline del hub |
| `tad_driver_force_onboarding` | `'1'` (sessionStorage) | Flujo manual / debug | Forzar re-apertura |

**Lógica de apertura del modal** (`useEffect` ~L597-629):

```
shouldOpen =
  isNewUser                                     // !hubData.contractAccepted
  || (hasPendingSteps && !hasSeenOnboarding)    // hay pasos y nunca cerró el modal
  || forceOnboarding;                           // sessionStorage forzado
```

**Bug de loop infinito — vectores de fallo**:

1. **Dependencias del useEffect**: `[hubData?.driverId, hubData?.contractAccepted, hubData?.bankAccountConfigured]`.
   Si `hubData` fluctúa entre `null` → dato → `null` (ej. error de red +
   re-fetch), el efecto se re-dispara y puede volver a abrir el modal.

2. **Escritura tardía de la clave `_seen_v2`**: La clave se escribe solo al
   cerrar (`onClose`), no al aceptar el contrato. Si el usuario acepta el
   contrato pero cierra la app antes de que se escriba `_seen_v2`, en la
   próxima apertura `contractAccepted` puede ser `false` si el caché aún no
   sincronizó.

3. **forceOnboarding en sessionStorage**: No se limpia automáticamente tras
   el primer ciclo — si la pestaña no se cierra, persiste.

**Instrucciones de reparación**:

```
VERIFICAR que el useEffect:
  (a) Solo se ejecute cuando hubData NO es null (guard temprano ✓ ya existe)
  (b) No re-abra el modal si el usuario ya lo cerró en esta sesión
      → Añadir una ref `hasClosedRef` que impida re-apertura tras onClose.
  (c) Limpie `tad_driver_force_onboarding` de sessionStorage tras leer '1'.

VERIFICAR que la clave `_seen_v2` se escriba TAMBIÉN al aceptar el contrato
(onAcceptAgreement), no solo al cerrar — así el cierre involuntario no deja
al usuario en bucle.

NUNCA HACER:
  - Eliminar la lectura de localStorage del onboarding (rompe offline-first).
  - Mover la lógica de apertura a un fetch directo al backend sin fallback
    a cache local.
  - Quitar la clave de sessionStorage sin primero verificar su valor.
```

### 2.2 Advertiser — `OnboardingWizard` (puerto 3000)

**Archivos principales**:
- `apps/advertiser/pages/advertiser/dashboard.tsx` — lógica de montaje
- `apps/advertiser/components/advertiser/OnboardingWizard.tsx` — wizard UI

**Clave de localStorage**: `tad_adv_onboarded_${advertiserId}` → valor `'1'`

**Lógica de apertura** (`dashboard.tsx` ~L31-41):

```typescript
const localDone = localStorage.getItem(`tad_adv_onboarded_${entityId}`) === '1';
const needsOnboarding = backendStatus === 'PENDING_REVIEW' && !localDone;
setShowWizard(needsOnboarding);
```

**Bug de loop infinito — vectores de fallo**:

1. **`backendStatus` no se actualiza en el JWT tras completar el wizard**:
   Si el backend cambia el status a `ACTIVE` pero el token JWT no se refresca,
   `backendStatus` sigue siendo `'PENDING_REVIEW'`, y si localStorage se limpia
   (usuario borra datos del navegador), el wizard reaparece.

2. **`entityId` cambia entre renders**: Si `session` se renegocia y `entityId`
   cambia de `undefined` → `id` → `undefined`, el efecto se re-dispara.

3. **La clave se escribe en `OnboardingWizard.tsx:L99`** (`completeOnboarding`)
   pero envuelto en try/catch que silencia el error — si localStorage está
   lleno o en modo privado, nunca se escribe.

**Instrucciones de reparación**:

```
VERIFICAR:
  (a) Que el useEffect tenga guard temprano para entityId falsy (✓ ya existe).
  (b) Que el catch del localStorage.setItem en OnboardingWizard logee el error
      (no silenciar totalmente).
  (c) Que tras llamar a onComplete(), el componente padre (dashboard) TAMBIÉN
      persista la clave — doble-escritura defensiva.
  (d) Que la sesión de Supabase se refresque (session.refresh() o revalidar
      el token) tras completar el onboarding para que backendStatus refleje
      ACTIVE.

NUNCA HACER:
  - Eliminar la clave `tad_adv_onboarded_${advertiserId}` de la lógica.
  - Asumir que solo el backend dicta el wizard — la PWA DEBE funcionar
    sin conexión al iniciar (Riesgo R1).
  - Leer claves de driver (tad_driver_*) desde el portal advertiser
    (Riesgo R9 — fuga RBAC).
```

---

## 3 — Fase de Loop Agéntico (Desarrollo y Corrección)

### Restricciones de operación del agente implementador

```
REGLA 1: Modificar UN SOLO COMPONENTE por iteración del loop.
         Commit lógico antes de pasar al siguiente.

REGLA 2: Variables e identificadores en INGLÉS.
         Comentarios y documentación en ESPAÑOL NEUTRO.

REGLA 3: Si se requieren nuevos SVG o íconos, implementar como
         componentes React SVG responsivos:
         - Props: width, height, className (Tailwind).
         - viewBox coherente con el diseño original.
         - Nunca insertar SVG inline gigante en JSX de páginas.

REGLA 4: Preservar TODOS los comentarios y docstrings existentes que
         no estén directamente relacionados con el cambio.

REGLA 5: No crear archivos nuevos innecesarios. Preferir editar el
         archivo existente que ya contiene el bug.

REGLA 6: Todo import de @tad/ui debe usar named exports:
         import { Layout, AuthProvider } from '@tad/ui';
```

---

## 4 — Fase de Autoverificación Estricta (Compuerta de Calidad)

### 4.1 Compuerta TypeScript

Antes de dar por terminado **cualquier** fix, el agente DEBE ejecutar:

```bash
# Para Advertiser:
npx tsc --noEmit --project apps/advertiser/tsconfig.json

# Para Driver:
npx tsc --noEmit --project apps/driver/tsconfig.json

# Para Admin:
npx tsc --noEmit --project apps/admin/tsconfig.json
```

Si hay errores de tipo, el fix NO está completo. Corregir antes de continuar.

### 4.2 Compuerta de Estilos

```
PROHIBIDO:
  ✗ Crear tailwind.config.js o tailwind.config.ts.
  ✗ Usar @apply con clases no definidas en @theme.
  ✗ Usar estilos inline (style={{...}}) salvo para valores dinámicos
    calculados en runtime.

PERMITIDO:
  ✓ Clases de Tailwind 4 directamente en className.
  ✓ @theme { } en globals.css para tokens de diseño.
  ✓ CSS custom properties (--tad-*) definidas en :root.
```

### 4.3 Verificación Manual (instrucciones para el operador humano)

Al finalizar el fix, indicar al operador:

```
═══════════════════════════════════════════════════════════════
 VERIFICACIÓN MANUAL REQUERIDA
═══════════════════════════════════════════════════════════════

 1. Abrir DevTools → Application → Local Storage en el puerto
    correspondiente (3000 / 3002 / 3004).

 2. Eliminar TODAS las claves que empiecen con:
    • tad_adv_onboarded_*       (para Advertiser)
    • tad_driver_dashboard_*    (para Driver)
    • tad_drv_bank_pending_*    (para Driver)
    • TAD_DRIVER_HUB_CACHE      (para Driver)

 3. Recargar la página (Ctrl+Shift+R / hard reload).

 4. Validar:
    ✓ El onboarding aparece UNA SOLA VEZ.
    ✓ Al cerrar o completar, NO reaparece al recargar.
    ✓ El menú / sidebar renderiza UNA SOLA INSTANCIA.
    ✓ No hay scrollbar horizontal inesperado.
    ✓ Glassmorphism y colores TAD se ven correctos.

═══════════════════════════════════════════════════════════════
```

---

## 5 — Mapa de Riesgos Activos

### R1 — Offline-First (CRÍTICO)

| Amenaza | Mitigación |
|---------|------------|
| Agente elimina lectura de localStorage del onboarding asumiendo que solo se consulta el backend | NUNCA eliminar localStorage reads; backend es fuente de verdad pero localStorage es fallback obligatorio para PWA sin conexión |
| Agente mueve lógica de onboarding a un `useEffect` que depende de un fetch al API | Mantener patrón existente: leer cache → abrir modal → fetch en background → reconciliar |
| Agente borra `TAD_DRIVER_HUB_CACHE` como parte del fix | Esta clave es vital para el arranque offline; solo borrar como instrucción de QA manual |

### R9 — RBAC / Fuga de Contexto (ALTO)

| Amenaza | Mitigación |
|---------|------------|
| Agente lee `driverId` en código de Advertiser | Cada app tiene su propio namespace de claves: `tad_adv_*` vs `tad_driver_*`. NUNCA cruzar |
| Agente reutiliza un hook de driver (`useDriverHub`) en el portal advertiser | Los hooks están en `apps/driver/hooks/` — no importar desde `apps/advertiser/` |
| Agente comparte tokens de sesión entre apps | Cada app tiene su propio `_app.tsx` con `<AuthProvider>` independiente |

### R-Layout — Renderizado Duplicado (MEDIO)

| Amenaza | Mitigación |
|---------|------------|
| Agente agrega `<Layout>` en un componente de página sin verificar `_app.tsx` | Verificar SIEMPRE el árbol: `_app.tsx → ¿<Layout>?` antes de envolver una vista en Layout |
| Agente crea un nuevo wrapper de layout que re-importa `<Layout>` | Usar únicamente `<AdvertiserLayout>` para Advertiser, que ya contiene `<Layout>` |

---

## 6 — Checklist de Cierre del Agente

Antes de reportar el fix como completado, el agente debe confirmar:

- [ ] `tsc --noEmit` pasa sin errores para la app intervenida.
- [ ] No se creó `tailwind.config.js` ni `tailwind.config.ts`.
- [ ] No se eliminaron lecturas de localStorage de claves de onboarding.
- [ ] No se cruzaron claves/hooks entre apps (driver ↔ advertiser).
- [ ] `<Layout>` de `@tad/ui` se monta en un solo nivel del árbol.
- [ ] Comentarios y documentación en español neutro.
- [ ] Variables e identificadores en inglés.
- [ ] Se proporcionó instrucción de verificación manual al operador.
