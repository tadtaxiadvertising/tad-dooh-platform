# Integridad de interpretación de ingresos — 2026-11-11

## Evidencia y causa
En la calculadora pública Driver el resultado decía "Total bruto del ejemplo, en un mismo período" pese a sumar **una referencia mensual de campañas elegibles** y **bonos no recurrentes por ventas y referidos activados**. Aunque el desglose inferior estaba separado, el encabezado podía interpretarse como un ingreso mensual fijo. Esto constituye un riesgo comercial y de claridad financiera; no implica que el motor matemático esté equivocado.

## Cambio mínimo
- La etiqueta del total se convierte en "Ejemplo combinado: un mes de anuncios y bonos por eventos".
- Se añade una frase visible junto al desglose aclarando que ventas y referidos requieren aprobación y no se repiten automáticamente en meses futuros.
- Se añade un test de 7 aserciones a `scripts/driver-preview-arithmetic.test.cjs` que vigila ambos conceptos y la separación de outputs recurrentes/no recurrentes.
- No se cambian fórmulas, ingresos, contratos, API, costes ni estado de dispositivos.

## Verificación
Las **7/7 aserciones nuevas se ejecutaron** en evaluador JS aislado sobre el archivo actual de la rama, obtenido desde GitHub. No es una corrida del archivo completo mediante `node --test`; GitHub Actions continúa sin iniciar jobs ([#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147)).

## Gates pendientes
```bash
node --test scripts/driver-preview-arithmetic.test.cjs scripts/driver-landing.test.cjs scripts/landing-cinematic.test.cjs
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
pnpm --filter driver build
```
En Chromium comprobar el detalle en 320/390/768/1440 px, zoom 200%, teclado, 0/15 campañas, 0/100 ventas/referidos, totales y ausencia de truncamiento en la explicación. Verificar que las cantidades y el resultado de `previewDriverEarnings` no cambiaron.

**Roll back:** cerrar el PR sin fusionar, o revertir sus commits. Sin datos persistidos ni migraciones. **Estado: implementado; QA de build/browser pendiente.**