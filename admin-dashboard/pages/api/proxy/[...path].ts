/**
 * TAD DOOH - Next.js API Proxy
 *
 * Este proxy elimina el 100% de los errores CORS y 502 por URL vacía.
 * Las variables de entorno en este archivo se leen en RUNTIME (no build-time),
 * por lo que funcionan correctamente en EasyPanel Free Tier.
 *
 * Flujo: Browser → /api/proxy/* → NestJS backend (server-to-server)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// BACKEND_INTERNAL_URL = variable de entorno del servidor (runtime, no build-time)
// En EasyPanel: configurar como Environment Variable normal (NO Build Arg)
// Opciones en orden de prioridad:
//   1. BACKEND_INTERNAL_URL=http://api:3000  (red interna Docker de EasyPanel - más rápido)
//   2. NEXT_PUBLIC_API_URL=https://...easypanel.host/api  (URL pública - fallback)
//   3. URL hardcodeada - último recurso
const BACKEND_BASE = (
  process.env.BACKEND_INTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')
  || 'https://proyecto-ia-tad-api.rewvid.easypanel.host'
).replace(/\/$/, ''); // quitar trailing slash

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;

  // Construir ruta del backend
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');

  // Construir query string (excluyendo el parámetro 'path' de la ruta dinámica)
  const queryParams = Object.entries(req.query)
    .filter(([key]) => key !== 'path')
    .map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v || '')] as [string, string]);
  const queryString = queryParams.length > 0
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';

  const targetUrl = `${BACKEND_BASE}/api/v1/${pathStr}${queryString}`;

  console.log(`[PROXY] ${req.method} ${pathStr} → ${targetUrl}`);

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-device-id');
    return res.status(200).end();
  }

  try {
    // 2. Reenviar TODO al backend
    const forwardHeaders = { ...req.headers } as Record<string, string>;
    
    // 🔑 ESTO ES LO CRÍTICO: Reenviar el token al backend
    const authHeader = req.headers.authorization;
    if (authHeader) {
      delete forwardHeaders['authorization'];
      forwardHeaders['Authorization'] = authHeader;
    } else {
      console.warn(`[PROXY WARNING] No se detectó Header Authorization para: ${pathStr}`);
    }
    
    // Update Host so backend doesn't reject it
    forwardHeaders['host'] = new URL(targetUrl).host;

    // Ejecutar la petición al backend
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: forwardHeaders,
      signal: AbortSignal.timeout(30000),
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req as any;
      (fetchOptions as any).duplex = 'half';
    }

    const backendResponse = await fetch(targetUrl, fetchOptions);

    if (backendResponse.status === 401) {
      console.warn(`[PROXY 401] El backend rechazó las credenciales para: ${pathStr}`);
    }

    // Headers CORS de respuesta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');

    const contentType = backendResponse.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const responseText = await backendResponse.text();

    if (contentType?.includes('application/json')) {
      try {
        const data = JSON.parse(responseText);
        return res.status(backendResponse.status).json(data);
      } catch {
        // Fallback
      }
    }

    return res.status(backendResponse.status).send(responseText);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const isTimeout = errorMessage.includes('TimeoutError') || errorMessage.includes('abort');

    console.error(`[PROXY ERROR] ${req.method} ${targetUrl}:`, errorMessage);

    return res.status(isTimeout ? 504 : 503).json({
      error: isTimeout ? 'Backend timeout' : 'Backend no disponible',
      message: errorMessage,
      targetUrl,
      hint: 'Verifica que BACKEND_INTERNAL_URL esté configurada en EasyPanel Environment Variables',
    });
  }
}
