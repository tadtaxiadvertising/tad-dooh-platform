import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
const express = require('express');

let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
    const expressApp = express();
    expressApp.use(express.json());
    
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.enableCors();
    app.setGlobalPrefix('api');
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  try {
    const server = await bootstrapServer();
    return server(req, res);
  } catch (error) {
    console.error('Fatal Bootstrap Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
