/**
 * TAD DOOH - Next.js API Proxy
 * 
 * Este proxy elimina el 100% de los errores CORS redireccionando todas las
 * peticiones del navegador a través del servidor Next.js (mismo dominio),
 * que a su vez llama al backend NestJS server-to-server (sin restricciones CORS).
 * 
 * Browser → dashboard.host/api/proxy/* → NestJS api.host/api/*
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';
import http from 'http';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') 
  || 'https://proyecto-ia-tad-api.rewvid.easypanel.host';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  // Construir la ruta del backend
  const pathStr = Array.isArray(path) ? path.join('/') : path || '';
  const queryString = new URLSearchParams(
    Object.entries(req.query)
      .filter(([key]) => key !== 'path')
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || ''])
  ).toString();
  
  const targetUrl = `${BACKEND_URL}/api/${pathStr}${queryString ? `?${queryString}` : ''}`;

  try {
    // Preparar headers, excluyendo los que causarían conflictos
    const forwardHeaders: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    
    if (req.headers['authorization']) {
      forwardHeaders['Authorization'] = req.headers['authorization'] as string;
    }

    // Hacer la petición al backend (server-to-server, sin CORS)
    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });

    // Copiar los headers de respuesta pertinentes
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Añadir headers CORS permisivos en la respuesta del proxy
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');

    const responseStatus = response.status;
    
    // Intentar parsear como JSON, si falla devolver texto plano
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    res.status(responseStatus).json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[PROXY] Error forwarding to ${targetUrl}:`, errorMessage);
    res.status(503).json({ 
      error: 'Backend unavailable',
      message: errorMessage,
      targetUrl 
    });
  }
}
