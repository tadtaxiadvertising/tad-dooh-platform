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
    
    // 🛡️ SEGURIDAD: Evitar que el backend envíe Gzip
    delete forwardHeaders['accept-encoding'];
    forwardHeaders['accept-encoding'] = 'identity'; // Forzar sin compresión
    delete forwardHeaders['connection'];
    forwardHeaders['connection'] = 'close';
    delete forwardHeaders['content-length'];

    // Update Host so backend doesn't reject it
    forwardHeaders['host'] = new URL(targetUrl).host;

    // Ejecutar la petición al backend
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: forwardHeaders,
      signal: AbortSignal.timeout(60000), // 60 segundos para PDFs grandes
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

    // Reenviar Content-Type original
    const contentType = backendResponse.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // Reenviar Content-Disposition si existe (importante para nombres de archivo en descargas)
    const contentDisp = backendResponse.headers.get('content-disposition');
    if (contentDisp) res.setHeader('Content-Disposition', contentDisp);

    // Reenviar Content-Length para que el navegador sepa el tamaño real
    const contentLength = backendResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    // CRÍTICO: Para archivos binarios (PDF, imágenes), NO usar .text() pues corrompe los bytes.
    // Usamos arrayBuffer() para obtener los datos crudos y luego convertirlos a Buffer para Next.js.
    const buffer = Buffer.from(await backendResponse.arrayBuffer());

    // Si es JSON, intentamos mandarlo como tal por si el cliente espera un objeto parseado
    if (contentType?.includes('application/json')) {
      try {
        const data = JSON.parse(buffer.toString('utf-8'));
        return res.status(backendResponse.status).json(data);
      } catch (e) {
        // Fallback a enviar el buffer si falla el parseo
      }
    }

    return res.status(backendResponse.status).send(buffer);

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
