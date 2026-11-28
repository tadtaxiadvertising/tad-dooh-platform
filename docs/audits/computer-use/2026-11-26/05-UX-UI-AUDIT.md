# UX/UI pública

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

Driver, Advertiser y login Admin se abrieron a 1920×1080, 1366×768, 1024×768, 768×1024, 390×844 y 360×640: 18 casos HTTP 200, sin pageerror ni overflow horizontal detectado. Se conservaron 18 capturas completas en evidence/screenshots. Se ejecutó con reducedMotion=reduce; no es una comparación completa de motion.

Driver móvil: rechazo de cookies opcionales, selector “02 Ventas” y valor 15 del slider publicitario ejecutados; respuesta y valor en public-runtime-results.json. Se inspeccionó captura de Advertiser móvil; una captura larga reescalada no prueba legibilidad al tamaño natural.

Admin recuperación: defecto reproducido por click, antes en admin-recovery-before.png; corrección local y evidencia posterior dependen de admin-recovery-browser-results.json.

La imagen /qr-passenger-journey.svg tenía loading=lazy y aún no cargaba al medir antes del scroll; el fichero existe. No se registró defecto sin probar fallo de carga. WCAG 2.2 AA completo, contraste automatizado, teclado exhaustivo, estados vacíos/error de portales privados y escaneo físico: NOT_TESTED.
