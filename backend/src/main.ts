import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { createWinstonLogger } from './utils/winston.logger';
import { initializeSentry } from './utils/sentry';

// Fix para serialización de BigInt
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Initialize Sentry before anything else
initializeSentry();

async function bootstrap() {
  console.log('🚀 TAD DOOH API - Iniciando proceso de arranque...');
  
  try {
    const logger = createWinstonLogger();
    const app = await NestFactory.create(AppModule, { logger });

    // Config service
    const configService = app.get(ConfigService);
    const nodeEnv = configService.get('NODE_ENV') || 'development';
    const port = configService.get('PORT') || 3000;

    console.log(`🔧 Entorno Detectado: ${nodeEnv}`);
    console.log(`🔧 Puerto Configurado: ${port}`);

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

    // CONFIGURACIÓN DE CORS MANUAL (MÁXIMA COMPATIBILIDAD CON PROXY/EASYPANEL)
    app.use((req, res, next) => {
      // Intentamos detectar el origen o usamos el configService
      const origin = req.header('Origin') || '*';
      
      // Permitir cualquier dashboard y localhost en dev, o el configurado en prod
      const allowedOriginsStr = configService.get('CORS_ORIGIN') || 'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host';
      const allowedOrigins = allowedOriginsStr.split(',');

      if (allowedOrigins.includes(origin) || allowedOriginsStr === '*') {
         res.header('Access-Control-Allow-Origin', origin);
      } else {
         // Fallback al dashboard principal si el origen no está explícitamente en la lista
         res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
      }
      
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-device-id, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    });

    // API prefix
    app.setGlobalPrefix('api');

    // Swagger SÓLO en desarrollo (ahorra ~150MB de RAM en producción)
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

    // Escuchar en todas las interfaces para Docker
    await app.listen(port, '0.0.0.0');
    
    console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║           🚗 TAD DOOH Platform API                     ║
  ║   URL: http://0.0.0.0:${port}                           ║
  ║   Status: 🔥 OPERACIONAL                               ║
  ╚════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ ERROR FATAL DURANTE EL ARRANQUE DEL API:', error);
    process.exit(1);
  }
}

bootstrap();
