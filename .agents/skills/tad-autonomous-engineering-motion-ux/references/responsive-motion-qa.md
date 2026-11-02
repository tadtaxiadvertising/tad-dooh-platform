# Responsive y Motion QA de producto

Usar al implementar interfaz; no ejecutar estas pruebas para una edición únicamente documental de la skill. Comprobar scripts, dependencias, destinos y efectos antes de lanzar comandos. No enviar formularios, registrar cuentas, ejecutar pagos o migraciones ni llamar APIs de escritura productivas.

## Baseline, entorno y artefactos

Registrar SHA/rama/base, fecha/zona, comando/exit code, modo dev o build compilado, URL loopback, navegador/versión, perfil emulado, viewport, DPR, CPU y red. Guardar imágenes/vídeo y logs sanitizados fuera de Git en ruta absoluta, enlazados desde el reporte. Fixtures sin cuentas reales, secretos o PII. Usar la misma ruta/estado/entorno para antes y después.

Los perfiles Playwright con `isMobile`/`hasTouch` son **emulación**, no teléfonos físicos. WebKit añade cobertura, pero no certifica Safari en iPhone físico. Anotar lo no disponible sin fingirlo. Inspeccionar aislamiento de proveedores, URLs públicas, API, auth, analítica y SW antes de arrancar servidores; bloquear tráfico inesperado y distinguir HMR local de producto. Capturar intentos bloqueados: una UI que funciona con un proveedor bloqueado no prueba ausencia de tráfico.

Matriz del rediseño completo: `320×568`, `360×800`, `375×812`, `390×844`, `412×915`, `430×932`, `768×1024`, `1024×768`, `1440×900` y `667×375` landscape. Usar DPR2/3 cuando corresponda. Probar móvil normal y reduced motion, y al menos una condición lenta (anotar parámetros; punto de partida CPU×4/red lenta). Para un cambio pequeño seleccionar casos de riesgo y registrar qué matriz falta; no afirmar cobertura completa por cinco screenshots.

## Estados y aceptación observable

| Superficie | Acciones y evidencia |
| --- | --- |
| Hero/CTA | Primer HTML y no-JS visibles, ejemplo seleccionado/replay cuando exista; H1 y CTA operables en móvil; decoración no tapa texto ni hit areas |
| Historia/escenas | Avanzar, volver, scroll nativo y tap; swipe si se ofrece. Paso vigente legible, control de replay/pause si procede, equivalente estático reducido |
| Advertiser | Producción OFF→ON→OFF, pantallas/meses/ciudad/método reales; mismo cálculo y desglose de onboarding. Cambios de analítica usan valor actual, requieren consentimiento y paran tras revocación |
| Driver | Anuncios0/15 y normalización de16 en modelo; slots y total concordantes. Tres vías, ventas/referidos0/100/>100, negativos, fracciones, NaN/Infinity y extremos seguros; precisión/overflow sin tope comercial inventado |
| Referral/CTA | Explicar condiciones hasta activación/aprobación, retroceder y revisar destino oficial. Ninguna acción de demo acredita bono, comparte mensajes ni crea cuentas |
| Foco y lectura | Tab/Shift+Tab, Enter/Space/flechas, foco visible y estable; labels, progreso y anuncios moderados. Touch tap/drag con perfil táctil; mouse no basta para afirmar drag táctil |
| Robustez | Carga/error/empty donde correspondan, no-JS, red lenta/offline del contenido público, zoom200%, landscape, textos largos y teclado virtual si se cambian formularios. No declarar Player offline verificado con este smoke |
| Accesibilidad | Contraste real de texto/controles, estructura semántica y alternativas de imagen. axe-core o equivalente si disponible, más revisión manual; ni screenshot ni axe por sí solos certifican WCAG2.2AA |
| Ciclo de animación | Cero movimiento decorativo innecesario al montar; input/rollback; reduced motion inicial y cambio en sesión; navegar/montar/desmontar sin listeners/timelines/rAF acumulados; pausar fuera de vista/pestaña |

Capturar antes/después hero, historia, calculator/desglose, tres vías, FAQ/consentimiento y pasos de onboarding **que pertenezcan al alcance y existan**. Vídeo corto (aprox.15s) o evidencia equivalente de interacción real para los componentes protagonistas. No inventar pantallas ni implementar formularios privados solo para completar capturas.

## Geometría: evitar falsos positivos

Comprobar `document.documentElement.scrollWidth <= innerWidth + 1` y contención **horizontal** de H1, CTA, slider, output y tarjetas informativas. El contenido inferior al primer pliegue puede estar fuera de vista verticalmente; al hacer scroll a su sección debe poder verse y operarse. Decoración puede recortarse intencionalmente dentro de su contenedor sin ocultar información/foco. Detectar superposiciones mediante geometría y hit testing, además de inspección visual.

Fragmento orientativo para adaptar a los locators reales del test, no un script listo para ejecutar:

```js
const viewportWidth = await page.evaluate(() => innerWidth);
const box = await criticalControl.boundingBox();
if (!box || box.x < -1 || box.x + box.width > viewportWidth + 1) {
  throw new Error('Control esencial fuera del ancho visible');
}
await criticalControl.scrollIntoViewIfNeeded();
await criticalControl.click({ trial: true }); // prueba hit area sin mutar
```

Un trial click no acredita gesto táctil, foco, contraste o layout completo. Para un slider usar también teclado y el gesto táctil que soporte el harness; registrar limitaciones. No aceptar `overflow-x:hidden` global ni cambiar el test para ocultar una escena rota.

## Rendimiento: separar laboratorio y campo

- Medir JS inicial y diferido con la misma unión de assets/método gzip antes/después; objetivo orientativo de incremento por experiencia ≤80KiB gzip. Una excepción explica beneficio, coste y alternativa. Sin baseline comparable no afirmar delta.
- Lighthouse móvil ≥90 en Performance/Accessibility/Best Practices/SEO es objetivo de laboratorio; anotar configuración, modo compilado/dev, repeticiones y dispersión. Si falla, revisar carga, filtros, loops y retrasos de LCP antes de sumar efectos. No cambiar umbrales para lograr verde.
- LCP≤2.5s, INP≤200ms y CLS≤0.1 en p75 son **metas de campo**, requieren datos suficientes de RUM/CrUX. No inferir p75 ni INP real de Lighthouse, TBT o un smoke. Laboratorio registra métricas/long tasks disponibles con sus límites.
- Verificar estabilidad de layout y coste de animación bajo throttling. No afirmar latencia móvil o ausencia de fugas solo por tipado/build.

## Comandos candidatos en PowerShell

Inspeccionar primero scripts, `packageManager`, versiones y lockfile. Usar dependencias existentes; instalar únicamente si faltan y el trabajo de implementación lo necesita, con versión compatible y lockfile revisado. No ejecutar una instalación como validación de la skill ni permitir que un gestor distinto fuerce una reinstalación.

```powershell
git status --short
git rev-parse HEAD
node --test scripts/landing.test.cjs scripts/driver-landing.test.cjs
node --test scripts/cookie-management.test.cjs
# Solo si estos scripts están presentes en la rama:
node --test scripts/driver-preview-arithmetic.test.cjs scripts/advertiser-onboarding-presentation.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
# Lint del alcance según scripts/configuración inspeccionados, y después:
pnpm --filter @tad/advertiser build
pnpm --filter driver build
# Servidores ya iniciados con fixtures aislados; revisar smokes antes de usar:
$env:LANDING_BASE_URL = 'http://127.0.0.1:3003'
node scripts/landing-v3-smoke.cjs
$env:DRIVER_LANDING_BASE_URL = 'http://127.0.0.1:3004'
node scripts/driver-landing-smoke.cjs
```

Los nombres históricos V3 de scripts no implican volver a una landing de tres roles. Actualizar assertions al contrato actual sin debilitarlo. Los smokes existentes son candidatos a ampliar: inspeccionar qué cubren, no atribuirles esta matriz completa. No ejecutar `playwright test` si el workspace no dispone del runner/config necesarios; registrar el fallo y resolver el entorno dentro del alcance.

Next puede omitir tipos/lint por configuración previa: verificar ambos aparte. Diferenciar tipado focalizado y global, y documentar fallos heredados. CI se lee para el SHA exacto y no se relaja para una mejora visual. Builds pueden generar SW/public: inventariar y preservar originales antes, revisar outputs y restaurar solo los propios de forma segura; no borrar archivos ajenos.

Cada fila del reporte usa PASS, FAIL, OMITIDO o NO EJECUTADO con razón. Si falta servidor/navegador/permiso o falla un smoke, marcar pendiente de verificación, no inventar capturas ni reintentar sin nueva evidencia. Detener procesos propios al terminar y conservar el checkpoint.
