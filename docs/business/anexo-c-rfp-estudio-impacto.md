# RFP — Estudio de Impacto y Audiencia TAD DOOH (Taxi Advertising Dominicana)

**Ref:** TAD-RFP-IMPACT-2026-001  
**Fecha emisión:** 2026-09-02  
**Fecha límite recepción propuestas:** 2026-09-16 (14 días)  
**Presupuesto referencial:** USD 25,000–60,000 (fases 1–2, ver alcance)  
**Contacto:** Mendy — Arquitecto de Producto, TAD Taxi Advertising SRL — mendy@tad.do / +1-809-XXX-XXXX

---

## 1. Contexto y Antecedentes

TAD Taxi Advertising SRL (en adelante "TAD") opera una red de pantallas digitales (DOOH) instaladas en taxis afiliados en República Dominicana (inicio: Santo Domingo, expansión: Santiago, Punta Cana). Cada taxi lleva una tablet Android de 10–13" en el reposacabezas delantero, reproduciendo spots publicitarios de 15–30 segundos en rotación de 30 segundos.

**Estado actual (pre-launch comercial):**
- Flota objetivo inicial: 100–300 taxis (Q4 2026)
- Modelo de negocio: B2B (venta de inventario a anunciantes por campaña mensual) + B2C (revenue share con conductores/flotas)
- Simulador actual muestra "14,400 impactos/mes/taxi" con multiplicador 6 — **sin fuentes ni metodología auditada**
- Necesidad: **Estudio profesional certificado** que valide o corrija estas cifras antes de salir a mercado comercial

---

## 2. Objetivos del Estudio

### Objetivo Principal
Entregar un **Informe de Impacto y Audiencia DOOH Taxi certificado** que establezca, con metodología reproducible y fuentes trazables, los KPIs comerciales defendibles ante anunciantes e inversionistas:

1. **Alcance Mensual (Reach)** — Unique viewers expuestos ≥1 vez/mes
2. **Frecuencia (OTS)** — Exposiciones promedio por persona única
3. **Impresiones Totales (Gross Impressions)** — Reach × Frequency
4. **CPM Efectivo** — RD$/CPM vs. benchmarks de mercado (vallas, mupis, transit, digital, TV, radio)
5. **Viewability Rate** — % impresiones que cumplen estándar IAB (≥50% píxeles × 2 seg)
6. **Ad Recall / Brand Lift** — Δ recordación asistida pre/post campaña (piloto)
7. **Modelo de atribución** — Recomendación técnica para tracking conversiones (QR, pixel, landing)

### Objetivos Secundarios
- Calibrar los **factores de incertidumbre** (ocupación real, visibilidad, pasajeros/viaje) con datos primarios de campo
- Construir una **Calculadora de Impactos v2.0** parametrizable (Excel/Python) que el equipo TAD pueda operar internamente
- Definir **metodología de medición continua** (KPIs mensuales, alertas de deriva, auditoría anual)

---

## 3. Alcance de Trabajo (Scope)

### Fase 1 — Fuentes Secundarias y Benchmarks (Semanas 1–4)
| Entregable | Descripción |
|------------|-------------|
| 1.1 | Revisión y limpieza datos ONE (Censo 2022, ENMOV) — extracción variables relevantes: uso taxi per cápita, origen-destino, perfil socioeconómico usuarios |
| 1.2 | Solicitud y procesamiento datos DIGESETT/INTRANT — conteo vehicular corredores clave (Av. 27 Febrero, Churchill, Luperón, Av. Independencia, Av. Rómulo Betancourt, Av. Juan Pablo Duarte) |
| 1.3 | Censo inventario OOH competidores (Santo Domingo + Santiago) — vallas, mupis, pantallas mall, transit, metro; tarifas de lista, ocupación estimada, formatos |
| 1.4 | Benchmark internacional — Geopath UK, OAAA US, MOVE NL, LATAM (México, Colombia, Chile): métricas de referencia taxi/transit DOOH |
| 1.5 | Informe preliminar Fase 1 — matriz variable-fuente, gaps identificados, plan ajustado Fase 2 |

### Fase 2 — Estudios Primarios de Campo (Semanas 5–14)
| Estudio | Metodología | Muestra | Entregable |
|---------|-------------|---------|------------|
| 2.1 **Ocupación y Pasajeros/Viaje** | Observadores en paradas oficiales + encuesta CAPI conductores (tiempo ocupado, pax/viaje, tarifa, zona) | 500 viajes × 4 corredores × 2 épocas (alta/baja estacionalidad) | Base de datos limpia + factores calibrados por corredor/hora |
| 2.2 **Viewability / Eye-tracking** | Gafas eye-tracking (Tobii Pro Glasses 3 / Pupil Labs) + cámara tablet en viajes reales | 30 pasajeros × 3 configuraciones tablet (reposacabezas, tablero, techo) × 2 duraciones viaje | Factor visibilidad por posición + heatmaps atención + recomendación hardware |
| 2.3 **Brand Lift Piloto** | Panel online pre/post exposición controlada (A/B: expuestos a campaña real vs. control) | n=400/celda (800 total mínimo) | Δ Ad Recall, Δ Brand Awareness, Δ Purchase Intent + IC95% |
| 2.4 **OD Taxi + Fusión Datos Móviles** (opcional, si budget) | Encuesta CAPI pasajeros + data anonimizada 1 operador (INDOTEL + ALTICE/CLARO/VIVA) | 2,000 encuestas + 1 mes data móvil | Modelo frecuencia por zona residencial/trabajo + matriz origen-destino taxi |

### Fase 3 — Modelo Integrado y Certificación (Semanas 12–18)
| Entregable | Descripción |
|------------|-------------|
| 3.1 | **Calculadora de Impactos v2.0** — Código abierto (MIT), parametrizado, Monte Carlo (P10/P50/P90), cada celda con fuente+fecha+responsable |
| 3.2 | **Informe Final Certificado** — Firmado por socio/director de la firma: metodología completa, limitaciones declaradas, KPIs certificados, benchmarks, anexos técnicos |
| 3.3 | **Presentación Ejecutiva (30 min)** — Para directiva TAD + inversionistas: "Lo que sabemos, lo que estimamos, lo que falta" |
| 3.4 | **One-pager Comercial Validado** — CPM $X vs. competidores, con asterisco a informe certificado |

---

## 4. Entregables y Formatos

| Entregable | Formato | Idioma |
|------------|---------|--------|
| Informe Final Certificado | PDF (protegido) + Word editable (anexos) | Español |
| Calculadora v2.0 | Python (Jupyter/poetry) + Excel equivalente | Código: Inglés; Docs: Español |
| Bases de datos primarias | Parquet + diccionario de datos (CSV) | Español |
| Scripts de limpieza/transformación | Python (GitHub repo privado TAD) | Inglés |
| Presentación ejecutiva | PowerPoint / Google Slides | Español |
| Correspondencia con fuentes oficiales | PDF (cartas, respuestas, permisos) | Español |

---

## 5. Requisitos de la Propuesta

La propuesta debe incluir **obligatoriamente**:

1. **Perfil de la firma** — Experiencia en medición OOH/DOOH, audiencia transit, estudios movilidad. Referencias 3 clientes (anonimizados si NDA).
2. **Equipo propuesto** — CV lead metodólogo (PhD/MSc en estadística, econometría, o ciencia de datos), lead campo, analista datos. Disponibilidad confirmada.
3. **Metodología detallada** — Por cada estudio (2.1–2.4): diseño muestral, tamaño muestra, cálculo poder estadístico, control de sesgos, plan de calidad.
4. **Cronograma detallado** — Gantt con hitos, dependencias, buffers. Fecha compromiso entrega final.
5. **Presupuesto desglosado** — Por fase y estudio (honorarios, campo, equipos eye-tracking, incentivos encuestados, data telco, viajes, contingencia 10%). **Precios en USD, IVA incluido.**
6. **Plan de gobernanza datos** — Privacidad (Ley 172-13), anonimización, almacenamiento, destrucción, cesión derechos a TAD.
7. **Plan de contingencia** — Si DIGESETT no responde, si telco niega data, si clima/seguridad afecta campo.
8. **Declaración de independencia** — Sin conflicto de interés con competidores OOH en RD.
9. **Términos de pago sugeridos** — 30% firma, 40% entrega Fase 2, 30% entrega final certificada.

---

## 6. Criterios de Evaluación (Ponderados)

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Rigor metodológico y experiencia OOH/Transit | 30% | Publicaciones, certificaciones (Geopath, ESOMAR, WFA), casos similares |
| Viabilidad de acceso a fuentes oficiales (DIGESETT, INDOTEL, ONE) | 20% | Track record gestiones gubernamentales RD, contactos previos |
| Capacidad técnica campo (eye-tracking, CAPI, data fusion) | 20% | Equipos propios vs. subcontratados, QA campo, supervisión tiempo real |
| Calidad de entregables previos (ejemplos) | 15% | Claridad, accionabilidad, nivel de detalle técnico |
| Costo-total y términos de pago | 10% | Relación valor/precio, flexibilidad fases |
| Compromiso plazos y comunicación | 5% | PM dedicado, reportes semanales, escalamiento |

---

## 7. Cronograma del Proceso RFP

| Hito | Fecha |
|------|-------|
| Emisión RFP | 2026-09-02 |
| Ventana preguntas/aclaraciones (email) | 2026-09-02 a 2026-09-09 |
| Respuestas consolidadas (email a todos) | 2026-09-11 |
| **Fecha límite recepción propuestas** | **2026-09-16 17:00 AST** |
| Evaluación y shortlist (top 3) | 2026-09-17 a 2026-09-23 |
| Entrevistas finales (virtual 60 min c/u) | 2026-09-24 a 2026-09-26 |
| Adjudicación y firma contrato | 2026-09-30 |
| Kick-off proyecto | 2026-10-01 |

---

## 8. Preguntas y Aclaraciones

Enviar **únicamente por email** a: **mendy@tad.do** con asunto: `[RFP-TAD-IMPACT-2026] Pregunta — [Nombre Firma]`

Las respuestas se consolidarán y distribuirán a todos los invitados el 2026-09-11 sin identificar al preguntante.

---

## 9. Anexos de Referencia (Disponibles bajo NDA tras confirmación interés)

- Anexo A: Matriz variable-fuente-responsable (CSV) — *este documento*
- Anexo B: Export 90 días GPS logs + facturación + device heartbeats (muestra anonimizada)
- Anexo C: Especificación técnica tablet/player (hardware, software, logs disponibles)
- Anexo D: Simulador actual (capturas + lógica multiplicador 6)
- Anexo E: Benchmarks preliminares compilados por TAD

---

## 10. Confidencialidad

Todo el contenido de esta RFP, los anexos, y la información intercambiada durante el proceso son **Confidenciales — Uso Exclusivo Propuesta**. No podrán compartirse con terceros ni usarse para fines ajenos a esta licitación. La firma adjudicataria firmará NDA estándar TAD antes del kick-off.

---

**TAD Taxi Advertising SRL**  
*Santo Domingo, República Dominicana*  
*www.tad.do*