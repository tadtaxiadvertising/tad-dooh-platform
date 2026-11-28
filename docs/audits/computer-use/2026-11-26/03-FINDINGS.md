# Hallazgos reproducidos

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

## CUA-20261126-001 — El dominio público documentado del Player presenta certificado no confiable

- Severidad/prioridad: P1 / 1. Estado: BLOCKED.
- Rol: TABLET, PASSENGER. Módulo: Player / infraestructura TLS. Entorno: Producción: solo lectura; corrección y pruebas: aislamiento local.
- URL: https://tad.player.ibusiness.com.do/. Categoría: availability.
- Precondiciones: Cliente nuevo sin excepciones TLS.
- Reproducción: Abrir el origen en Chromium con validación TLS normal → Repetir GET con Node HTTPS sin desactivar rejectUnauthorized.
- Esperado: Certificado de confianza y acceso a la aplicación.
- Observado: Chromium ERR_CERT_AUTHORITY_INVALID en seis tamaños; Node DEPTH_ZERO_SELF_SIGNED_CERT. Frecuencia: Reproducible en esta ejecución; no se midió frecuencia histórica.
- Causa confirmada: Se presenta una cadena no confiable/autofirmada a ambos clientes. Hipótesis: Selección de certificado, proxy o dominio no provisionado; configuración no inspeccionada.
- Impacto técnico: Navegación bloqueada antes de ejecutar la aplicación. Comercial: Acceso por este hostname no disponible para un navegador estándar; impacto en tablets instaladas desconocido.
- Seguridad: No se probó explotación ni se alteraron controles. Financiero: No se midieron pérdidas ni se movió dinero.
- Errores de consola: no observados; TLS ocurre antes del JS. Red: ERR_CERT_AUTHORITY_INVALID, DEPTH_ZERO_SELF_SIGNED_CERT.
- Archivos: `02_reglas_negocio_stack.md (dominio documentado; sin cambio)`.
- Solución: Confirmar origen canónico y provisionar certificado/cadena válidos; no omitir TLS.
- Regresión: Chromium y Node con TLS estricto deben abrir el origen; luego Player autenticado/offline en sandbox. Dependencias: Acceso autorizado al proxy y certificado del origen correcto.
- Evidencia: [public-runtime-results.json](public-runtime-results.json), [availability-results.json](availability-results.json).
- Issue: [560](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/560).

## CUA-20261126-002 — El enlace de recuperación Admin es un placeholder

- Severidad/prioridad: P2 / 2. Estado: PENDING_VERIFICATION.
- Rol: ADMIN. Módulo: Admin / recuperación. Entorno: Producción: solo lectura; corrección y pruebas: aislamiento local.
- URL: https://tad.adm.ibusiness.com.do/admin/login. Categoría: functional.
- Precondiciones: Sesión anónima.
- Reproducción: Abrir /admin/login → Pulsar ¿Olvidaste tu contraseña?.
- Esperado: Formulario de recuperación accesible sin sesión.
- Observado: href="#"; termina en /admin/login# sin formulario. Frecuencia: Reproducible en esta ejecución; no se midió frecuencia histórica.
- Causa confirmada: Anchor placeholder y ausencia de ruta de recuperación Admin; listas públicas independientes en middleware, AuthProvider y _app. Hipótesis: ninguna adicional.
- Impacto técnico: Falta el punto de entrada; middleware, proveedor de sesión y layout deben reconocer la ruta pública. Comercial: Usuarios que olvidan su contraseña carecen de recuperación desde ese login.
- Seguridad: No se probó explotación ni se alteraron controles. Financiero: No se midieron pérdidas ni se movió dinero.
- Errores de consola: no observados; TLS ocurre antes del JS. Red: ninguno asociado observado.
- Archivos: `apps/admin/pages/admin/login.tsx`, `apps/admin/pages/admin/forgot-password.tsx`, `apps/admin/middleware.ts`, `apps/admin/pages/_app.tsx`, `packages/ui/components/PortalAuth.tsx`, `packages/ui/components/AuthProvider.tsx`.
- Solución: Reutilizar recuperación PortalAuth con initialView opcional; ruta pública concreta, sin relajar rutas privadas.
- Regresión: Ocho contratos renderizan formularios y prueban middleware/layout; navegador local y entrega de correo real pendientes según resultados. Dependencias: Verificación de proveedor/callback y correo en sandbox autorizado; CI contra dependencias fijadas en lockfile.
- Evidencia: [admin-recovery-browser-results.json](admin-recovery-browser-results.json), [admin-recovery-before.png](evidence/screenshots/admin-recovery-before.png), [admin-recovery-green.tap](admin-recovery-green.tap), [admin-recovery-middleware-red.tap](admin-recovery-middleware-red.tap), [admin-recovery-client-red.tap](admin-recovery-client-red.tap).
- Issue: [561](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/561).

Las observaciones de imágenes lazy no cargadas antes del scroll no se clasifican como imágenes rotas. El informe previo del checkout antiguo no se convierte automáticamente en hallazgos vigentes.
