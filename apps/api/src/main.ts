import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { Logger } from '@nestjs/common';

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
    
    // Habilitar CORS para que el simulador y la PWA puedan comunicarse
    app.enableCors();

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
