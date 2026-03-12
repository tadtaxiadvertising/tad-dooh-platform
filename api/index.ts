// backend/api/index.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../backend/src/app.module';
import { PrismaClientExceptionFilter } from '../backend/src/common/filters/prisma-exception.filter';
import express from 'express';

let cachedApp: any;

const createNestServer = async () => {
  if (cachedApp) return cachedApp;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter);
  app.enableCors({
    origin: true, // Echoes the origin header
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id, Access-Control-Allow-Origin',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  // BigInt Serialization fix
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  await app.init();
  cachedApp = expressApp;
  return expressApp;
};

export default async (req: any, res: any) => {
  // Manejo de Preflight (CORS) — CRÍTICO para Vercel Serverless
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id, Access-Control-Allow-Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    return res.status(204).end();
  }

  try {
    const server = await createNestServer();
    return server(req, res);
  } catch (err) {
    console.error('NestJS Bootstrap Error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};
