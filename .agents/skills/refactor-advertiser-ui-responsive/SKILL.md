# Skill: refactor-advertiser-ui-responsive

## Objetivo

Ejecutar un bucle de análisis, documentación y corrección frame a frame para eliminar la duplicidad del menú de navegación, reestructurar el onboarding wizard para escritorio y escalar las tipografías responsivas en `apps/advertiser`.

## Cuándo se activa

* Cuando existan quejas de visualización en `/advertiser/dashboard` (menús dobles, solapamiento).
* Cuando textos o componentes del portal de anunciantes pierdan proporción en resoluciones de escritorio (1080p+).
* Al requerir una auditoría visual y reorganización estructural del UI sin alterar la lógica de negocio.

## Contexto específico

* **App:** `apps/advertiser` (Next.js 15).
* **Estilos:** Tailwind CSS v4 (procesado vía `@theme` en `postcss.config.mjs`, prohibido buscar/modificar `tailwind.config.js`).
* **Diseño:** Dark mode estricto (`#0a0a0a` fondo, `#FFD400` acentos). Glassmorphism, iconos Lucide.
* **Estado:** El Onboarding Wizard persiste vía `localStorage` (`tad_adv_onboarded_${advertiserId}`).

## Pasos

### 1. Fase de Análisis y Planeación (Documentación Frame a Frame)

* Crea un archivo `docs/ui-audit-advertiser.md`.
* Mapea cada vista afectada (Dashboard, Campañas, Onboarding).
* Registra los hallazgos actuales (ej. "Frame 1: Layout global inyecta Sidebar, pero Dashboard page también lo importa").
* Define la estructura de solución por cada vista en el documento antes de tocar el código.


### 2. Deduplicación del Menú (Layout vs Page)

* Inspecciona la jerarquía de Next.js en `apps/advertiser`.
* Verifica si el menú lateral/superior está siendo inyectado en un archivo global (ej. `layout.tsx` o `AppWrapper`) y al mismo tiempo instanciado explícitamente dentro de `pages/advertiser/dashboard.tsx` o componentes hijos.
* Elimina la importación manual del menú en las páginas individuales. Centraliza la navegación exclusivamente en el Layout de nivel superior o en el componente de envoltura autenticada (`PortalAuth`).


### 3. Corrección de Legibilidad y Tipografía (Escritorio)

* Escanea los componentes principales del dashboard buscando clases de texto fijas (ej. `text-xs`, `text-sm`).
* Reemplaza por utilidades fluidas o responsivas de Tailwind v4: `text-sm md:text-base lg:text-lg xl:text-xl`.
* Ajusta los contenedores principales limitando el ancho máximo para evitar dispersión visual en pantallas ultrawide: `max-w-7xl mx-auto`.


### 4. Redistribución del Onboarding Wizard (PC)

* Localiza el componente del Onboarding Wizard (asociado a `apps/advertiser/pages/advertiser/dashboard.tsx` según registro de versión).
* Modifica la estructura de contenedor flex/block unidimensional a Grid responsivo: `grid grid-cols-1 lg:grid-cols-2 lg:gap-12`.
* Ajusta el slider de presupuesto y las proyecciones de impacto (Paso 2 y 3) para que en PC utilicen layouts de lado a lado en lugar de apilarse verticalmente.
* Aumenta los paddings en escritorio (`p-4 md:p-8 lg:p-12`) para mejorar la distribución espacial.


### 5. Actualización de Documentación

* Tras cada corrección, actualiza `docs/ui-audit-advertiser.md` marcando el frame como "Corregido" y detallando los cambios en las clases de Tailwind implementadas.



## Verificación

* Ejecuta `npm run dev --workspace apps/advertiser` (Puerto 3000 o 3001).
* Navega a `/advertiser/dashboard`.
* **Criterio 1:** El DOM debe contener un solo tag `<nav>` o componente `<Sidebar>` en el árbol.
* **Criterio 2:** Al redimensionar la ventana de móvil a 1920x1080, el texto debe escalar jerárquicamente y no verse "lejos" o desproporcionadamente pequeño.
* **Criterio 3:** El Onboarding Wizard debe mostrarse distribuido en columnas (Grid) en vista de PC.
* Compila el proyecto con `npx tsc --noEmit -p apps/advertiser/tsconfig.json` para descartar errores de TypeScript introducidos por la refactorización.

## Riesgos / reglas de negocio en juego

* **Romper persistencia de Onboarding:** Al modificar el wizard, no alterar la clave `tad_adv_onboarded_${advertiserId}` de `localStorage`.
* **Caída del Build:** Next.js fallará si se borra un componente de menú que tiene dependencias de props (como datos del usuario) sin pasarlas correctamente al nuevo Layout.
* **CORS / API Proxy:** Asegurar que las llamadas a `/api/proxy/campaigns/simulate-budget` dentro del wizard no se vean alteradas al cambiar la estructura del componente.

## Rollback

1. Revertir cambios en el árbol de trabajo local: `git checkout -- apps/advertiser/`
2. Si el cambio llegó a producción y generó un problema de layout severo (ej. pantalla en blanco), ejecutar redeploy manual de la imagen estable anterior desde el panel de Easypanel.