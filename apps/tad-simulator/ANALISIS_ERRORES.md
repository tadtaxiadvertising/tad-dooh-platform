# Análisis de errores - tad-simulator

Fecha: 2026-04-15

## Errores críticos encontrados

1. **Fallo de compilación por PrismaClient no exportado**
   - Error reproducible en `next build`: `Module '"@prisma/client"' has no exported member 'PrismaClient'`.
   - Impacta directamente `CleanupService` y `SimulationEngine`, que dependen de `@prisma/client`.

2. **Dependencia de cliente Prisma no generada en entorno limpio**
   - `@prisma/client` está declarado, pero el build depende de la generación previa de `.prisma/client`.
   - Sin `prisma generate` sobre el esquema de la app principal, el servicio no compila.

## Riesgos funcionales detectados en código

3. **Inconsistencia de puerto por defecto en API base**
   - En el engine se usa `http://localhost:3000/api/v1`.
   - En rutas API del simulador se usa `http://localhost:3001/api/v1`.
   - Puede provocar llamadas a servicios incorrectos según el endpoint.

4. **Lógica de fallback de URL no aplicada**
   - Existe el método `getResolvedApiUrl()` para corregir dominios no resolubles.
   - No se utiliza en los flujos principales, por lo que el fallback nunca se aplica.

## Recomendaciones

- Definir estrategia explícita de generación de Prisma Client (ej. `postinstall` o `prebuild`) para garantizar compilación reproducible.
- Unificar el puerto por defecto de `TAD_API_URL` entre engine y rutas API.
- Aplicar `getResolvedApiUrl()` en todos los consumidores de `apiUrl` o eliminar método si no se usará.
