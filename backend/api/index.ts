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
  
  // CORS interno de NestJS como respaldo
  app.enableCors({
    origin: '*', // En serverless, el filtrado real lo haremos en el handler de abajo
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // BigInt Serialization fix
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  await app.init();
};

export default async (req: any, res: any) => {
  // 1. INYECCIÓN FORZADA DE CABECERAS (Nivel Infraestructura)
  res.setHeader('Access-Control-Allow-Origin', 'https://tad-dashboard.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // 2. MANEJO MANUAL DE PREFLIGHT (Crítico para evitar el net::ERR_FAILED)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await createNestServer(server);
    server(req, res);
  } catch (err) {
    console.error('NestJS Bootstrap Error:', err);
    res.status(500).json({ error: 'Internal Server Error during bootstrap', details: err.message });
  }
};
