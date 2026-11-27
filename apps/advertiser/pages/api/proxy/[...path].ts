/**
 * TAD DOOH - Next.js API Proxy
 *
 * Este proxy elimina el 100% de los errores CORS y 502 por URL vacía.
 * Las variables de entorno en este archivo se leen en RUNTIME (no build-time),
 * por lo que funcionan correctamente en EasyPanel Free Tier.
 *
 * Flujo: Browser → /api/proxy/* → NestJS backend (server-to-server)
 */

import type { NextApiRequest, NextApiResponse } from "next";

// BACKEND_INTERNAL_URL = variable de entorno del servidor (runtime, no build-time)
// En EasyPanel: configurar como Environment Variable normal (NO Build Arg)
// Opciones en orden de prioridad:
// 1. BACKEND_INTERNAL_URL=http://api:3000 (red interna Docker de EasyPanel - más rápido)
// 2. NEXT_PUBLIC_API_URL=https://...easypanel.host/api (URL pública - fallback)
// 3. URL hardcodeada - último recurso
// Normalizar la URL base del backend:
// - BACKEND_INTERNAL_URL = http://api:3000 (red interna EasyPanel - PRIORIDAD)
// - NEXT_PUBLIC_API_URL puede ser https://host/api o https://host/api/v1 → extraemos solo el host
// - Fallback hardcodeado como última instancia
const rawBackendUrl =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://proyecto-ia-tad-api.rewvid.easypanel.host";

// Strip any trailing /api, /api/v1, or / to get a clean base
const BACKEND_BASE = rawBackendUrl
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

// Diagnostic removed for Zero-Waste audit.

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { path } = req.query;
  const requestOrigin =
    typeof req.headers.origin === "string" ? req.headers.origin : "";

  // Health check especial para diagnóstico de red
  if (
    req.method === "GET" &&
    Array.isArray(path) &&
    path[0] === "_proxy_health"
  ) {
    return res.status(200).json({
      proxy: "OK",
      backendTarget: `${BACKEND_BASE}/api/v1/`,
      envSource: process.env.INTERNAL_BACKEND_URL
        ? "INTERNAL_BACKEND_URL"
        : process.env.BACKEND_INTERNAL_URL
          ? "BACKEND_INTERNAL_URL"
          : process.env.BACKEND_URL
            ? "BACKEND_URL"
            : process.env.NEXT_PUBLIC_API_URL
              ? "NEXT_PUBLIC_API_URL"
              : "HARDCODED",
      timestamp: new Date().toISOString(),
    });
  }

  // Construir ruta del backend
  const pathStr = Array.isArray(path) ? path.join("/") : path || "";

  // Construir query string (excluyendo el parámetro 'path' de la ruta dinámica)
  const queryParams = Object.entries(req.query)
    .filter(([key]) => key !== "path")
    .map(
      ([k, v]) => [k, Array.isArray(v) ? v[0] : v || ""] as [string, string],
    );
  const queryString =
    queryParams.length > 0
      ? "?" + new URLSearchParams(queryParams).toString()
      : "";

  const targetUrl = `${BACKEND_BASE}/api/v1/${pathStr}${queryString}`;

  // Manejar preflight OPTIONS
  if (req.method === "OPTIONS") {
    if (requestOrigin) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-device-id, x-forwarded-host, x-forwarded-proto",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  try {
    const getForwardHeaders = (target: string) => {
      const headers = { ...req.headers } as Record<string, string>;

      // 🔑 Reenviar el token al backend
      let authHeader = req.headers.authorization || req.headers.Authorization;

      if (!authHeader) {
        const cookieToken = req.cookies["sb-access-token"];
        if (cookieToken) {
          authHeader = `Bearer ${cookieToken}`;
        }
      }

      if (authHeader) {
        delete headers["authorization"];
        delete headers["Authorization"];
        headers["Authorization"] = Array.isArray(authHeader)
          ? authHeader[0]
          : authHeader;
      }

      // 🛡️ SEGURIDAD y OPTIMIZACIÓN
      delete headers["accept-encoding"];
      headers["accept-encoding"] = "identity";
      delete headers["connection"];
      headers["connection"] = "close";
      // NOTE: content-length se borra aquí para requests con body;
      // será recalculado correctamente en el bloque getRawBody.
      // Para GET/HEAD se preserva el original (típicamente undefined, inofensivo).
      delete headers["content-length"];

      headers["host"] = new URL(target).host;

      const forwardedHost = req.headers["x-forwarded-host"] || req.headers.host;
      const forwardedProto =
        req.headers["x-forwarded-proto"] ||
        (requestOrigin.startsWith("https://") ? "https" : "http");
      if (forwardedHost)
        headers["x-forwarded-host"] = Array.isArray(forwardedHost)
          ? forwardedHost[0]
          : forwardedHost;
      if (forwardedProto)
        headers["x-forwarded-proto"] = Array.isArray(forwardedProto)
          ? forwardedProto[0]
          : forwardedProto;

      const rawCookie = req.headers.cookie;
      if (rawCookie) {
        headers["cookie"] = Array.isArray(rawCookie)
          ? rawCookie.join("; ")
          : rawCookie;
      }

      return headers;
    };

    const method = req.method || "GET";
    // A network error does not prove that a write never reached the backend.
    // Only safe reads may be replayed or follow an upstream redirect.
    const canReplay = method === "GET" || method === "HEAD";
    const fetchOptions: RequestInit & { duplex?: "half" } = {
      method,
      redirect: canReplay ? "follow" : "error",
      headers: getForwardHeaders(targetUrl),
      signal: AbortSignal.timeout(60000),
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        const getRawBody = require("next/dist/compiled/raw-body");
        const rawBody = await getRawBody(req, {
          length: req.headers["content-length"],
          limit: "5mb",
        });
        fetchOptions.body = rawBody;
        (fetchOptions.headers as Record<string, string>)["content-length"] =
          String(rawBody.length);
        fetchOptions.duplex = "half";
      } catch (bodyError: unknown) {
        const errMsg =
          bodyError instanceof Error ? bodyError.message : String(bodyError);
        console.error(`[PROXY] ❌ Body parse error: ${errMsg}`);
        return res.status(400).json({
          error: "Invalid request body",
          message:
            "No se pudo leer el cuerpo de la petición — posiblemente malformado o excede 5MB.",
          detail: errMsg,
        });
      }
    }

    // --- REGLA DE RESILIENCIA TAD ---
    let backendResponse: Response | undefined;
    try {
      backendResponse = await fetch(targetUrl, fetchOptions);
    } catch (fetchError: unknown) {
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : String(fetchError);
      // Si falló por red/DNS en el target interno, intentamos el FALLBACK PÚBLICO
      const isNetworkError =
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("EAI_AGAIN");

      if (
        canReplay &&
        isNetworkError &&
        (BACKEND_BASE.includes("api:3000") ||
          BACKEND_BASE.includes("localhost"))
      ) {
        const publicFallback =
          "https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1";
        const fallbackUrl = `${publicFallback}/${pathStr}${queryString}`;
        console.warn(
          `[PROXY] 🔄 Reintentando vía pública por error de red: ${errorMessage} -> ${fallbackUrl}`,
        );

        // REGENAR HEADERS: El host cambió a la URL pública
        fetchOptions.headers = getForwardHeaders(fallbackUrl);

        try {
          backendResponse = await fetch(fallbackUrl, fetchOptions);
        } catch (fallbackError: unknown) {
          console.error(
            `[PROXY] ❌ Fallback también falló: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          );
          throw fallbackError;
        }
      } else {
        throw fetchError;
      }
    }

    // Verificación de seguridad para evitar "Cannot read properties of undefined (reading 'headers')"
    if (!backendResponse) {
      throw new Error("Backend response is undefined after all attempts");
    }

    if (backendResponse.status === 401) {
      const hasOriginalHeader = !!(
        req.headers.authorization || req.headers.Authorization
      );
      const hasCookieToken = !!req.cookies["sb-access-token"];
      const authStatus = hasOriginalHeader
        ? "PRESENTE"
        : hasCookieToken
          ? "FALLBACK_COOKIE"
          : "AUSENTE";

      console.error(
        `[PROXY 401] Backend rechazó credenciales: ${pathStr} | Auth: ${authStatus}`,
      );
      if (authStatus === "AUSENTE") {
        console.error(
          `[PROXY 401 DEBUG] No auth token. Cookies: [${Object.keys(req.cookies).join(",")}]. Headers: auth=${!!req.headers.authorization}, cookie=${!!req.headers.cookie}`,
        );
      }
    }

    // Headers CORS de respuesta
    if (requestOrigin) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    const contentType = backendResponse.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const contentDisp = backendResponse.headers.get("content-disposition");
    if (contentDisp) res.setHeader("Content-Disposition", contentDisp);
    const contentLength = backendResponse.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    const buffer = Buffer.from(await backendResponse.arrayBuffer());

    if (!backendResponse.ok) {
      const rawBody = buffer.toString("utf-8");
      console.error(
        `[PROXY BACKEND ERROR] ${req.method} ${targetUrl} -> ${backendResponse.status} ${backendResponse.statusText} | body: ${rawBody.slice(0, 500)}`,
      );

      if (contentType?.includes("application/json")) {
        try {
          const errorPayload = JSON.parse(rawBody);
          return res.status(backendResponse.status).json({
            ...errorPayload,
            proxy: {
              targetUrl,
              upstreamStatus: backendResponse.status,
              upstreamStatusText: backendResponse.statusText,
            },
          });
        } catch {
          /* Malformed JSON falls through to the response fallback below. */
        }
      }

      return res.status(backendResponse.status).json({
        error: "Upstream backend error",
        message: backendResponse.statusText || "Error sin detalle del backend",
        proxy: {
          targetUrl,
          upstreamStatus: backendResponse.status,
        },
        upstreamBody: rawBody.slice(0, 500),
      });
    }

    if (contentType?.includes("application/json")) {
      try {
        const data = JSON.parse(buffer.toString("utf-8"));
        return res.status(backendResponse.status).json(data);
      } catch {
        /* Malformed JSON falls through to the response fallback below. */
      }
    }

    return res.status(backendResponse.status).send(buffer);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error(
      `[COMPLETELY FAILED] ${req.method} ${targetUrl}:`,
      errorMessage,
    );

    return res.status(503).json({
      error: "Backend no disponible",
      message: errorMessage,
      targetUrl,
      hint: "Asegúrate de que el backend tad-api esté encendido en EasyPanel",
    });
  }
}
