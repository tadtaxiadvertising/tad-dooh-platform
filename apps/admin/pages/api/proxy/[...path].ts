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
  || 'https://tad-api.rewvid.easypanel.host'
);

// Strip any trailing /api, /api/v1, or / to get a clean base
const BACKEND_BASE = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

// Diagnostic removed for Zero-Waste audit.

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
    const getForwardHeaders = (target: string) => {
      const headers = { ...req.headers } as Record<string, string>;
      
      // 🔑 Reenviar el token al backend (Normalizar a 'Authorization' con 'A' mayúscula)
      let authHeader = req.headers.authorization || req.headers.Authorization;
      
      // 🛡️ FALLBACK: Si no hay header Authorization, intentar extraerlo de la cookie 'sb-access-token'
      // Esto resuelve casos donde el interceptor del cliente falla o hay condiciones de carrera tras el login.
      if (!authHeader) {
        const cookieToken = req.cookies['sb-access-token'];
        if (cookieToken) {
          authHeader = `Bearer ${cookieToken}`;
        }
      }

      if (authHeader) {
        delete headers['authorization'];
        delete headers['Authorization'];
        headers['Authorization'] = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      }
      
      // 🛡️ SEGURIDAD y OPTIMIZACIÓN
      delete headers['accept-encoding'];
      headers['accept-encoding'] = 'identity';
      delete headers['connection'];
      headers['connection'] = 'close';
      delete headers['content-length'];
      
      // CRÍTICO: El Host DEBE coincidir con el target de la red (especialmente en EasyPanel/Nginx)
      headers['host'] = new URL(target).host;
      
      return headers;
    };

    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: getForwardHeaders(targetUrl),
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
    } catch (fetchError: unknown) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      // Si falló por red/DNS en el target interno, intentamos el FALLBACK PÚBLICO
      const isNetworkError = errorMessage.includes('fetch failed') || 
                            errorMessage.includes('ENOTFOUND') || 
                            errorMessage.includes('ECONNREFUSED');
      
      if (isNetworkError && BACKEND_BASE.includes('api:3000')) {
        const publicFallback = 'https://tad-api.rewvid.easypanel.host/api/v1';
        const fallbackUrl = `${publicFallback}/${pathStr}${queryString}`;
        
        // REGENAR HEADERS: El host cambió a la URL pública
        fetchOptions.headers = getForwardHeaders(fallbackUrl);
        
        backendResponse = await fetch(fallbackUrl, fetchOptions);
      } else {
        throw fetchError; 
      }
    }

    if (backendResponse.status === 401) {
      // 401 Unauthorized log justified for security auditing
      const hasOriginalHeader = req.headers.authorization || req.headers.Authorization;
      const finalAuthHeader = (backendResponse.config.headers as any)?.['Authorization'];
      const authStatus = finalAuthHeader ? (hasOriginalHeader ? 'PRESENTE' : 'FALLBACK_COOKIE') : 'AUSENTE';
      
      console.error(`[PROXY 401] Backend rechazó credenciales para: ${pathStr} | Auth: ${authStatus}`);
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
      hint: 'Asegúrate de que el backend tad-api esté encendido en EasyPanel',
    });
  }
}


