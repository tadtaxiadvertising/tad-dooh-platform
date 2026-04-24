import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Fix para serialización de BigInt (Crítico para que Prisma no falle en el primer query)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

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
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [
          'https://tad-admin.rewvid.easypanel.host',
          'https://tad-driver.rewvid.easypanel.host',
          'https://tad-advertiser.rewvid.easypanel.host',
        ];

    // En desarrollo, permitir localhost
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003');
    }

    app.enableCors({
      origin: allowedOrigins,
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
