import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { Logger, RequestMethod } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as crypto from 'crypto';

// Safe BigInt serialization for Prisma
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Only override toJSON if not already defined (prevents duplicate definitions)
if (!BigInt.prototype.toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
      // JWT_SECRET: si no está configurado, generar uno estable para evitar
      // crash-loop en Easypanel. En producción real, CONFIGURARLO en las env vars.
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
        logger.warn('⚠️ JWT_SECRET no configurado — se usó uno generado aleatoriamente. Los tokens se invalidarán al reiniciar.');
      }

      // Forzamos el buffer de logs para capturar errores prematuros de inyección
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      logger: ['error', 'warn', 'log', 'debug'], 
    });

    // Prevención de fugas de conexiones (Auditoría 07)
    const prismaService = app.get(PrismaService);
    app.enableShutdownHooks();

    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: '/', method: RequestMethod.GET },
        { path: 'api', method: RequestMethod.GET },
        { path: 'api/health', method: RequestMethod.GET },
        { path: 'api/v1', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
      ],
    });
    
    // SHELTER C-I1: CORS restringido a dominios TAD conocidos
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    const baseOrigins = [
      'https://tad-admin.rewvid.easypanel.host',
      'https://tad-driver.rewvid.easypanel.host',
      'https://tad-driver-flutter.rewvid.easypanel.host',
      'https://tad-advertiser.rewvid.easypanel.host',
      'https://tad-api.rewvid.easypanel.host',
      'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host',
      'https://proyecto-ia-tad-player.rewvid.easypanel.host',
      'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host',
      'https://proyecto-ia-tad-driver.rewvid.easypanel.host',
      'https://proyecto-ia-tad-simulator.rewvid.easypanel.host',
      'https://tad-simulator.rewvid.easypanel.host',
    ];
    
    const allowedOrigins = [...new Set([...baseOrigins, ...envOrigins])]
      .map((o) => o.replace(/\/$/, ''));
    const allowAllOrigins = allowedOrigins.includes('*');
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3000');
    }

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps / curl)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Strict allow-list for production origins
        const normalizedOrigin = origin.replace(/\/$/, '');
        if (allowAllOrigins || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        logger.warn(`[CORS] Blocked origin: ${origin}. Configure CORS_ORIGIN to allow it.`);
        callback(new Error(`CORS blocked for origin: ${origin}`), false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization, Idempotency-Key, X-Requested-With, X-Device-Id, X-Tablet-Id, X-Tablet-Key, X-Admin-Secret',
      credentials: true,
      optionsSuccessStatus: 204,
      preflightContinue: false,
    });

    // Register Global Exception Filter for standard error handling
    app.useGlobalFilters(new GlobalExceptionFilter());

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 TAD DOOH API Gateway Operativo en el puerto ${port}`);

  } catch (error) {
    // Esto atrapará el fallo fantasma de Prisma o Supabase durante el arranque
    logger.error('❌ CRASH FATAL DE ARRANQUE:', error instanceof Error ? error.stack : JSON.stringify(error));
    process.exit(1);
  }
}
bootstrap();