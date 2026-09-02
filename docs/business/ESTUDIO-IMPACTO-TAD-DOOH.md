# Estudio de Impacto TAD DOOH — Documento de Trabajo

**Versión:** 1.0 (Borrador de trabajo)  
**Fecha:** 2026-09-02  
**Propietario:** Mendy (Arquitecto de Producto, TAD Taxi Advertising SRL)  
**Estado:** En construcción — base para levantar datos y contratar estudio profesional certificado  
**Ubicación:** `docs/business/ESTUDIO-IMPACTO-TAD-DOOH.md`

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

## 2. Estado Actual del Simulador (Baseline 2026-09-02)

### 2.1 Datos que muestra la pantalla analizada

| Campo | Valor mostrado | ¿Tiene fuente citada? | Estado |
|-------|----------------|----------------------|--------|
| Presupuesto estimado | RD$ 5,000 | ❌ No | Input del usuario (slider) |
| Impactos estimados | 14,400 | ❌ No | Caja negra (multiplicador 6) |
| Impresiones estimadas | RD$ 2,500 | ❌ No | Caja negra |
| Producción creativa | RD$ 2,500 | ❌ No | Caja negra |
| Número de pantallas (taxis) | 1–100 | ❌ No | Slider sin validación de flota real |
| Tarifa por mes | 1 mes | ❌ No | Input usuario |
| Rotación exacta cada 30 seg | 1 taxi | ❌ No | Supuesto operativo sin validación |
| Duración campaña | 1 mes | ❌ No | Input usuario |
| **Multiplicador** | **6** | ❌ No | **CRÍTICO — sin justificación** |
| Vehículos | 1 taxi | ❌ No | Default |
| Ciudades | No especificadas | ❌ No | Falta geografía |

### 2.2 Limitaciones críticas identificadas

1. **Multiplicador 6 = caja negra total.** No se sabe si es: (impresiones por hora × horas día × días mes) / vehículos, o un factor de "audiencia por vehículo" inventado.
2. **Cero geografía.** Santo Domingo ≠ Santiago ≠ Punta Cana. Tráfico, densidad, perfil socioeconómico y tarifas de medios cambian radicalmente.
3. **Cero validación de flota.** "1–100 taxis" no distingue entre: taxis afiliados reales, capacidad de instalación, churn de conductores, disponibilidad de tablets funcionando.
4. **Cero estacionalidad.** Enero ≠ Diciembre (turismo), semana santa, navidad. El DOOH exterior es estacional.
5. **Cero benchmark de mercado.** ¿RD$ 5,000/mes/taxi es caro o barato vs. valla estática, radio, Meta/Google Ads, TV?
6. **Modelo de atribución ausente.** ¿Cómo sabe el anunciante que su inversión generó ventas? No hay píxel, QR, código promo, landing trackeada.
7. **Producción creativa = RD$ 2,500 fijo.** No escala con complejidad (video vs. estático, 15s vs. 30s, motion graphics vs. plantilla).

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

## 11. Changelog

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-09-02 | Hermes Agent (dir. Mendy) | Creación documento base desde análisis simulador actual |

---

> **Nota final para el equipo:** Este documento es **vivo**. Cada variable que hoy es "supuesto" debe volverse "dato con fuente" en las próximas 8 semanas. El simulador que ven los anunciantes **no debe mostrar una sola cifra sin su badge de procedencia**. Cuando el estudio profesional esté listo, este doc se archiva como "versión preliminar interna" y se publica el **Informe Final Certificado** como artefacto comercial.