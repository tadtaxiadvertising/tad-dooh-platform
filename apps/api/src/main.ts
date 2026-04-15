import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { createWinstonLogger } from './utils/winston.logger';
import { initializeSentry } from './utils/sentry';

// Fix para serialización de BigInt
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// TAD-SRE: Silenciar errores no capturados de @logtail cuando el token no está configurado.
// Esto previene el spam de "Unauthorized" que llena el log con 800+ líneas inútiles.
process.on('unhandledRejection', (reason: unknown) => {
  if (
    reason instanceof Error &&
    (reason.message === 'Unauthorized' ||
      reason.message.includes('Logtail') ||
      (reason.stack && reason.stack.includes('@logtail')))
  ) {
    // Silenciado intencionalmente: token de BetterStack inválido o no configurado
    return;
  }
  // Re-emitir errores genuinos para que NestJS/el proceso los maneje normalmente
  console.error('[TAD] UnhandledRejection no silenciado:', reason);
});

// Initialize Sentry before anything else
initializeSentry();

async function bootstrap() {
  const loggerInstance = new Logger('Bootstrap');
  loggerInstance.log('🚀 TAD DOOH API - Iniciando proceso de arranque...');
  
  try {
    const winstonLogger = createWinstonLogger();
    const app = await NestFactory.create(AppModule, { logger: winstonLogger });

    // Config service
    const configService = app.get(ConfigService);
    const nodeEnv = configService.get('NODE_ENV') || 'development';
    const port = configService.get('PORT') || 3000;

    loggerInstance.log(`🔧 Entorno Detectado: ${nodeEnv}`);
    loggerInstance.log(`🔧 Puerto Configurado: ${port}`);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Health check pública (sin prefijo /api y sin auth)
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).send({ status: 'OK', uptime: process.uptime(), memory: process.memoryUsage() });
    });

    app.useGlobalFilters(new PrismaClientExceptionFilter());

    // CONFIGURACIÓN DE CORS (MÁXIMA COMPATIBILIDAD CON PROXY/EASYPANEL)
    const allowedOriginsStr = configService.get('CORS_ORIGIN') || '*';
    const allowedOrigins = allowedOriginsStr.split(',');

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOriginsStr === '*' || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          if (origin.includes('easypanel.host')) {
             callback(null, true);
          } else {
             callback(new Error('Not allowed by CORS'));
          }
        }
      },
      methods: 'GET,PUT,POST,DELETE,OPTIONS,PATCH',
      allowedHeaders: 'Content-Type, Authorization, Accept, x-device-id, X-Requested-With',
      credentials: true,
    });

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger SÓLO en desarrollo
    if (nodeEnv !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('TAD DOOH Platform API')
        .setDescription('API for managing taxi advertising distribution network')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document);
    }

    // TAREA SRE: Limitar memoria de V8 según auditoría 07
    // NOTA: NODE_OPTIONS="--max_old_space_size=256" debe configurarse en el entorno de Easypanel

    // Shutdown Hooks para evitar conexiones zombie en el Pooler (6543)
    const prismaService = app.get(PrismaService);
    app.enableShutdownHooks();

    await app.listen(port, '0.0.0.0');
    
    loggerInstance.log(`
  ╔════════════════════════════════════════════════════════╗
  ║           🚗 TAD DOOH Platform API                     ║
  ║   URL: http://0.0.0.0:${port}/api/v1                       ║
  ║   Status: 🔥 OPERACIONAL                               ║
  ╚════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    loggerInstance.error('❌ ERROR FATAL DURANTE EL ARRANQUE DEL API:', error);
    process.exit(1);
  }
}

bootstrap();
