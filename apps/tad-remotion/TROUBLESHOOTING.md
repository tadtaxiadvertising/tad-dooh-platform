# tad-remotion — Catálogo de Errores Operativos (TROUBLESHOOTING)

> **Servicio:** `tad-remotion` (API Express — Engine de Renderizado React)
> **Versión:** v1.0.0
> **Estado:** Fase de Pruebas (BETA)
> **Última revisión:** 2026-04-13

---

## Instrucciones de Uso para SRE On-Call

1. Si hay falla en el render de videos dinámicos, **confirmar salud del Chromium Headless**.
2. Los renders ocurren bajo demanda, verificar el Pico de Memoria en EasyPanel.
3. Para diagnósticos en vivo, abrir `https://<remotion-url>/` (Control Center) y ejecutar una prueba visual.

---

## 1. Errores Críticos del Motor (Remotion Renderer)

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `Executable doesn't exist at /root/.cache/puppeteer/...` | Error de Chromium al renderizar | Fallo en el copiado de la caché del navegador durante el build de Docker | **1.** Verificar que el step `COPY --from=builder /root/.cache /root/.cache` exista en Dockerfile.remotion. **2.** Re-desplegar forzando un Clean Build para asegurar que `npx remotion browser ensure` se descargue plenamente. |
| `ENOMEM` / OOMKilled Container | Contenedor reinicia tras /render request | El VPS de EasyPanel superó la cuota de RAM (renderizar consume picos altísimos) | **1.** Garantizar que `REMOTION_CONCURRENCY=1` esté configurado en EasyPanel. **2.** Si persiste, el contenedor requiere temporalmente una cuota forzada de `1024MB` o más. |
| Timeout en `/api/render` (502 / 504) | Request de render toma demasiado y cuelga el proxy | Node se estanca transpilando el Bundle (webpack) | **El primer bundle toma tiempo (Cold Start).** El sistema hace caché en la variable `cachedBundleUrl`. Volver a reintentar tras unos segundos. |
| `Cannot find module .../templates/index.js` | Endpoint 500 render failed | Ruta de templates desalineada con respecto al build de `tsc` | El archivo `index.ts` tiene un fallback que escanea tanto `dist/src/templates/` como `.../src/templates/`. Si ambas fallan, verificar con un Shell si `tsconfig.json` ignoró esa carpeta. |
| Render se queda con texturas negras | Videos se ven dañados o en negro puro | El `imageFormat: 'jpeg'` falló por falta de librerías nativas (`libgbm`, `libdrm2`, etc) en el Docker | **Estructural.** Verificar `RUN apt-get install...` del Dockerfile.remotion (Node:20-bullseye requiere muchísimas ligas compartidas C++ para Chrome GPU software rasterizing). |

---

## 2. Errores de Inteligencia Artificial (AI Architect)

| Código de Error | Descripción / Síntoma | Causa Técnica | Acción de Mitigación SRE |
|-----------------|----------------------|---------------|--------------------------|
| `GEMINI_API_KEY no configurada` | `/api/ai-generate` retorna 400 | Entorno sin llave provista | Inyectar el token en el panel de Environment de EasyPanel para `tad-remotion` y reiniciar contenedor. |
| Failed to parse JSON response | UI muestra "Error IA: ..." | El Output del LLM (Gemini 1.5 Flash) contuvo caracteres markdown sueltos u obsoletos no atrapados por el `.replace()` | **Reintento.** Es una alucinación menor de Gemini o inyección de formato en el prompt. No crítico. |

---

## 3. Discrepancias Multi-Threading y Almacenamiento

| Evento | Descripción / Síntoma | Solución |
|--------|-----------------------|----------|
| Purgas eliminan archivos del render actual | Race condition con purgas. Archivos borrados antes del streaming `res.download`. | El CRON está programado a 30m, asumiendo un máximo de vida de 10m por mp4 en `/tmp/tad-videos`. Solo posible si un render estancado dura >10m. (Con `concurrency=1`, esto se evitaría naturalmente). |
| Discos de VPS llenándose al 100% | Container falla intermitentemente indicando "No space left on device" | El CRON de `fs.unlinkSync` puede haber muerto si hubo un Exception no cazado en Node parando el EventLoop. Reiniciar contenedor forzará borrado de la carpeta `/tmp` Dockerizada. |

---

## Comandos de Diagnóstico Rápido SRE

```bash
# 1. Chequeo Base (Debe dar 200 OK)
curl -sI https://<subdominio-remotion>/health

# 2. Generación rápida (Sin videos de carga externa)
curl -X POST https://<subdominio-remotion>/api/render \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"test1", "props": {"brandColor":"#ffffff", "primaryText":"Prueba SRE"}}' --output test.mp4

# 3. Monitoreo de Disco crudo en el VPS local EasyPanel
docker exec -it <remotion-container-id> du -sh /tmp/tad-videos
```
