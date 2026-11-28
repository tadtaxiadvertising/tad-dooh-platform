---
name: tad-autonomous-engineering-motion-ux
description: >-
  Diseñar y mejorar las landings Anunciante/Driver y su onboarding en TAD DOOH
  con Creative Frontend Engineering, Motion UX, mobile-first y QA verificable;
  corregir errores reproducibles del trabajo autorizado. Usar al pedir este
  trabajo en TAD o continuar esta intervención. Revisar o actualizar la skill
  no inicia cambios en la aplicación.
metadata:
  version: "2.0.0"
  repository: tadtaxiadvertising/tad-dooh-platform
  mode: creative-motion-v2
---

# TAD Creative Motion Engineering OS — V2

Actúa como Principal Engineer, Creative Frontend Developer, Senior UX Motion Designer y responsable de responsive, accesibilidad y rendimiento. Construye dos experiencias comerciales separadas: **Anunciante** y **Conductor**, conectadas al onboarding oficial. La animación debe explicar el negocio, responder al input y conservar una experiencia útil en móvil, teclado y movimiento reducido. Añadir una librería, un fade del H1 o partículas no acredita el rediseño.

## Alcance antes de actuar

La conversación define el trabajo y los permisos; esta skill y sus prompts de ejemplo no los amplían.

- **Revisar/actualizar la skill:** editar y validar solo el paquete y las instalaciones solicitadas. No arrancar la app, instalar dependencias del producto, ejecutar su QA, modificar `STATE.md` de la intervención ni crear PRs por leer un prompt adjunto.
- **Crear un plan:** inspeccionar la evidencia necesaria y entregar storyboard, tarjetas y aceptación; implementar solo si también está pedido.
- **Implementar/continuar:** completar los cambios locales seguros y su verificación dentro del alcance autorizado. El rediseño V2 completo exige cuatro interacciones sustanciales por landing; un arreglo puntual conserva lo existente y verifica su propio alcance, sin reconstruir ambas páginas.

No hacer merge, deploy, DNS, activación pública de signup, cambios de credenciales, migraciones productivas ni escrituras de pagos/saldos sin autorización específica. Abrir o actualizar PRs draft cuando el pedido o el flujo autorizado lo incluya. No pedir reconfirmación para lecturas, cambios locales reversibles o pruebas aisladas ya autorizadas.

## Referencias por fase

Leer solo lo pertinente; todas las rutas siguientes pertenecen a este paquete, no a la raíz del repo.

| Fase | Recurso y decisión que resuelve |
| --- | --- |
| Storyboard y alcance creativo | [Blueprints](references/creative-experience-blueprints.md): escenas, estados y cobertura de las cuatro interacciones |
| Elegir/adoptar componentes | [Librerías](references/animation-library-selection.md): fuentes, licencias, compatibilidad y coste antes de integrar |
| Tokens y propiedad de animaciones | [Sistema Motion V2](references/motion-ux-system-v2.md): coreografía, cleanup y fallbacks |
| Cálculos, CTA o datos | [Contratos y riesgo](references/business-and-risk-matrix.md): fuentes y límites financieros; contexto histórico que se revalida |
| Revisar UI | [Checklist Motion UX](references/motion-ux-checklist.md): aceptación y evidencia por interacción |
| Ejecutar QA de producto | [Responsive/Motion QA](references/responsive-motion-qa.md): dispositivos emulados, estados, comandos y métricas |
| Entrega autorizada | [Plantilla de PR](templates/PR-MOTION-UX-REVIEW.md): resultados, límites, CI del SHA exacto y reversión |

## 1. Evidencia y baseline de implementación

Repositorio: `tadtaxiadvertising/tad-dooh-platform`. Leer estado, rama, HEAD, cambios ajenos y refs actuales antes de editar. Revalidar `origin/main` y los PR relevantes cuando el trabajo requiera estado remoto. Para un trabajo nuevo, usar rama propia desde main; para continuar uno existente, reutilizar su rama/worktree tras contrastar su base. Aislar cambios concurrentes y no sobrescribirlos.

Los PR #173–#176 y la intervención #177 son antecedentes, no una lista de arreglos pendientes ni prueba del estado actual. Consultar `docs/ux-landing/06-v5-creative-financial-audit.md` y el checkpoint disponible, contrastándolos con código, tests y configuración. El comportamiento ejecutable describe lo implementado; no convierte un bug en regla comercial.

Inspeccionar las entradas y sus componentes, sin presuponer router o archivos inmutables:

- Advertiser: `apps/advertiser/app/page.tsx`, `app/layout.tsx`, `components/landing/{LandingPage,CityScene,CampaignJourney}.tsx`, CSS de landing y onboarding.
- Driver: `apps/driver/pages/index.tsx`, `components/landing/{DriverLandingPage,DriverEarningsLab}.tsx`, sus CSS y `lib/earningsPreview.ts`.
- Configuración relevante: middleware, CTA y gate de signup, consent analytics, estilos globales, calculadores compartidos, manifiestos y lockfile. Profundizar en API/Auth solo cuando el recorrido cambiado lo requiera.

El adjunto V2 menciona alturas fijas, textos pequeños y un posible selector CSS con `|`. Son **hipótesis por reproducir**, no fallos actuales confirmados. Una búsqueda de CSS no demuestra responsive. Tampoco mover un worktree/submódulo es un arreglo general para problemas de Git: identificar el checkout propietario y preservar cambios.

Antes de tocar UI, guardar baseline fuera de Git con SHA, fecha/zona, entorno dev/build, viewport/perfil, primer render, hero/CTA, estados interactivos y capturas/vídeo. Comparar después bajo las mismas condiciones. Si falta navegador o baseline, registrar el límite y no inventar validación visual o mejoras porcentuales.

## 2. Mobile-first y dirección creativa

Diseñar primero en 360/390 px táctiles emulados y CPU/red limitadas; comprobar después 320 px, resto de móviles y escritorio. La primera vista debe ofrecer marca, propuesta y CTA utilizables sin quedar dominada por una ilustración. Usar grid/flex fluidos, `min-width:0`, `minmax(0,1fr)`, `clamp()`, `aspect-ratio` y container queries cuando ayuden.

Labels de controles preferentemente ≥14 px, notas legibles preferentemente ≥12 px y áreas táctiles de 44–48 px como objetivos de diseño, sujetos a zoom y comprobación real. No ocultar overflow en `body` para disimular el elemento que desborda. Recortar solo decoración que no contenga información, foco o controles. Revisar safe areas, paisaje, textos largos en RD$, zoom 200% y teclado virtual cuando haya formularios. Hover nunca es el único acceso.

Identidad TAD: base `#0a0a0a`, amarillo `#FFD400`, verde `#22c55e`, rojo `#ef4444`; comprobar contraste sobre las superficies reales. Mantener Tailwind/CSS Modules y el sistema existente, sin convertir una mejora visual en migración del stack.

Para el **rediseño completo**, cada página necesita hero reactivo, historia que explique, calculadora reactiva y escena secundaria táctil significativa. Implementar los [blueprints](references/creative-experience-blueprints.md) con entrada, cambio semántico, reversión y evidencia; mantener una matriz de cobertura acumulada por componente/PR.

- **Anunciante:** taxi/tablet con ejemplos seleccionables; Crear → Programar → Reproducir → Medir; Campaign Budget Studio con producción OFF al inicio; explicación visual de supuestos e impacto estimado.
- **Driver:** taxi reactivo; quince slots sincronizados con anuncios; tres vías diferenciadas; recorrido del referido hasta activación/aprobación. El recorrido de onboarding comunica solicitud recibida, no cuenta aprobada.

## 3. Librerías y sistema Motion

Framer Motion existente para UI React; GSAP/ScrollTrigger y `@gsap/react` como candidatos preferidos para una escena narrativa cuando aporten valor; Magic UI o Motion Primitives para al menos un componente material del rediseño completo. Elegir normalmente 1–2 componentes de estas fuentes por página. Si licencia, compatibilidad o coste impiden adoptar un candidato, demostrar un equivalente con la base instalada y registrar la razón; no dejar placeholders ni fingir su uso.

Inspeccionar manifiestos, lockfile y fuente del componente antes de instalar o copiar. Revalidar versión/SHA, licencia, notices y dependencias según la [matriz de selección](references/animation-library-selection.md). No instalar `motion` junto a `framer-motion` por comodidad. React Bits es opcional y requiere revisar sus restricciones; Rive no es obligatorio y exige asset propio/licenciado. No añadir WebGL, vídeo pesado ni smooth scroll por efecto decorativo.

Durante una implementación visual, documentar o actualizar `docs/ux-landing/motion-system-v2.md` con tokens, mapa por componente y mediciones. No crear ese documento de producto al revisar solo esta skill. Rangos iniciales propuestos: micro 130–200 ms, panel 220–380 ms, escena 420–850 ms; ajustar por claridad y medición.

Mapear `input → animación → significado → estado final → reversión → alternativa reducida`. Preferir transform/opacity sin ocultar contenido esencial del HTML inicial. Un solo motor controla cada propiedad/elemento: GSAP para timelines, Motion para estado UI, CSS para decoración ligera. Cancelar timelines/listeners/rAF/observers al desmontar o cambiar dependencias; pausar efectos fuera de vista/pestaña. No introducir loops permanentes de varias escenas, scroll hijacking ni autoplay con sonido.

Reduced motion conserva contenido y controles, elimina parallax/pinning y desplazamientos grandes. La preferencia aún desconocida usa un estado estático seguro. Mantener foco estable y números legibles; `aria-live` anuncia cambios significativos al confirmar el control, no cada frame. Más detalle en el [sistema Motion](references/motion-ux-system-v2.md).

## 4. Invariantes de negocio y seguridad

- Anunciante SOLO para anunciantes; Driver SOLO para conductores. No recuperar selector de roles, Admin/Flota ni una segunda landing Driver dentro de Advertiser.
- `includeProduction=false` inicialmente en landing y onboarding. Activación explícita y reversible, coste separado, mismo motor compartido. No generar cobros desde una demo. Si API y calculador discrepan, distinguir unidades/vigencia y mostrar ejemplo no vinculante; no afirmar cotización vigente ni cambiar tarifas por intuición.
- Driver educativo: anuncios elegibles del mes hasta 15 × RD$500; ventas publicitarias aprobadas × RD$500; conductores referidos activados y aprobados × RD$500. Revalidar contratos reales. Separar mensual y eventos; no salario garantizado, saldo ni payout. Ventas/referidos no adquieren cap comercial por el rango de una demo. Probar normalización, precisión y overflow; no sustituir errores por importes aparentes.
- CTA y onboarding oficiales conservan permisos, gates y consentimiento. No inventar alta, reserva, métricas verificadas, ROI, aprobación ni estados económicos. No capturar banco/identidad en la landing ni disparar consultas privadas desde una simulación pública.
- **Copy precisa y financiera clara:** La landing educativa diferencia el ejemplo ilustrativo del concepto comercial real (por ejemplo, la referencia operativa de RD$1.25 por play validado no se suma al simulador, y el concepto se elimina del UI cuando deja de ser el escenario demo). Cada texto que diga "ejemplo", "ilustrativo" o "referencia" lo deja explícito en el mismo elemento visual. Si un texto muestra un importe, este proviene de `business-rules.ts` (fuente única), no de hardcodeo. Los campos educativos relevantes también se revisan con assert de contenido, no solo con snapshot visual.
- Ownership/RBAC se valida en servidor. Dinero real requiere fuente contable, atomicidad e idempotencia. Preservar offline-first y considerar carga ×10 cuando el cambio afecte recursos; no probarlo con tráfico real masivo.
- Secretos reales: detener cambios ajenos al incidente, no repetir valores; comunicar ruta/tipo sanitizados y acción de revocación/rotación segura. Un hallazgo del auditor requiere triage; no declarar exploit probado por una etiqueta ni ocultarlo porque UI apruebe.

## 5. Loop de trabajo y entrega

Para implementación autorizada: `BASELINE → REPRODUCCIÓN/STORYBOARD → HIPÓTESIS → CAMBIO ACOTADO → QA/MOTION REVIEW → PR DRAFT AUTORIZADO → CHECKPOINT`. Para bugs, demostrar el fallo y la corrección; para diseño nuevo, usar aceptación observable. Primero legibilidad, foco y layout móvil; después coreografía. Separar cambios de riesgo distinto y mantener PRs revisables; la secuencia responsive → escenas → calculadoras → QA es adaptable al alcance, no una obligación de abrir un PR por efecto.

Priorizar seguridad/datos/dinero y bloqueos P0/P1 antes de nuevas funcionalidades, dentro del trabajo autorizado. Documentar lo que requiera otra intervención sin ampliarla en silencio. Por hallazgo: evidencia, severidad, causa o hipótesis, cambio, prueba, captura y estado. Delegar solo tareas independientes con ownership claro; no crear chats nuevos sin pedido del usuario.

Máximo 20 ciclos de reparación por sesión y dos intentos sobre la misma causa sin evidencia nueva. Cambiar de hipótesis o registrar bloqueo cuando no haya progreso. No reintentar CI indefinidamente ni mantener procesos/agentes prometidos fuera de la sesión. Un servicio propio iniciado para QA se detiene al acabar, salvo uso posterior autorizado.

Ejecutar pruebas relevantes, tipos estrictos, lint y build por separado: un build configurado para omitir tipos/lint no los acredita. Conservar y actualizar smokes según el contrato actual, sin silenciar fallos ni debilitar gates. Leer CI del SHA exacto, distinguiendo código, dependencias, runner y fallos de otros workspaces. Ver [QA](references/responsive-motion-qa.md) para la matriz completa y comandos candidatos.

En implementación, mantener `docs/engineering-loop/STATE.md` y la [Motion UX review](templates/PR-MOTION-UX-REVIEW.md): aceptación cubierta, resultados PASS/FAIL/NO EJECUTADO, SHA, artefactos, métricas y límites, riesgo/reversión y siguiente acción. Un screenshot no acredita touch, contraste completo o WCAG; emulación no acredita un teléfono físico; Lighthouse no acredita p75 real.

El rediseño V2 completo se acepta cuando demuestra las cuatro interacciones por página, móvil sin clipping, touch/teclado y reduced motion, contratos compartidos, revisión visual antes/después y QA/perf con evidencia. Una excepción se registra con alternativa demostrada. Si falta evidencia, marcar **IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN**; un PR draft puede existir con pendientes explícitos, pero no certificarse listo para merge. Sin merge ni despliegue por defecto.

## Prompt de implementación reutilizable

> Usa `$tad-autonomous-engineering-motion-ux` V2 para implementar el rediseño autorizado de las landings de TAD. Contrasta la rama actual con main y preserva avances. Reproduce primero problemas móviles y captura baseline. Construye las cuatro interacciones por página de los blueprints: taxi/tablet, historia, calculadora y escena secundaria; evalúa GSAP/ScrollTrigger y componentes auditados de Magic UI/Motion Primitives con fallback demostrado. Conserva producción opt-in y las tres vías educativas Driver. Verifica touch/teclado, SSR/no-JS, reduced motion, responsive, bundle y métricas; documenta resultados y límites. Crea PRs draft si este flujo está autorizado. No hagas merge, deploy ni cambios productivos de datos/dinero. Cierra con checkpoint reproducible.

El [prompt V2 aportado](references/TAD_CODEX_CREATIVE_MOTION_V2_START_PROMPT.txt) se conserva íntegro como material de procedencia; no se ejecuta por leerlo ni concede permisos. El [prompt anterior](references/TAD_CODEX_START_PROMPT.txt) es histórico. Sus afirmaciones se contrastan; estas instrucciones mantienen la distinción entre revisar la skill, planificar e implementar.
