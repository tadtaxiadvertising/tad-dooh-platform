import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

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
    // Forzamos el buffer de logs para capturar errores prematuros de inyección
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      logger: ['error', 'warn', 'log', 'debug'], 
    });

    // Prevención de fugas de conexiones (Auditoría 07)
    const prismaService = app.get(PrismaService);
    app.enableShutdownHooks();

    app.setGlobalPrefix('api/v1', {
      exclude: ['api/health', '/'],
    });
    
    // SHELTER C-I1: CORS restringido a dominios TAD conocidos
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    const baseOrigins = [
      'https://tad-admin.rewvid.easypanel.host',
      'https://tad-driver.rewvid.easypanel.host',
      'https://tad-advertiser.rewvid.easypanel.host',
      'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host',
      'https://proyecto-ia-tad-player.rewvid.easypanel.host',
      'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host',
      'https://proyecto-ia-tad-driver.rewvid.easypanel.host',
    ];
    
    const allowedOrigins = [...new Set([...baseOrigins, ...envOrigins])];
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
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`), false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
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
