# 📊 Logging and Performance Optimization

Guía para mejorar el sistema de logging, eliminando interrupciones de página y optimizando el rendimiento de loading.

---

## 🎯 Problema Actual

Actualmente hay **una página que aparece antes del dashboard** (splash screen de loading):

```
1. Usuario carga http://localhost:3001
2. Aparece página /index.tsx con "Iniciando TAD OS" ← ❌ Problema
3. Se redirige a /admin/dashboard
4. Carga el dashboard
```

**Causa:** `router.replace()` en useEffect causa doble renderización.

---

## ✅ Solución: Eliminar Splash Screen

### Paso 1: Actualizar `apps/admin/pages/index.tsx`

Reemplazar la redirección lenta por una más eficiente:

```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirección inmediata sin UI intermediaria
    if (router.pathname === '/') {
      router.replace('/admin/dashboard', undefined, { shallow: false });
    }
  }, [router]);

  // No renderizar nada - dejar que middleware maneje la redirección
  return null;
}
```

### Paso 2: Optimi middleware redirect

Actualizar `apps/admin/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeTokenRole(token: string): string {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return 'GUEST';
    const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.app_metadata?.role || decoded.role || 'GUEST';
  } catch {
    return 'GUEST';
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('sb-access-token')?.value;

  // 🚀 OPTIMIZED: Root redirect happens BEFORE page render
  if (pathname === '/') {
    // If authenticated, go to dashboard; else go to login
    if (session && decodeTokenRole(session) === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Auth routes
  if (pathname === '/admin/login' || pathname === '/login') {
    if (session && decodeTokenRole(session) === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!session || decodeTokenRole(session) !== 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/'
  ],
};
```

**Impacto:**
- ✅ Sin splash screen
- ✅ Redirección inmediata (servidor)
- ✅ Experiencia de usuario fluida

---

## 📋 Logging Mejorado

### 1. Crear Sistema de Logging Centralizado

Nuevo archivo: `libs/logging/logger.ts`

```typescript
/**
 * TAD Logger - Centralizado para debugging
 * Niveles: DEBUG < INFO < WARN < ERROR
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, any>;
  stackTrace?: string;
  performanceMs?: number;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Mantener últimos 500 logs en memoria
  private persistToLocalStorage = false;

  constructor(defaultLevel?: LogLevel) {
    this.logLevel = defaultLevel || (
      typeof window !== 'undefined' && 
      process.env.NEXT_PUBLIC_LOG_LEVEL === 'debug' 
        ? LogLevel.DEBUG 
        : LogLevel.INFO
    );
    
    // Persistir logs si está habilitado
    this.persistToLocalStorage = 
      typeof window !== 'undefined' && 
      process.env.NEXT_PUBLIC_LOG_PERSISTENCE === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, module, message, performanceMs } = entry;
    const perf = performanceMs ? ` (${performanceMs}ms)` : '';
    return `[${timestamp}] ${level} [${module}]${perf}: ${message}`;
  }

  private storeLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Persistir en localStorage si está habilitado
    if (this.persistToLocalStorage) {
      try {
        localStorage.setItem('tad_logs', JSON.stringify(this.logs));
      } catch (e) {
        // Quota exceeded, no es crítico
      }
    }
  }

  private log(level: LogLevel, module: string, message: string, data?: Record<string, any>, performanceMs?: number): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      performanceMs,
    };

    this.storeLog(entry);

    // Console output con colores
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: #999',
      [LogLevel.INFO]: 'color: #0066cc',
      [LogLevel.WARN]: 'color: #ff9900',
      [LogLevel.ERROR]: 'color: #ff0000',
    };

    const formatted = this.formatLog(entry);
    
    if (typeof window !== 'undefined' && typeof console !== 'undefined') {
      console.log(`%c${formatted}`, colors[level]);
      if (data) console.log('  Data:', data);
    }
  }

  debug(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, module, message, data);
  }

  // Performance tracking
  perf(module: string, fn: () => void, label?: string): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    this.log(LogLevel.DEBUG, module, `Performance: ${label || 'operation'}`, { durationMs: duration }, duration);
  }

  async perfAsync<T>(module: string, fn: () => Promise<T>, label?: string): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.log(LogLevel.DEBUG, module, `Performance: ${label || 'async operation'}`, { durationMs: duration }, duration);
    return result;
  }

  // Export logs para debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Limpiar logs
  clearLogs(): void {
    this.logs = [];
    if (this.persistToLocalStorage) {
      localStorage.removeItem('tad_logs');
    }
  }

  // Obtener logs filtrados
  getLogs(module?: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log => 
      (!module || log.module === module) &&
      (!level || log.level === level)
    );
  }
}

export const logger = typeof window !== 'undefined' 
  ? new Logger()
  : null;

export default Logger;
```

### 2. Usar en Componentes

```typescript
// En _app.tsx
import { logger } from '@libs/logging/logger';

function AppWrapper({ Component, pageProps, router }: AppProps) {
  useEffect(() => {
    // Log navegación
    logger?.info('Router', `Navegating to ${router.pathname}`);
  }, [router.pathname]);

  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
```

```typescript
// En componentes
import { logger } from '@libs/logging/logger';

export function Dashboard() {
  useEffect(() => {
    // Log con performance
    logger?.perfAsync('Dashboard', async () => {
      const data = await fetchDashboardData();
      return data;
    }, 'fetch-dashboard-data');
  }, []);

  return <div>{/* ... */}</div>;
}
```

### 3. Comando para Ver Logs

```bash
# En consola del navegador:
# Ver todos los logs
logger.getLogs();

# Exportar logs para debugging
copy(logger.exportLogs());

# Filtrar por módulo
logger.getLogs('Dashboard');

# Limpiar logs
logger.clearLogs();
```

---

## 🚀 Optimizaciones de Performance

### 1. Lazy Loading de Componentes

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Cargando...</div>,
  ssr: false, // Cargar solo en cliente
});

export default function Dashboard() {
  return (
    <div>
      <HeavyChart />
    </div>
  );
}
```

### 2. Image Optimization

```typescript
import Image from 'next/image';

export function OptimizedImage() {
  return (
    <Image
      src="/dashboard.png"
      alt="Dashboard"
      width={1200}
      height={600}
      priority={true} // Para hero images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### 3. React Query Optimization

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos
      retry: 3,
      refetchOnWindowFocus: false, // Evitar refetch en tab switch
    },
  },
});
```

---

## 📈 Monitoreo en Producción

### Enviar Logs a Backend

```typescript
async function sendLogsToServer() {
  if (!logger) return;
  
  const logs = logger.getLogs();
  
  await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: window.sessionId,
      userId: getCurrentUserId(),
      timestamp: new Date().toISOString(),
      logs: logs.slice(-100), // Últimos 100 logs
      userAgent: navigator.userAgent,
      url: window.location.href,
    }),
  });
}

// Enviar logs cada 5 minutos
setInterval(sendLogsToServer, 5 * 60 * 1000);
```

### Backend API para Logs

```typescript
// apps/api/src/logs/logs.controller.ts
import { Controller, Post, Body } from '@nestjs/common';

@Controller('logs')
export class LogsController {
  @Post()
  async receiveLogs(@Body() payload: any) {
    // Guardar en base de datos o servicio de logging
    console.log('📊 Logs recibidos:', {
      userId: payload.userId,
      logsCount: payload.logs.length,
      timestamp: payload.timestamp,
    });
    
    // Procesar alertas si es necesario
    if (payload.logs.some(log => log.level === 'ERROR')) {
      // Notificar al equipo de OPS
    }
    
    return { success: true };
  }
}
```

---

## 📋 Checklist de Implementación

- [ ] Crear `libs/logging/logger.ts`
- [ ] Actualizar `apps/admin/pages/index.tsx` (eliminar splash)
- [ ] Optimizar `apps/admin/middleware.ts`
- [ ] Implementar logging en componentes principales
- [ ] Agregar `NEXT_PUBLIC_LOG_LEVEL=debug` a `.env.local`
- [ ] Agregar `NEXT_PUBLIC_LOG_PERSISTENCE=true` a `.env.local`
- [ ] Probar en navegador: `logger.getLogs()`
- [ ] Configurar envío de logs a backend
- [ ] Monitorear en Sentry/DataDog (opcional)

---

## 🎯 Resultados Esperados

### Antes

```
❌ Loading page visible for 2-3 seconds
❌ Confusing UX with splash screen
❌ No easy way to debug issues
❌ Hard to track performance
```

### Después

```
✅ Instantaneous redirect (no splash)
✅ Smooth user experience
✅ Structured logging with levels
✅ Performance metrics tracked
✅ Easy debugging in browser console
✅ Session analytics available
```

---

## 📚 Referencias

- [Next.js Performance](https://nextjs.org/learn/foundations/how-nextjs-works/rendering)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Middleware in Next.js 15](https://nextjs.org/docs/advanced-features/middleware)
