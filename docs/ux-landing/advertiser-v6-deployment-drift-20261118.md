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
