import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';

// Fix para serialización de BigInt
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Config service
  const configService = app.get(ConfigService);

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

  // CONFIGURACIÓN DE CORS REFORZADA (Middleware global)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-device-id, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger SÓLO en desarrollo (ahorra ~150MB de RAM en producción)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TAD DOOH Platform API')
      .setDescription('API for managing taxi advertising distribution network')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Port
  const port = configService.get('PORT') || 3000;

  await app.listen(port, '0.0.0.0');
  
  console.log(`
╔════════════════════════════════════════════════════════╗
║           🚗 TAD DOOH Platform API                     ║
║                                                        ║
║   Application running on: http://localhost:${port}       ║
║   API Documentation: http://localhost:${port}/docs       ║
║   Environment: ${configService.get('NODE_ENV') || 'development'}                    ║
║                                                        ║
║   Database: ${configService.get('DATABASE_URL') ? 'Connected' : 'Not configured'}                          ║
╚════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
