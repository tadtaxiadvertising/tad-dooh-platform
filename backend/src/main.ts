import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

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

  // CONFIGURACIÓN DE CORS REFORZADA
  app.enableCors({
    origin: [
      'https://tad-dashboard.vercel.app',
      'https://tad-dooh-platform.vercel.app',
      'https://tad-admin.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'null', // Necesario para FullyKiosk Browser (file://)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TAD DOOH Platform API')
    .setDescription('API for managing taxi advertising distribution network')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('devices', 'Device management operations')
    .addTag('campaigns', 'Campaign management operations')
    .addTag('media', 'Media upload and management')
    .addTag('analytics', 'Analytics and metrics')
    .addTag('sync', 'Device synchronization')
    .addTag('commands', 'Remote device commands')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Port
  const port = configService.get('PORT') || 3000;

  await app.listen(port);
  
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
