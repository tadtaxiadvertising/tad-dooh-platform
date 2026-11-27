# Rendimiento y capacidad

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

Mediciones: 18 navegaciones de landings/login bajo Chromium local, waitUntil=networkidle, entre 2895 y 6896 ms. Son tiempos de laboratorio incluyendo red, no LCP/INP/CLS, SLA ni benchmarking comparable a producción. Los detalles por tamaño están en public-runtime-results.json.

Player Vite build local: 63 módulos, main JS 31,07 kB (gzip 9,45 kB), worker 5,05 kB, sw 1,84 kB. Dependencias preinstaladas reutilizadas por junction; no es instalación limpia ni prueba del digest desplegado.

10x de flota/campañas/GPS/eventos/finanzas: NOT_TESTED. No se envió carga a producción. N+1, CPU DB, memoria sostenida, OOM Docker y fugas: no medidos. Validación futura requiere entorno y datos sintéticos, métricas de latencia/colas y límites de recursos; no se calculó capacidad a partir de un build.
