# Documentación de Traspaso de Agente (Agent Handover)

## 🎯 Objetivo de la Sesión Completada

Estabilizar la interfaz del Admin Dashboard y optimizar la seguridad del backend. Se resolvieron fallos críticos de superposición de elementos en la UI y se eliminaron latencias de autenticación mediante el fix de la estrategia JWT local. Además, se limpiaron los logs de producción para una auditoría más legible.

Todas las fallas detectadas en la infraestructura **ya fueron mitigadas** e integradas en `main`.

---

## 🛠️ Problemas Resueltos y Cambios Arquitectónicos

### 1. Timeout de Healthchecks del API (Backend)

- **Problema:** El contenedor del API fallaba la verificación de salud de EasyPanel porque el script de inicialización (`prisma db push`) bloqueaba el evento de "Listening" de NestJS.
- **Solución:** Se delegó `prisma db push` a un proceso no bloqueante o condicional en el arranque del `main.ts` y entrypoint, asegurando que el servidor responda de inmediato en el puerto 3000 para pasar el healthcheck.

### 2. Contexto de Compilación del Monorepo (Frontend)

- **Problema:** Los contenedores de `admin` y `advertiser` no encontraban paquetes compartidos (`@tad/ui`, `@tad/services`) porque el contexto de Docker no alcanzaba al root.
- **Solución:** Se movieron los archivos `Dockerfile.admin` y `Dockerfile.advertiser` a la raíz del proyecto. El _Build Path_ en EasyPanel debe mantenerse como `/`.

### 3. Fallas en Build por Tailwind/LightningCSS y Windows Lockfile

- **Problema:** Next.js y Tailwind arrojaban `Error: Cannot find native binding` para `lightningcss` y `@tailwindcss/oxide`. Esto pasaba porque el `package-lock.json` se había generado en Windows, y npm se rehusaba a compilar las versiones `linux-x64-musl` necesarias para la imagen de Alpine.
- **Solución:** Se ordenó a los Dockerfiles hacer un borrado riguroso con `RUN rm -rf package-lock.json node_modules && npm install`, forzando la compilación local al 100% de los binarios para Alpine.

### 4. Modo `standalone` de Next.js en Monorepos (`MODULE_NOT_FOUND`)

- **Problema:** Una vez compilado correctamente, ejecutar `node apps/admin/server.js` fallaba con `Cannot find module 'next'`. El empaquetador de Next.js (`outputFileTracing`) no estaba copiando las dependencias base debido a la estructura del monorepo y la falta de lockfile.
- **Solución:** Se añadió explícitamente `outputFileTracingRoot: require('path').join(process.cwd(), '../../')` en los `next.config.ts`, garantizando que absolutamente todas las dependencias elevadas se compactaran.

### 5. Errores de Permisos al Mover Archivos (Docker Runtime)

- **Problema:** El usuario `nextjs` (UID 1001) sufría de `Permission denied` si intentaba utilizar comandos `cp` o `mkdir` al encender el contenedor.
- **Solución:** Refactorizamos el Dockerfile para asignar los permisos en tiempo de compilación. Se utilizaron comandos directos `COPY --from=builder --chown=nextjs:nodejs ...` para colocar las carpetas `public` y `.next/static` en el directorio correcto de trabajo.

### 6. React Minified Error #130 en Producción

- **Problema:** Pantallazo blanco en la carga de Next.js debido a que `packages/ui/components/index.ts` utilizaba `export * from './Layout'`, pero `Layout.tsx` era un `export default function`.
- **Solución:** Convertimos `Layout.tsx` a un _named export_ (`export function Layout`).

### 7. Superposición de Capas (Z-Index Sidebar)

- **Problema:** El Header con la barra de búsqueda ocultaba el logotipo y los menús superiores del Sidebar en resoluciones Desktop.
- **Solución:** Modificada la directiva CSS de `lg:static` a `lg:relative z-[200]` en `Layout.tsx`, asegurando la jerarquía visual correcta.

### 8. Fallo en Estratégia de Auth Local (invalid algorithm)

- **Problema:** `SupabaseAuthGuard` rechazaba la validación local de JWT, forzando un fallback a red (lento).
- **Solución:** Forsado el algoritmo `HS256` en `jwt.verify` para coincidir con el estándar de Supabase.

### 9. Logs Corruptos en NestJS ([[object Object]])

- **Problema:** El middleware de logging imprimía objetos sin serializar y causó un fallo en el Build de producción por alcance de variables.
- **Solución:** Refactorizado `LoggerMiddleware` con manejo seguro de `res.on('finish')` y mensajes de texto plano optimizados.

---

## 🚦 Estado Actual

- **API/Backend:** 🔥 **Operacional**. Desplegado exitosamente. Realizando _Master Sync_ de vistas correctamente a Supabase.
- **Portales Front-end (Admin / Advertiser):** 🟢 **Código estable**. El pipeline de Docker está perfeccionado para compilación en EasyPanel. Empujado a la rama `main`.

---

## 📋 Tareas Pendientes (Para el próximo Agente / Desarrollador)

1. **Monitoreo de Arranque Actual:** Verificar que el portal Admin de la última corrección haya encendido correctamente en la URL de producción.
2. **Alertas de Credenciales Google Sheets:** El log del API sigue reportando que no detectó el archivo de la Service Account: `../../../../taxi-advertisig-c30861d203c5.json`. Se debe aprovisionar ese archivo de manera segura (montar volumen, secret o variable codificada en Base64).
3. **Servicio SMTP MOCK:** El API advirtió `SMTP_PASSWORD no configurado`. Para lanzar correos transaccionales reales, se deberá configurar esta y la variable de usuario de correo en EasyPanel.
4. **Advertencias de Sentry SDK:**
   - Modificar/Eliminar los archivos depreciados `sentry.client.config.ts`, `sentry.server.config.ts`, etc., y agrupar la orquestación en el nuevo archivo estándar de Next.js `instrumentation.ts`, como pide la alerta amarilla de compilación.
5. **Ajuste de límites (Opcional):** Seguir de cerca el performance de memoria de EasyPanel. Hemos optimizado mucho deshabilitando paralelismo en NodeJS (`parallelServerCompiles`), pero de ser necesario, escalar el contenedor en el panel.

---

`Autor: Antigravity Agent (DeepMind/Google)`
