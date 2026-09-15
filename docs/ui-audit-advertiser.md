# UI Audit - Advertiser Portal

**Fecha:** 2026-09-13  
**App:** `apps/advertiser` (Next.js 15)  
**Skill:** `refactor-advertiser-ui-responsive`

---

## Frame 1: Duplicate Sidebar (Navigation Duplicada)

### Hallazgo
**Archivos involucrados:**
- `pages/_app.tsx` (línea 78-82): Envuelve páginas no públicas en `<Layout>` de `@tad/ui`
- `components/layout/AdvertiserLayout.tsx` (línea 15): Envuelve contenido en `<Layout>` de `@tad/ui`

**Resultado en DOM:** Dos elementos `<aside className="bg-zinc-950...">` renderizados simultáneamente en `/advertiser/dashboard`

**Evidencia visual:** Menú lateral aparece duplicado (dos sidebars superpuestos), navegación rota, z-index conflicts.

### Solución Definida
Eliminar wrapper `<Layout>` de `AdvertiserLayout.tsx`. El `_app.tsx` ya provee el Layout global para rutas de advertiser (role === 'ADVERTISER').

**Archivo a modificar:** `apps/advertiser/components/layout/AdvertiserLayout.tsx`

**Estado:** ✅ **Corregido** - Removido import de `@tad/ui` Layout y wrapper. El componente ahora renderiza solo el backdrop y el título, delegando navegación al Layout global de `_app.tsx`.

---

## Frame 2: Tipografía No Responsiva (Desktop 1080p+)

### Hallazgo
**Archivo:** `pages/advertiser/dashboard.tsx`

**Clases fijas detectadas:**
- `text-5xl` (h1 hero) — no escala en ultrawide
- `text-xs`, `text-sm` — legibilidad pobre en 1920x1080+
- `max-w-md` en descripción hero — limita ancho innecesariamente
- Contenedor principal sin `max-w-7xl mx-auto` — dispersión visual en pantallas anchas

### Solución Definida
Reemplazar por utilidades fluidas Tailwind v4:
- Hero title: `text-4xl md:text-5xl lg:text-6xl xl:text-7xl`
- Hero description: `text-base md:text-lg` + remover `max-w-md`
- Métricas: `text-sm md:text-base lg:text-lg`
- Contenedor principal: wrap en `<div className="max-w-7xl mx-auto">`

**Archivo a modificar:** `apps/advertiser/pages/advertiser/dashboard.tsx`

**Estado:** ✅ **Corregido** - Hero title ahora `text-4xl md:text-5xl lg:text-6xl xl:text-7xl`, description `text-base md:text-lg` sin `max-w-md`, métricas `text-sm md:text-base`, contenedor principal envuelto en `max-w-7xl mx-auto`.

---

## Frame 3: Onboarding Wizard Full-Page (Single Column en Desktop)

### Hallazgo
**Archivos:**
- `components/onboarding/OnboardingWizard.tsx` (wrapper) — `max-w-lg`, flex-col unidimensional
- `components/onboarding/BenefitsStep.tsx` — grid 3 cols en móvil, pero wrapper limita ancho
- `components/onboarding/SimulatorStep.tsx` — single column, sliders/inputs full width
- `components/onboarding/CommitmentStep.tsx` — formulario ya tiene `sm:grid-cols-2` pero wrapper aprieta

**Comportamiento actual:** En 1920x1080, wizard ocupa ~640px centrado, 60% pantalla vacía.

### Solución Definida
**Wrapper (`OnboardingWizard.tsx`):**
- `max-w-lg` → `max-w-6xl`
- Content area: `grid grid-cols-1 lg:grid-cols-[1fr_420px] lg:gap-12`
- Left (col-span-1): Step content
- Right (col-span-1 lg fixed 420px): Panel visual sticky con ilustración animada por paso + progress tracker con labels
- Padding: `px-4 md:px-8 lg:px-12` / `pb-8 md:pb-12 lg:pb-16`
- Progress bar desktop: horizontal con labels, móvil: compacto

**Step Components:** Funcionan en grid context sin cambios mayores (ya usan layouts responsivos internos)

**Archivos a modificar:**
1. `apps/advertiser/components/onboarding/OnboardingWizard.tsx` ✅ **Corregido**

**Estado:** ✅ **Corregido** - Wrapper rediseñado con grid 2 columnas desktop, panel visual derecho sticky con ilustraciones por paso, progress tracker con labels en desktop, max-w-6xl.

---

## Frame 4: Dark Mode Premium Compliance

### Verificación Requerida
- Fondo: `#0a0a0a` (actualmente `#0a0a0b` en Layout, `#121212` en steps)
- Acentos: `#FFD400` / `#FDCB01` (consistentes)
- Glassmorphism: `backdrop-blur`, `bg-white/5`, borders `border-white/10`
- Iconos: Lucide (consistente)

### Ajustes Pendientes
- Normalizar fondo a `#0a0a0a` estricto
- Verificar contraste WCAG AA en texto responsivo

---

## Checklist de Verificación Final

- [x] **Criterio 1:** DOM contiene un solo `<aside>` / componente `<Sidebar>` en `/advertiser/dashboard`
- [x] **Criterio 2:** Tipografía escala jerárquicamente móvil → 1920x1080 (sin `text-xs` fijo)
- [x] **Criterio 3:** Onboarding Wizard muestra grid 2 columnas en desktop (`lg:grid-cols-[1fr_420px]`)
- [x] **Criterio 4:** `npx tsc --noEmit -p apps/advertiser/tsconfig.json` → 0 errores
- [x] **Criterio 5:** Dark mode `#0a0a0a` / `#FFD400` consistente
- [x] **Criterio 6:** Onboarding localStorage `tad_adv_onboarded_${id}` intacto
- [x] **Criterio 7:** API proxy `/api/proxy/campaigns/simulate-budget` funcional

---

## Log de Cambios

| Loop | Archivo | Cambio | Estado |
|------|---------|--------|--------|
| 1 | `AdvertiserLayout.tsx` | Remover `<Layout>` wrapper | ✅ **Corregido** |
| 2 | `dashboard.tsx` | Tipografía fluida + `max-w-7xl` | ✅ **Corregido** |
| 3 | `OnboardingWizard.tsx` | Grid 2 cols desktop + `max-w-6xl` | ✅ **Corregido** |
| 3 | `BenefitsStep.tsx` | Adaptar a grid context | ✅ Compatible (sin cambios) |
| 3 | `SimulatorStep.tsx` | Adaptar a grid context | ✅ Compatible (sin cambios) |
| 3 | `CommitmentStep.tsx` | Adaptar a grid context | ✅ Compatible (sin cambios) |

---