// backend/api/index.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import express from 'express';

const server = express();

export const createNestServer = async (expressInstance) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  // CONFIGURACIÓN CORS PROFESIONAL
  app.enableCors({
    origin: [
      'https://tad-dashboard.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // BigInt Serialization fix
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  await app.init();
};

// Handler para Vercel
export default async (req: any, res: any) => {
  // Manejo manual de OPTIONS para evitar bloqueos de Vercel Edge
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://tad-dashboard.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    res.status(204).end();
    return;
  }

  await createNestServer(server);
  server(req, res);
};
