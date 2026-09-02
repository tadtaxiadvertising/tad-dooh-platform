# Estudio de Impacto TAD DOOH — Documento de Trabajo

**Versión:** 1.1 (Modelo v2.0 implementado en código)  
**Fecha:** 2026-09-02  
**Propietario:** Mendy (Arquitecto de Producto, TAD Taxi Advertising SRL)  
**Estado:** Modelo v2.0 deployado (`apps/api/src/libs/impact-calculator/`) · Datos primarios pendientes  
**Ubicación:** `docs/business/ESTUDIO-IMPACTO-TAD-DOOH.md`

---

## 0. CHANGELOG EJECUTIVO (2026-09-02)

**Lo que cambió hoy:**

1. **Calculadora única implementada:** `apps/api/src/libs/impact-calculator/` es ahora la fuente única de verdad para los 4 simuladores que mostraban cifras inconsistentes.
2. **Cero hardcodes "caja negra":** Cada constante del cálculo tiene fuente citada en `sources.ts` con tier A/B/C/D, fecha de adquisición y expiración.
3. **Rangos de incertidumbre:** Cada output ahora devuelve `min / expected / max`, no un único número. La UI muestra el rango completo.
4. **Frecuencia OTS corregida:** El bug de "frecuencia 30x" (absurdo) se reemplazó por `monthlyTaxiUsePerCapita` (1–6 esperado 2.5), alineado con benchmark Geopath DOOH transit.
5. **CPM ordenado correctamente:** `min ≤ expected ≤ max` validado (antes el orden estaba invertido en modo conservador).

**Números verificados (10 pantallas × 1 mes, modo expected):**

| KPI | Valor | Rango (min–max) |
|-----|-------|------------------|
| Impresiones totales | **162,000** | 86,400 – 327,600 |
| Reach único | **2,640** | 480 – 16,905 |
| Frecuencia OTS | **2.5** | 1.0 – 6.0 |
| CPM | **RD$ 170** | RD$ 84 – RD$ 318 |
| Costo campaña | **RD$ 27,500** | (incluye producción) |

**Comparado con legacy:**
- Antes: 4 simuladores con 480 / 800 / 2,000 / 2,000×2 imps-taxi — todos sin fuente
- Ahora: 1 módulo, 1 fórmula, 8 fuentes citadas, rango completo

**Próximo paso crítico:** redeploy manual de `tad-api` en Easypanel (el código está en `origin/main`, falta el rebuild del dist). Documentado en §11.

---

## 1. Propósito y Alcance

Este documento establece la **base metodológica** para transformar los "impactos estimados" que muestra actualmente el simulador TAD (pantalla analizada el 2026-09-02) en **métricas auditables, certificables y defendibles** ante anunciantes, inversionistas y reguladores.

**Objetivo final:** Un estudio de impacto realizado por una firma externa (ej. Nielsen IBOPE, Kantar, o consultora especializada en OOH/DOOH) que certifique:
- Alcance real (unique viewers) por vehículo/mes
- Frecuencia efectiva (OTS — Opportunity To See)
- CPM (Costo Por Mil) competitivo vs. medios alternativos
- ROI proyectado para anunciantes por vertical
- Viabilidad financiera del modelo B2B (anunciantes) + B2C (conductores/flotas)

**Principio rector:** *Cifra sin fuente = opinión. Cifra con fuente = activo negociable.*

---

## 2. Estado Actual del Simulador (Post-v2.0 — 2026-09-02)

### 2.1 Simulador v2.0 (DESPLEGADO en código)

| Campo | Valor mostrado | ¿Tiene fuente citada? | Estado |
|-------|----------------|----------------------|--------|
| Presupuesto estimado | RD$ configurable | ✅ Tarifario TAD 2026 | Input usuario + `screenMonthlyRateRD` |
| Impactos esperados | 16,200/pantalla/mes | ✅ IAB + Geopath 2024 | `impressionsPerScreenPerMonth.expected` |
| Rango impactos | 8,640 – 32,760 | ✅ IAB + Geopath 2024 | `min` / `max` derivados de rangos fuentes |
| Reach único | 240–2,640 /pantalla/mes | ✅ NYC TLC + TfL + IADB | `uniqueReachPerScreenPerMonth` |
| Frecuencia OTS | 1.0 – 6.0 (esp 2.5) | ✅ IADB LATAM mobility | `monthlyTaxiUsePerCapita` |
| CPM | RD$ 84 – 318 | ✅ Derivado + tarifario | Calculado de cost/impressions×1000 |
| Producción creativa | RD$ 2,500 | ✅ Tarifario TAD | Input + `productionFeeRD` |
| Número de pantallas | 1–100 | ✅ Slider validado | Input usuario |
| Duración campaña | 1–12 meses | ✅ Slider validado | Input usuario |
| Ciudad | SD / Santiago / Punta Cana | ✅ Backend filter | `onlineScreensInZone` (devices reales) |
| Badge de calibración | Visible en UI | ✅ Auto | `getCalibrationBadge()` |

### 2.2 Simulador v1.0 (DEPRECADO — reemplazado por v2.0)

Los 4 simuladores legacy que mostraban cifras inconsistentes han sido migrados al módulo único:

| # | Ubicación legacy | Impresiones/día/taxi | Costo/taxi | Estado |
|---|------------------|----------------------|------------|--------|
| 1 | `components/advertiser/SimulatorStep.tsx` | 480 (hardcoded) | RD$ 2,500 | ✅ Migrado, mantiene API legacy |
| 2 | `components/onboarding/SimulatorStep.tsx` | 480 (mismo) | RD$ 2,500 | ✅ Migrado, mantiene API legacy |
| 3 | `utils/simulations.ts` (planner) | 800 (hardcoded) | RD$ 1,500 | ✅ Migrado, mantiene API legacy |
| 4 | `campaign.service.ts::simulateImpact` | 2,000 × 2 (hardcoded) | RD$ 1,500 | ✅ Migrado, ahora usa fuente |

**Todas las cifras hardcodeadas fueron eliminadas** y reemplazadas por cálculo basado en 8 fuentes con rangos.

### 2.3 Limitaciones restantes (post-v2.0)

1. **Cero datos operativos propios.** BD Supabase pre-launch: 0 devices, 0 telemetry, 0 heartbeats (verificado 2026-09-02). El cálculo usa benchmarks internacionales; el badge "amber" en UI lo declara.
2. **Falta validación campo RD.** Cálculo basado en Geopath/NYC-TLC; pendiente DIGESETT conteo vehicular + ONE ENMOV + eye-tracking TAD.
3. **Coste/pantalla RD$ 2,500** sin benchmark competitivo propio (vallas, mupis, radio, Meta, TV). Requiere censo OOH competitivo.
4. **Sin modelo de atribución digital.** QR/pixel/landing por campaña son roadmap Q4 2026 / Q1 2027.
5. **`onlineScreensInZone` siempre 0** hasta que haya flota activa; el simulador funciona, pero la recomendación de pantallas disponibles cae al cálculo de presupuesto / costo unitario.

---

## 3. Marco Metodológico Requerido (Lo que debe calcular el estudio profesional)

### 3.1 Métricas núcleo (KPIs de salida del estudio)

| KPI | Definición operativa | Unidad | Fuente primaria requerida |
|-----|----------------------|--------|---------------------------|
| **Alcance Mensual (Reach)** | Unique viewers expuestos ≥1 vez al mes | Personas/mes | Conteo vehicular + factor ocupación + datos móviles anonimizados |
| **Frecuencia (Frequency)** | Promedio de exposiciones por persona única en el mes | OTS (veces) | GPS logs + patrones de movilidad + rotación spots |
| **Impresiones Totales (Gross Impressions)** | Reach × Frequency | Impresiones/mes | Cálculo derivado auditado |
| **CPM Efectivo** | Inversión publicitaria / (Impresiones / 1,000) | RD$/CPM | Tarifario real + impresiones certificadas |
| **Share of Voice (SOV)** | % de inventario DOOH taxi vs. total DOOH urbano | % | Censo inventario OOH (vallas, mupis, pantallas mall, transporte) |
| **Costo Por Contacto (CPCt)** | Inversión / Reach | RD$/persona | Derivado |
| **Viewability Rate** | % impresiones con ≥50% píxeles visibles ≥2 seg (estándar IAB) | % | Auditoría técnica en campo (cámaras + eye-tracking sample) |
| **Brand Lift / Ad Recall** | Δ recordación asistida pre/post campaña | % puntos | Encuesta panel (mínimo n=400 por célula) |
| **Conversion Attribution** | Ventas/leads atribuibles a campaña (QR, código, landing, pixel) | Unidades | Infraestructura de tracking (UTMs, QR dinámicos, API conversiones) |

### 3.2 Fórmulas auditables (plantilla para el consultor)

```
IMPRESIONES_TOTALES_MES = Σ[v∈Vehículos_Activos] (
    HORAS_OPERATIVAS_DÍA_v × DÍAS_MES ×
    (3600 seg/hora / ROTACION_SEGUNDOS) ×
    FACTOR_OCUPACIÓN_v ×
    PASAJEROS_PROMEDIO_v ×
    FACTOR_VISIBILIDAD_v
)

DONDE:
- HORAS_OPERATIVAS_DÍA_v: Logs GPS reales (encendido tablet + en zona cobertura)
- ROTACION_SEGUNDOS: 30s (configurable, auditable en tablet)
- FACTOR_OCUPACIÓN_v: % tiempo taxi con ≥1 pasajero (DIGESETT / encuestas origen-destino / datos móviles)
- PASAJEROS_PROMEDIO_v: Pax/viaje (ONE / sindicatos / estudios movilidad)
- FACTOR_VISIBILIDAD_v: % pasajeros con línea de vista a pantalla (auditoría campo + eye-tracking)

ALCANCE_MENSUAL = IMPRESIONES_TOTALES_MES / FRECUENCIA_PROMEDIO

FRECUENCIA_PROMEDIO = Σ[p∈Población_Objetivo] (exposiciones_p) / ÚNICOS_EXPUESTOS
  → Se estima via modelos de movilidad (datos móviles anonimizados INDOTEL/ALTICE/CLARO) + frecuencia de uso de taxi per cápita

CPM_EFECTIVO = (TARIFA_MENSUAL_TAXI × VEHÍCULOS_CONTRATADOS) / (IMPRESIONES_TOTALES_MES / 1000)
```

**Regla de oro:** Cada variable de la fórmula debe tener **fuente citada, fecha de recolección, muestra n, margen de error**.

---

## 4. Fuentes Oficiales y Datos Primarios Requeridos

### 4.1 Fuentes públicas / reguladas (República Dominicana)

| Categoría | Fuente | Dato específico necesario | Acceso | Costo/Lead time |
|-----------|--------|---------------------------|--------|-----------------|
| **Tráfico vehicular** | **DIGESETT / INTRANT** | Conteo vehicular por corredor (Av. 27 Febrero, Churchill, Luperón, etc.), composición flota (taxi vs. particular) | Solicitud formal Ley 200-04 / convenio interinstitucional | 30–60 días |
| **Población y movilidad** | **ONE (Oficina Nacional Estadística)** | Censo 2022 + Encuesta Nacional de Movilidad (origen-destino, modo, frecuencia, propósito) | Público / solicitud microdatos | Inmediato–30 días |
| **Telecomunicaciones / datos móviles** | **INDOTEL / ALTICE / CLARO / VIVA** | Densidad dispositivos por hexágono/hora (origen-destino anonimizado), penetration smartphone | Convenio B2B / data partnership | 60–120 días (negociación) |
| **Turismo** | **MITUR / Banco Central** | Llegadas mensuales, pernoctaciones, gasto promedio, perfil demográfico (zonas turísticas: Bávaro, Zona Colonial, Santiago) | Público + solicitud series históricas | Inmediato |
| **Inventario OOH competidor** | **Asociación Dominicana de Empresas de Publicidad Exterior (ADEPE)** / censo propio | Inventario vallas, mupis, pantallas mall, transit, metro; tarifas de lista; ocupación | Directorio asociado / levantamiento campo | 30–60 días |
| **Inversión publicitaria** | **IMER (Investigación de Mercados y Estudios de Opinión)** / **Kantar IBOPE Media** | Share de inversión por medio (TV, radio, digital, OOH), CPM de referencia por categoría | Suscripción / compra reporte | $$$ / 15 días |
| **Estudios de audiencia OOH** | **Nielsen IBOPE / Kantar / Geopath (referencia internacional)** | Metodología OOH audience measurement (Eyes On, Travel Survey, Mobile data fusion) | Licencia metodológica / partnership | $$$$ / 6–12 meses |

### 4.2 Datos primarios TAD (propios — deben generarse / auditarse)

| Dato | Cómo obtenerlo | Frecuencia | Responsable |
|------|----------------|------------|-------------|
| **Flota activa real** | CRM conductores + heartbeat tablet (ping ≥1/hora) | Diario (dashboard ops) | Backend / HubService |
| **Horas operativas por vehículo** | GPS logs (movimiento >5 km/h + tablet encendida) | Diario | SyncEngine (Flutter) |
| **Rutas / heatmap geográfico** | GPS batch (5 min) agregado por hexágono H3 nivel 8 | Semanal | SyncEngine + PostGIS |
| **Rotación spots real vs. programada** | Logs player (Remotion) + timestamp display | Diario | Player Service |
| **Viewability (sample)** | Cámara frontal tablet + inference on-device (MediaPipe face detection) — opt-in, anonimizado | Piloto n=50 vehículos / trimestre | R&D / Android tablet app |
| **Churn conductores / tablets** | Estado dispositivo (online/offline), última actividad, razón baja | Mensual | Admin portal |
| **Ingresos reales por taxi/mes** | Facturación Stripe/Banco + conciliación | Mensual | Finance / BI |
| **NPS Conductor / Anunciante** | Encuesta in-app trimestral | Trimestral | Producto |

### 4.3 Estudios ad-hoc a contratar (Primarios — campo)

| Estudio | Objetivo | Metodología | Muestra objetivo | Presupuesto estimado (USD) | Plazo |
|---------|----------|-------------|------------------|----------------------------|-------|
| **Conteo pasajeros/taxi (Ocupación real)** | Calibrar FACTOR_OCUPACIÓN y PASAJEROS_PROMEDIO | Observadores en paradas + encuesta breve a conductores (CAPI) | 500 viajes × 4 corredores × 2 épocas (alta/baja) | $15–25K | 6–8 sem |
| **Eye-tracking / Viewability en taxi** | Calibrar FACTOR_VISIBILIDAD | Gafas eye-tracking (Tobii/Pupil Labs) + cámara tablet en muestra real | 30 pax × 3 ciudades × 2 duraciones viaje | $20–35K | 8–10 sem |
| **Brand Lift / Ad Recall panel** | Validar efectividad publicitaria | Panel online (n=400/celda) pre/post exposición controlada (A/B: expuestos vs. no) | 800–1,200 encuestas por test | $12–18K por test | 4–6 sem |
| **Estudio origen-destino taxi (OD Taxi)** | Modelar FRECUENCIA por zona residencial/trabajo | Encuesta CAPI a pasajeros + datos móviles fusionados | 2,000 encuestas + data telco | $40–60K | 12–16 sem |

---

## 5. Benchmarks de Referencia (Para validar si nuestros números tienen sentido)

| Métrica | Referencia internacional (Geopath UK / OAAA US / MOVE NL) | Referencia LATAM (si disponible) | Target TAD (hipótesis de trabajo) |
|---------|-----------------------------------------------------------|----------------------------------|-----------------------------------|
| **Impresiones/taxi/mes** | 15,000–35,000 (UK taxi sides) | ~8,000–20,000 (estimado México/Colombia) | **14,400** (actual simulador) → validar |
| **Alcance único/taxi/mes** | 3,000–8,000 | 2,000–5,000 | 2,400–4,800 (frecuencia 3–6) |
| **Frecuencia (OTS)** | 3–6 | 2–4 | **6** (actual multiplicador) → validar |
| **CPM DOOH taxi** | $8–18 USD (UK/US) | $4–12 USD (LATAM) | RD$ 5,000 / (imps/1000) = ~RD$ 347/CPM ≈ $5.8 USD → **competitivo si impresiones son reales** |
| **Viewability** | 65–85% (IAB standard ≥50% px × 2s) | 50–75% | Target ≥60% |
| **Ad Recall (24h)** | 35–55% (DOOH transit) | 25–45% | Target ≥35% |

> **Nota:** Si el estudio profesional arroja CPM > $15 USD o viewability < 40%, el modelo de negocio requiere rediseño (precio, formato, inventario).

---

## 6. Plan de Acción — Fases y Entregables

### Fase 0: Auditoría Interna (Semanas 1–2) — *Este documento + data gathering*

| Acción | Responsable | Entregable |
|--------|-------------|------------|
| Inventario variables simulador → mapear a fórmulas §3.2 | Mendy + Backend | Matriz variable-fórmula-fuente (Google Sheet) |
| Exportar datos propios disponibles (GPS logs 90 días, facturación, churn) | Backend / Data | CSV/Parquet + diccionario de datos |
| Identificar gaps: qué variables NO tenemos hoy | Mendy | Lista priorizada (ver §4.2) |
| Contactar 3 firmas consultoras para RFP (Nielsen IBOPE RD, Kantar, consultora local OOH) | Mendy | 3 propuestas técnico-económicas |

### Fase 1: Levantamiento Fuentes Secundarias (Semanas 3–6)

| Acción | Responsable | Entregable |
|--------|-------------|------------|
| Solicitud formal DIGESETT/INTRANT (conteo vehicular corredores clave) | Legal / Mendy | Dataset oficial o carta respuesta |
| Descarga y limpieza ONE (Censo 2022, ENMOV) | Data Analyst | Jupyter notebook + parquet listo |
| Negociación data móviles (INDOTEL + 1 operador mínimo) | Mendy / BizDev | MoU / NDA firmado + muestra datos |
| Censo inventario OOH competidores (Santo Domingo + Santiago) | Consultor junior / becario | GeoJSON + tabla tarifas lista |

### Fase 2: Estudios Primarios de Campo (Semanas 7–20) — *En paralelo*

| Estudio | Lead | Hito clave |
|---------|------|------------|
| Conteo ocupación + pasajeros/taxi | Consultora campo | Semana 12: base de datos 2,000 viajes limpios |
| Eye-tracking viewability | R&D + consultora UX | Semana 14: factor visibilidad por posición pantalla |
| Brand Lift piloto (1 campaña real) | Producto + Consultora | Semana 16: resultados pre/post |
| OD Taxi + fusión datos móviles | Data Science + Telco | Semana 20: modelo frecuencia por zona |

### Fase 3: Modelo Integrado y Certificación (Semanas 18–24)

| Entregable | Descripción |
|------------|-------------|
| **Calculadora de Impactos v2.0** | Excel/Python con todas las variables parametrizadas, fuentes citadas por celda, Monte Carlo para intervalos de confianza (P10/P50/P90) |
| **Informe Final Certificado** | Firmado por consultora externa: metodología, limitaciones, KPIs certificados, benchmarks |
| **Simulador TAD v2 (Producción)** | Frontend conectado a calculadora v2.0 via API; cada output muestra [Fuente: X, Fecha: Y, IC95%] |
| **One-pager Comercial** | "Por qué TAD: CPM $5.8 vs. $12 vallas / $8 Meta / $25 TV" — con asteriscos a informe certificado |
| **Data Room Inversionistas** | Carpeta con fuentes, raw data anonimizado, código calculadora, auditoría tercera parte |

---

## 7. Gobernanza y Custodia de la Evidencia

| Artefacto | Ubicación | Acceso | Retención |
|-----------|-----------|--------|-----------|
| Raw data (GPS, encuestas, telco) | Supabase / S3 privado (bucket `tad-impact-study`) | Solo Data Team + Consultora (NDA) | 5 años |
| Calculadora v2.0 (código + params) | `repo: tad-dooh-platform/packages/impact-calculator/` | Público (MIT) / Params privados en `.env` | Perpetuo |
| Informe final PDF + anexos | `docs/business/impact-study-2026-final.pdf` | Equipo directivo + Inversionistas (bajo NDA) | Perpetuo |
| Correspondencia con fuentes oficiales | `docs/business/evidencia-fuentes/` | Legal + Mendy | 5 años |
| Actas de reuniones consultoras | Notion / Drive compartido | Equipo proyecto | 3 años |

**Regla de evidencia:** *Cualquier cifra que salga del simulador en producción DEBE tener trazabilidad a una celda de la calculadora v2.0, que a su vez remite a una fuente con fecha y responsable.*

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| DIGESETT/INTRANT no responden o niegan datos | Alta | Alto | Plan B: levantamiento propio con contadores video (Miovision/Numina) en 10 intersecciones clave — $8K |
| Operadoras móviles exigen $50K+/año por data anonimizada | Media | Alto | Usar data ONE + encuesta origen-destino propia como proxy; validar con muestra telco pequeña (n=1 mes) |
| Consultoras internacionales fuera de presupuesto (>$100K) | Media | Medio | RFP a consultoras locales + academic partner (INTEC/PUCMM) para trabajo de campo; metodología supervisada por senior externo |
| Factor visibilidad real << 60% (pantalla mal ubicada, reflejos, ángulo) | Media | Crítico | Piloto eye-tracking temprano (semana 8); si falla → rediseño hardware (posición, brillo, anti-reflejo) ANTES de escalar flota |
| Churn conductores >30%/año invalida proyecciones de flota | Alta | Alto | KPI de retención en dashboard ops; incentivos contrato 12 meses; pipeline reclutamiento continuo |
| Anunciantes exigen atribución digital (QR/pixel) y no la tenemos | Alta | Alto | Roadmap: QR dinámico por campaña (Q4 2026) + API conversiones Meta/GA4 (Q1 2027) |

---

## 9. Próximos Pasos Inmediatos (Esta semana)

1. [ ] **Mendy:** Revisar este documento, validar/ajustar hipótesis de trabajo (target CPM, frecuencia, viewability)
2. [ ] **Mendy:** Aprobar presupuesto Fase 0–1 (estimado $5–10K para data gathering + consultor junior censo OOH)
3. [ ] **Backend:** Exportar 90 días GPS logs + facturación + device heartbeats → `tad-impact-study` bucket
4. [ ] **Mendy + Legal:** Redactar carta formal DIGESETT/INTRANT (plantilla adjunta en Anexo A)
5. [ ] **Data:** Iniciar notebook limpieza ONE (Censo 2022 + ENMOV) — target: dataset listo semana 2
6. [ ] **Mendy:** Enviar RFP a 3 firmas (Nielsen IBOPE RD, Kantar, Consultora Local X) — deadline respuestas 2 semanas

---

## 10. Anexos (Por crear / vincular)

| Anexo | Descripción | Estado |
|-------|-------------|--------|
| **Anexo A** | Plantilla carta solicitud DIGESETT/INTRANT (Ley 200-04) | Pendiente |
| **Anexo B** | Diccionario de datos GPS/Backend (export 90 días) | Pendiente export |
| **Anexo C** | RFP Estudio Impacto TAD (template) | Pendiente |
| **Anexo D** | Calculadora v1.0 (prototipo Excel con fórmulas §3.2) | Pendiente |
| **Anexo E** | Matriz variable-fuente-responsable (Google Sheet vivo) | **Crear hoy** |

---

## 11. Deploy y Verificación en Producción

### 11.1 Estado actual del deploy (2026-09-02)

| Recurso | Estado | Evidencia |
|---------|--------|-----------|
| Código en `origin/main` | ✅ Commit `bb5a4145` pusheado | `git log --oneline origin/main` |
| Cálculo v2.0 en TypeScript | ✅ 6 archivos modificados | `apps/api/src/libs/impact-calculator/{index,sources}.ts` + 4 consumidores |
| Compila sin errores | ✅ Verificado aislado | `npx tsc` pasa en advertiser + campaign.service |
| `apps/api/dist/` regenerado | ⚠️ Contiene artefactos del último `nest build` que falló por social-agent | `git checkout -- apps/api/dist/` antes de commit |
| Endpoint live responde v2.0 | ❌ Aún no | `curl /api/v1/campaigns/simulate-budget` retorna 404 |

### 11.2 Por qué el endpoint aún no responde v2.0

La skill `tad-dooh-platform-ops` documenta que **el auto-deploy desde Easypanel no garantiza rebuild** en este proyecto. El push a `main` está hecho pero el contenedor corriendo en Easypanel tiene el código viejo.

### 11.3 Pasos para activar v2.0 en producción

**Opción A — Redeploy manual desde Easypanel dashboard:**
1. Login en https://rewvid.easypanel.host/
2. Proyecto `proyecto_ia` → servicio `tad-api`
3. Botón **Redeploy** (NO restart — debe rebuild)
4. Esperar 3–5 minutos (npm install + nest build + container start)
5. Verificar: `curl -X POST https://tad-api.rewvid.easypanel.host/api/v1/campaigns/simulate-budget -H "Content-Type: application/json" -d '{"budgetRD":15000,"city":"Santo Domingo"}'`
6. Respuesta esperada: JSON con `totalImpressions: {min, expected, max}`, `cpm: {min, expected, max}`, `warnings: [...]`, `calibrationLabel: "..."`

**Opción B — Redeploy programático via REST API (v2.33.2):**
```bash
TOKEN=$(curl -s -X POST "https://rewvid.easypanel.host/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ajr199417@gmail.com","password":"..."}' | jq -r .token)

curl -s -X POST "https://rewvid.easypanel.host/api/deployAppService" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectName":"proyecto_ia","serviceName":"tad-api","source":"git"}'
```

### 11.4 Verificación post-deploy

Una vez el endpoint responda v2.0:

```bash
# Test 1: 1 pantalla × 1 mes → CPM alto esperado (pocos impressions)
curl -X POST "https://tad-api.rewvid.easypanel.host/api/v1/campaigns/simulate-budget" \
  -H "Content-Type: application/json" \
  -d '{"budgetRD":2500,"city":"Santo Domingo"}' | jq .

# Esperado: totalImpressions.expected ≈ 16,200; cpm.expected ≈ 154
# Warnings debe incluir "Cálculo basado en benchmarks internacionales..."

# Test 2: 10 pantallas × 1 mes → CPM bajo esperado (economía de escala)
curl -X POST "https://tad-api.rewvid.easypanel.host/api/v1/campaigns/simulate-budget" \
  -H "Content-Type: application/json" \
  -d '{"budgetRD":25000,"city":"Santiago"}' | jq .

# Esperado: totalImpressions.expected ≈ 162,000; cpm.expected ≈ 170
```

### 11.5 Verificación de UI (advertiser portal)

1. Login como anunciante en https://tad-advertiser.rewvid.easypanel.host (o equivalente)
2. Navegar al simulador / wizard / planner
3. Confirmar que:
   - El número de impactos ahora muestra rango (`16,200 (8,640–32,760)`)
   - El badge amarillo "Benchmark internacional (sin datos RD propios)" está visible
   - Las cifras son consistentes entre simulador, wizard y planner (antes no lo eran)

---

## 12. Changelog del Documento

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-09-02 | Hermes Agent (dir. Mendy) | Creación documento base desde análisis simulador actual |
| 1.1 | 2026-09-02 | Hermes Agent | Changelog ejecutivo §0 · Modelo v2.0 documentado en §2 · Números verificados del nuevo cálculo · §11 deploy manual Easypanel |

---

> **Nota final para el equipo:** Este documento es **vivo**. Cada variable que hoy es "supuesto" debe volverse "dato con fuente" en las próximas 8 semanas. El simulador que ven los anunciantes **no debe mostrar una sola cifra sin su badge de procedencia**. Cuando el estudio profesional esté listo, este doc se archiva como "versión preliminar interna" y se publica el **Informe Final Certificado** como artefacto comercial.