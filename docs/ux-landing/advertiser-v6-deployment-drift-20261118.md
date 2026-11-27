# Incidente: TAD Advertiser V6 fusionado en main, pero no visible en el sitio público

**Fecha:** 2026-11-18  
**Ámbito:** `https://tad.anunciante.ibusiness.com.do/`  
**Prioridad:** P1: discrepancia de release en la landing pública. No se ha confirmado indisponibilidad ni daño a datos.

## Evidencia

1. GitHub `main` en la revisión `bf111cdc4116b63c4f5d2ec2e80339a7621e3bcd` incluye el merge de las PR #275, #276 y #277.
2. La raíz del sitio recuperada mediante lectura pública el 2026-11-18 responde con el copy **«Tu marca, en primera fila»**, correspondiente al contenido anterior.
3. En la rama actual el componente público usa **«Tu marca no espera. / Va a su encuentro.»** e incorpora `<section id="motion-story">`.
4. Por tanto, la superficie pública consultada no coincide con V6. El servicio de despliegue, su commit activo, los encabezados HTTP y las capas de caché no pudieron inspeccionarse desde esta sesión. **No se atribuye causa raíz sin logs.**

## Diagnóstico sin GitHub Actions

El siguiente comando usa únicamente Node.js, HTTP GET y el dominio público, sin claves ni sesión:

```bash
node scripts/advertiser-release-drift.cjs
```

Resultados:

- `exit 0`: HTML de V6 confirmado mediante **dos** evidencias semánticas (ancla y titular).
- `exit 2`: HTML accesible, pero corresponde a versión anterior o a una versión no reconocida.
- `exit 3`: error HTTP, transporte, redirección, respuesta no HTML o cuerpo inesperado.

Para la compilación aislada del portal:

```bash
bash scripts/advertiser-motion-v6-local-qa.sh
```

Ese script ahora exige que la compilación local entregue el fingerprint V6 **antes** del smoke de Chromium.

## Árbol de decisión en Easypanel (solo lectura primero)

1. Identificar el servicio que recibe el dominio `tad.anunciante.ibusiness.com.do` y comprobar que sea el servicio **advertiser**, no driver/admin/API.
2. Revisar en el panel del servicio la **fuente GitHub**, rama configurada, Dockerfile y commit o imagen del despliegue activo. La rama esperada es `main`; el Dockerfile del anunciante es `Dockerfile.advertiser`.
3. Contrastar el commit incorporado al build con el commit que contiene V6, e inspeccionar historial de builds y logs de despliegue. Si el build nunca se realizó por cuota de GitHub, comprobar el mecanismo de actualización de Easypanel (que puede ser independiente).
4. Si el contenedor activo tiene V6 pero el dominio entrega V5, revisar ruta del proxy inverso, selección de servicio, CDN y política de caché HTML. Evitar purgar caché o reiniciar servicios antes de identificar el punto de divergencia.
5. Solo tras confirmar causa raíz, efectuar el cambio mínimo reversible: actualizar **únicamente** el advertiser, manteniendo una imagen anterior como rollback y sin tocar la API, DB, player ni la red de tablets.
6. Ejecutar `node scripts/advertiser-release-drift.cjs` contra el dominio y comprobar que da `exit 0`. Probar en móvil, teclado, modo reducido y navegación al portal. Si el fingerprint es correcto pero el comportamiento es erróneo, depurar frontend sin asumir un fallo de caché.

## Seguridad

- No ejecutar el smoke de localhost contra producción: sus pruebas interactivas usan entorno aislado.
- No imprimir variables de entorno ni tokens durante el diagnóstico.
- No ejecutar migraciones ni reiniciar el player, la API o servicios financieros.
- No desactivar el caché global ni modificar DNS como solución provisional sin evidencia.

## Estado

**Evidencia suficiente de release drift; causa raíz por confirmar con el despliegue activo.** La implementación del verificador es un cambio no destructivo y no significa que el dominio se haya actualizado.


## Revisión de infraestructura del 18 de noviembre de 2026

Se inspeccionó el proyecto de Railway `discerning-commitment` a través de su conexión de solo lectura.

- Contiene un servicio `tad-dooh-platform` cuyo origen es `tadtaxiadvertising/tad-dooh-platform` en rama `main`.
- Su Dockerfile configurado es **`Dockerfile.api`**, no `Dockerfile.advertiser`.
- El único dominio registrado para ese servicio es `tad-dooh-platform-production.up.railway.app`; el dominio **`tad.anunciante.ibusiness.com.do` no está asociado** a ese servicio.
- El despliegue del merge #277 pasó a estado SUCCESS; el merge #278 lanzó otro despliegue. Estos estados corresponden al servicio de Railway descrito, **no prueban que el anunciante en EasyPanel se haya actualizado**.
- El repositorio identifica `tad-advertiser`, `Dockerfile.advertiser` y puerto interno 3000 como configuración esperada para el anunciante en EasyPanel; verificar el servicio real antes de modificarlo.

No se cambió la configuración de Railway ni el DNS. La intervención necesaria debe dirigirse al despliegue real del anunciante, tras verificar el commit activo y su ruta de proxy.

### Integración con el verificador general

`bash verify-deployment.sh` ahora incluye el dominio del anunciante en DNS/HTTPS y ejecuta `scripts/advertiser-release-drift.cjs` para detectar despliegues que devuelven HTTP 200 pero siguen sirviendo una versión antigua. Un 200 sin los dos marcadores semánticos **no es un resultado exitoso**.


## Comprobación focalizada sin GitHub Actions

El verificador general se puede ejecutar ahora en modo específico para anunciantes:

```bash
bash verify-deployment.sh --advertiser-only
```

El modo focalizado **solo** verifica DNS del dominio canónico del anunciante, HTTPS y el fingerprint semántico V6; no contacta a API, Driver, Admin ni Player. El comando **falla con salida 1** si encuentra contenido anterior, falla HTTP/DNS o falta alguna herramienta necesaria (`node`, `curl` o el propio script de fingerprint), y devuelve **2** para argumentos incorrectos. Se eliminaron los falsos positivos cuando faltan herramientas de diagnóstico.

Los ocho casos de regresión de este modo se definen en `scripts/advertiser-deployment-check.test.cjs`. Utilizan un directorio temporal y comandos simulados (`getent`, `curl`, `node`) para probar el comportamiento sin tráfico externo. Para ejecutar la suite en un checkout que tenga Node 22:

```bash
bash -n verify-deployment.sh
node --test scripts/advertiser-release-gate.test.cjs scripts/advertiser-deployment-check.test.cjs scripts/advertiser-release-drift.test.cjs
```

El chequeo de fingerprint confirma **contenido de versión**, no integridad de un despliegue completo. Si la salida sigue marcando versión antigua mientras GitHub main tiene V6, inspeccionar el servicio real `tad-advertiser` en EasyPanel y su commit efectivo antes de lanzar un redeploy o modificar proxy/caché.


## Hito V6 hasta PR #582 — 2026-11-27

El fingerprint original distingue V6 de V5, pero no acredita las mejoras posteriores. El modo estricto opcional exige los marcadores SSR de cabina, creatividad sectorial, control QR y seis sectores del PR #582.

```bash
node scripts/advertiser-release-drift.cjs --require-v6-582
```

En un entorno aislado puede añadirse la raíz HTTP loopback como argumento. Sin el flag se conserva el comportamiento original, incluidos los códigos de salida. El JSON informa `milestone.confirmed`, `markers` y `missingSectors`. Con el flag, una V6 incompleta devuelve 2 con `reason: "milestone-drift"`; los fallos de transporte/HTTP devuelven 3. Solo GET, sin seguir redirecciones, sin credenciales.

La comprobación excluye comentarios, scripts, estilos y templates; verifica marcadores HTML, no el SHA desplegado ni la funcionalidad de los controles. Se requiere contraste del commit/imagen activa en EasyPanel, revisión visual y smoke aislado para certificar la publicación. No incluye el PR #583 mientras esté pendiente.

Evidencia local: Node 22, cinco tests aprobados de `advertiser-release-drift.test.cjs`, blobs Git cotejados con los de la rama (script `63305259d00b924e2592d2dcc031bfc39bd16345`, tests `ee738b5894519de235be594acf8d45d0f64a0c4c`). La consulta real devolvió exit 3, `transport-error`, y curl no pudo resolver el dominio desde este entorno. No se infiere caída de producción. CI y prueba contra una compilación real pendientes.
