# 🚨 Monitoreo de Errores e Instrumentación con Sentry

Este documento detalla la instrumentación de Sentry en la plataforma TAD DOOH para la captura de errores en tiempo real y el monitoreo del rendimiento en Next.js (Admin/Advertiser/Driver) y NestJS (API).

---

## 🏛️ 1. Orquestación Next.js 15 (Archivo `instrumentation.ts`)

Para evitar advertencias de compilación y asegurar que Sentry se inicialice antes de que se levante cualquier código del servidor Next.js, se debe migrar la inicialización al estándar `instrumentation.ts` en la raíz de cada app frontend (`apps/admin`, `apps/advertiser`, `apps/driver`).

### Configuración del Archivo `instrumentation.ts`

Crea o actualiza el archivo `instrumentation.ts` en la carpeta `src/` (o raíz) de la aplicación frontend:

```typescript
// apps/admin/src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}
```

* **Beneficio:** Sentry se inicializará de forma nativa tanto en entornos Node.js normales como en funciones de Edge (middleware, etc.), eliminando warnings de compilación durante el bundle.

---

## 🛠️ 2. Instrumentación NestJS (API Backend)

En el backend NestJS, Sentry se inyecta como un interceptor global de excepciones para registrar errores HTTP 500 no controlados.

### Interceptor Global de Sentry

```typescript
// apps/api/src/common/interceptors/sentry.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        error: (exception) => {
          // No reportamos excepciones controladas (ej: 400 Bad Request, 404 Not Found)
          const status = exception.status || 500;
          if (status >= 500) {
            Sentry.captureException(exception);
          }
        },
      }),
    );
  }
}
```

---

## 📱 3. Captura en el Tablet Player (PWA)

El reproductor de las tablets (`apps/tablet-player`) puede reportar errores de red o de decodificación de video en Fully Kiosk Browser mediante un script ligero en HTML:

```html
<script src="https://browser.sentry-cdn.com/7.x/bundle.min.js" crossorigin="anonymous"></script>
<script>
  Sentry.init({
    dsn: "https://abcd@sentry.io/1234",
    release: "player@5.3",
    environment: "production",
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.05
  });

  // Capturar errores del decodificador de video
  document.getElementById('video-el').addEventListener('error', function(e) {
    Sentry.captureMessage(`Fallo en reproducción de video: ${e.target.error.message}`, 'error');
  });
</script>
```

---

## 🔔 4. Reglas de Enrutamiento de Alertas en Sentry

Para no saturar el email de administración, se recomiendan tres reglas en el panel de Sentry:

1. **Alerta Crítica (Inmediata):** Cualquier error que involucre la pasarela de pagos (Stitch Pay) o cálculo de balance financiero. Envío a canal de Slack y SMS/Email.
2. **Alerta Operativa (Agrupada):** Errores de sincronización de tablets o heartbeats fallidos. Se agrupan en resúmenes diarios.
3. **Alerta Silenciosa:** Errores de red del lado del cliente (túneles sin conexión de tablets) se registran en Sentry para estadísticas pero no gatillan alertas directas.
