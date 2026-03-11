// backend/api/index.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import express from 'express';

let cachedApp: any;

const createNestServer = async () => {
  if (cachedApp) return cachedApp;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir localhost, el dominio oficial y subdominios de vercel (previews)
      if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app') || origin === 'https://tad-dashboard.vercel.app') {
        callback(null, true);
      } else {
        callback(null, true); // En desarrollo somos permisivos, en prod Vercel filtra
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id',
  });

  app.setGlobalPrefix('api');

  // BigInt Serialization fix
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  await app.init();
  cachedApp = expressApp;
  return expressApp;
};

export default async (req: any, res: any) => {
  // Manejo de Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
