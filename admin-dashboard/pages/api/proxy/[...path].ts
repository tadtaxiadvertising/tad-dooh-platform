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
    bodyParser: {
      sizeLimit: '50mb',
    },
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

  const targetUrl = `${BACKEND_BASE}/api/${pathStr}${queryString}`;

  console.log(`[PROXY] ${req.method} ${pathStr} → ${targetUrl}`);

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-device-id');
    return res.status(200).end();
  }

  try {
    // Headers a reenviar al backend
    const forwardHeaders: Record<string, string> = {};

    // Reenviar content-type (importante para multipart/form-data)
    if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type'];
    }

    // Reenviar token de autenticación
    if (req.headers['authorization']) {
      forwardHeaders['Authorization'] = req.headers['authorization'] as string;
    }

    // Reenviar device ID para endpoints de tablet
    if (req.headers['x-device-id']) {
      forwardHeaders['x-device-id'] = req.headers['x-device-id'] as string;
    }

    // Preparar body (solo para métodos que lo permiten)
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Para uploads, no re-serialize el body — pasar como stream no es posible
        // En su lugar, serializar como JSON el body ya parseado
        body = JSON.stringify(req.body);
        forwardHeaders['Content-Type'] = 'application/json';
      } else {
        body = JSON.stringify(req.body);
        if (!forwardHeaders['Content-Type']) {
          forwardHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    // Ejecutar la petición al backend (server-to-server: sin CORS, sin proxy issues)
    const backendResponse = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: forwardHeaders,
      body,
      // Timeout de 30s para operaciones largas (uploads, queries complejas)
      signal: AbortSignal.timeout(30000),
    });

    // Headers CORS de respuesta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');

    // Propagar Content-Type del backend
    const contentType = backendResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const responseText = await backendResponse.text();

    // Intentar devolver JSON si corresponde, texto plano si no
    if (contentType?.includes('application/json')) {
      try {
        const data = JSON.parse(responseText);
        return res.status(backendResponse.status).json(data);
      } catch {
        // Parseo falló, devolver texto
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
