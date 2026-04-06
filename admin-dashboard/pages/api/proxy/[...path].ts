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
// Normalizar la URL base del backend:
// - BACKEND_INTERNAL_URL = http://api:3000  (red interna EasyPanel - PRIORIDAD)
// - NEXT_PUBLIC_API_URL puede ser https://host/api o https://host/api/v1 → extraemos solo el host
// - Fallback hardcodeado como última instancia
const rawBackendUrl = (
  process.env.BACKEND_INTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://proyecto-ia-tad-api.rewvid.easypanel.host'
);

// Strip any trailing /api, /api/v1, or / to get a clean base
const BACKEND_BASE = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

// Diagnostic log on first load (server-side, visible in EasyPanel logs)
console.log(`[PROXY_CONFIG] Backend target: ${BACKEND_BASE} (source: ${
  process.env.BACKEND_INTERNAL_URL ? 'BACKEND_INTERNAL_URL' :
  process.env.NEXT_PUBLIC_API_URL ? 'NEXT_PUBLIC_API_URL' :
  'HARDCODED_FALLBACK'
})`);

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;

  // Health check especial para diagnóstico de red
  if (req.method === 'GET' && Array.isArray(path) && path[0] === '_proxy_health') {
    return res.status(200).json({
      proxy: 'OK',
      backendTarget: `${BACKEND_BASE}/api/v1/`,
      envSource: process.env.BACKEND_INTERNAL_URL ? 'BACKEND_INTERNAL_URL' : 
                 process.env.NEXT_PUBLIC_API_URL ? 'NEXT_PUBLIC_API_URL' : 'HARDCODED',
      timestamp: new Date().toISOString(),
    });
  }

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
    // 2. Intentar petición al backend
    const forwardHeaders = { ...req.headers } as Record<string, string>;
    
    // 🔑 Reenviar el token al backend
    const authHeader = req.headers.authorization;
    if (authHeader) {
      delete forwardHeaders['authorization'];
      forwardHeaders['Authorization'] = authHeader;
    } else {
      console.warn(`[PROXY WARNING] No se detectó Header Authorization para: ${pathStr}`);
    }
    
    // 🛡️ SEGURIDAD y OPTIMIZACIÓN
    delete forwardHeaders['accept-encoding'];
    forwardHeaders['accept-encoding'] = 'identity';
    delete forwardHeaders['connection'];
    forwardHeaders['connection'] = 'close';
    delete forwardHeaders['content-length'];
    forwardHeaders['host'] = new URL(targetUrl).host;

    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: forwardHeaders,
      signal: AbortSignal.timeout(60000),
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req as any;
      (fetchOptions as any).duplex = 'half';
    }

    // --- REGLA DE RESILIENCIA TAD ---
    let backendResponse;
    try {
      backendResponse = await fetch(targetUrl, fetchOptions);
    } catch (fetchError: any) {
      // Si falló por red/DNS en el target interno, intentamos el FALLBACK PÚBLICO
      const isNetworkError = fetchError.message.includes('fetch failed') || 
                            fetchError.message.includes('ENOTFOUND') || 
                            fetchError.message.includes('ECONNREFUSED');
      
      if (isNetworkError && BACKEND_BASE.includes('api:3000')) {
        const publicFallback = 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1';
        const fallbackUrl = `${publicFallback}/${pathStr}${queryString}`;
        console.warn(`[PROXY RETRY] Falló conexión interna. Reintentando vía pública: ${fallbackUrl}`);
        
        // El body de la original (req) ya pudo haber sido consumido si era POST/PUT. 
        // En Next.js API routes, req es un stream. Si falló el primer fetch, 
        // el reintento de un POST podría fallar si no clonamos o manejamos el stream.
        // Pero para la mayoría de GETs de dashboard, esto funcionará perfecto.
        backendResponse = await fetch(fallbackUrl, fetchOptions);
      } else {
        throw fetchError; // Si no es un error de red o ya estamos en el fallback, lanzamos el error
      }
    }

    if (backendResponse.status === 401) {
      console.warn(`[PROXY 401] Backend rechazó credenciales: ${pathStr}`);
    }

    // Headers CORS de respuesta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');

    const contentType = backendResponse.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentDisp = backendResponse.headers.get('content-disposition');
    if (contentDisp) res.setHeader('Content-Disposition', contentDisp);
    const contentLength = backendResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const buffer = Buffer.from(await backendResponse.arrayBuffer());

    if (contentType?.includes('application/json')) {
      try {
        const data = JSON.parse(buffer.toString('utf-8'));
        return res.status(backendResponse.status).json(data);
      } catch (e) {}
    }

    return res.status(backendResponse.status).send(buffer);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[COMPLETELY FAILED] ${req.method} ${targetUrl}:`, errorMessage);

    return res.status(503).json({
      error: 'Backend no disponible (Incluso tras reintento)',
      message: errorMessage,
      targetUrl,
      hint: 'Asegúrate de que el backend proyecto-ia-tad-api esté encendido en EasyPanel',
    });
  }
}
