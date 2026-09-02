# Plantilla Carta Solicitud Datos — DIGESETT / INTRANT
**Ley 200-04 (Acceso a la Información Pública) + Ley 172-13 (Protección Datos Personales)**

---

**FECHA:** [DD/MM/AAAA]

**A LA ATENCIÓN DE:**
**[ ] Director General, DIGESETT (Dirección General de Seguridad de Tránsito y Transporte Terrestre)**
**[ ] Director Ejecutivo, INTRANT (Instituto Nacional de Tránsito y Transporte Terrestre)**
**Av. Independencia esq. Av. Luperón, Ensanche La Fe**
**Santo Domingo, Distrito Nacional**
**República Dominicana**

**REF.: SOLICITUD DE ACCESO A INFORMACIÓN PÚBLICA — CONTEO VEHICULAR Y CARACTERIZACIÓN FLOTA TAXI CORREDORES PRIORITARIOS**

---

**De mi mayor consideración:**

Por medio de la presente, **TAD Taxi Advertising SRL** (RNC: [PENDIENTE — completar], domicilio social: [DIRECCIÓN LEGAL]), representada por su Arquitecto de Producto, **Sr. Mendy [APELLIDO]**, titular de la cédula de identidad y electoral No. [CÉDULA], en ejercicio de mi derecho fundamental de acceso a la información pública consagrado en el **Artículo 44 de la Constitución de la República** y desarrollado por la **Ley No. 200-04 sobre Libre Acceso a la Información Pública**, y en cumplimiento de la **Ley No. 172-13 sobre Protección de Datos Personales**, **SOLICITO RESPETUOSAMENTE** el acceso a la siguiente información estadística agregada y anonimizada:

---

## 1. OBJETO DE LA SOLICITUD

Información estadística oficial sobre **conteo vehicular y composición de flota** en los siguientes corredores viales del Distrito Nacional y Provincia Santo Domingo, desglosada por **hora del día, día de la semana, y tipo de vehículo** (con énfasis en taxis formales vs. informales vs. vehículos particulares):

### Corredores Prioritarios (Fase 1):
| Corredor | Tramo | Sentido |
|----------|-------|---------|
| Av. 27 de Febrero | Av. Máximo Gómez ↔ Av. Luperón | Ambos |
| Av. John F. Kennedy (Expreso) | Av. Máximo Gómez ↔ Av. Núñez de Cáceres | Ambos |
| Av. Winston Churchill | Av. 27 de Febrero ↔ Av. Anacaona | Ambos |
| Av. Abraham Lincoln | Av. 27 de Febrero ↔ Av. Lope de Vega | Ambos |
| Av. Rómulo Betancourt | Av. 27 de Febrero ↔ Av. Italia | Ambos |
| Av. Gregorio Luperón | Av. 27 de Febrero ↔ Av. Independencia | Ambos |
| Av. Independencia | Av. Luperón ↔ Av. México | Ambos |
| Av. Juan Pablo Duarte | Av. México ↔ Av. Máximo Gómez | Ambos |

### Corredores Expansión (Fase 2 — Santiago):
| Corredor | Tramo |
|----------|-------|
| Av. Las Carreras | Circunvalación Norte ↔ Av. Estrella Sadhalá |
| Av. Estrella Sadhalá | Av. Las Carreras ↔ Av. Circunvalación Sur |
| Blvd. Circunvalación Norte | Av. Las Carreras ↔ Autopista Duarte |

---

## 2. VARIABLES REQUERIDAS (Nivel de Agregación: Horaria × Corredor × Tipo Vehículo)

| Variable | Descripción | Formato Entrega Preferido |
|----------|-------------|---------------------------|
| `conteo_total_hora` | Total vehículos/hora por corredor/sentido | CSV: corredor, sentido, fecha, hora, conteo_total |
| `conteo_taxi_formal_hora` | Taxis con licencia/placa oficial DIGESETT/INTRANT | CSV: corredor, sentido, fecha, hora, conteo_taxi_formal |
| `conteo_taxi_informal_hora` | Vehículos operando como taxi sin placa oficial (estimado) | CSV: corredor, sentido, fecha, hora, conteo_taxi_informal |
| `conteo_particular_hora` | Vehículos particulares (no taxi) | CSV: corredor, sentido, fecha, hora, conteo_particular |
| `conteo_transporte_publico_hora` | Guaguas, carros conchos, motoconchos | CSV: corredor, sentido, fecha, hora, conteo_tp |
| `velocidad_promedio_hora_kmh` | Velocidad media ponderada (si disponible via sensores/radares) | CSV: corredor, sentido, fecha, hora, velocidad_kmh |
| `nivel_servicio_los` | Level of Service (A–F) si se calcula oficialmente | CSV: corredor, sentido, fecha, hora, LOS |

**Periodo solicitado:** **Últimos 12 meses disponibles** (mínimo 6 meses continuos) para capturar estacionalidad (temporada alta turística nov–abr vs. baja may–oct).

**Nota crítica:** **NO SOLICITAMOS** datos de identificación personal (placas, conductores, propietarios), ni ubicaciones GPS individuales, ni imágenes de cámaras. Solo **estadísticas agregadas anonimizadas** que son de dominio público según Ley 200-04.

---

## 3. FINALIDAD Y USO PREVISTO

La información se utilizará exclusivamente para:

1. **Estudio técnico de impacto publicitario DOOH (Digital Out-of-Home)** en taxis — modelar alcance y frecuencia de audiencias expuestas a pantallas digitales en reposacabezas.
2. **Calibración de factores de ocupación real** (pasajeros/taxi/viaje) para proyecciones de inventario publicitario certificables.
3. **Benchmarking de mercado** vs. otros medios OOH (vallas, mupis, transit) para fijación de tarifas competitivas.
4. **Planeamiento de expansión de flota** basada en corredores de mayor flujo de taxis y pasajeros.

**No se hará uso comercial directo de los datos crudos** — solo los outputs modelados (KPIs agregados: impresiones estimadas, CPM, reach) formarán parte de materiales comerciales. Los datos origen permanecerán en entorno seguro (Supabase/S3 privado, acceso solo equipo data + consultora externa bajo NDA).

---

## 4. BASE LEGAL

| Norma | Artículo | Aplicación |
|-------|----------|------------|
| Constitución RD | Art. 44 | Derecho acceso información pública |
| Ley 200-04 | Art. 1, 3, 5, 8, 12, 14 | Procedimiento solicitud, plazos, formatos, gratuidad (salvo costo reproducción) |
| Ley 172-13 | Art. 3, 6, 11, 13 | Principios protección datos: finalidad, proporcionalidad, seguridad, no datos sensibles |
| Ley 63-17 | Art. 11, 12, 15 | Competencia INTRANT/DIGESETT en estadísticas tránsito |
| Decreto 130-05 | Art. 4, 5 | Reglamento Ley 200-04: formato electrónico, 15 días hábiles respuesta |

---

## 5. FORMATO Y MEDIO DE ENTREGA SOLICITADO

- **Formato:** CSV (UTF-8) o Parquet — **NO PDF** (dificulta procesamiento automatizado)
- **Medio:** Enlace de descarga segura (WeTransfer, Google Drive, SFTP) o entrega en medio físico (USB) en nuestras oficinas
- **Diccionario de datos:** Incluir archivo `data_dictionary.csv` con definición de cada columna, unidades, códigos, valores nulos
- **Metadatos:** Fuente original (sensor, conteo manual, cámara, modelo), fecha recolección, responsable técnico, margen de error si aplica

---

## 6. COMPROMISOS DE TAD TAXI ADVERTISING SRL

1. **Confidencialidad operativa:** Los datos crudos no se compartirán con terceros fuera del equipo de estudio (consultora externa bajo NDA firmado).
2. **No re-identificación:** No se intentará re-identificar vehículos, conductores, ni rutas individuales.
3. **Destrucción programada:** Datos crudos se eliminarán a los 5 años post-estudio (política retención documentada).
4. **Citación de fuente:** Todo output público citará: *"Fuente: DIGESETT/INTRANT — Conteo vehicular [periodo], elaboración propia TAD / [Consultora]"*.
5. **Costo reproducción:** Nos hacemos cargo de costos razonables de reproducción/formateo (Art. 14 Ley 200-04).
6. **Informe de resultados:** Entregaremos copia del estudio final (versión ejecutiva) a la institución una vez certificado.

---

## 7. PERSONA AUTORIZADA PARA SEGUIMIENTO Y RECEPCIÓN

**Nombre:** Mendy [APELLIDO]  
**Cargo:** Arquitecto de Producto / Responsable Estudio Impacto  
**Email:** mendy@tad.do  
**Teléfono:** +1-809-XXX-XXXX  
**Oficina:** [DIRECCIÓN FÍSICA TAD]

---

## 8. PLAZO LEGAL Y SOLICITUD DE CONFIRMACIÓN DE RECEPCIÓN

De conformidad con el **Artículo 12 de la Ley 200-04** y **Artículo 4 del Decreto 130-05**, la institución tiene un plazo de **15 días hábiles** contados desde la recepción de esta solicitud para responder.

**SOLICITO:** Acuse de recibo formal (email o físico) con número de radicado y fecha de ingreso, para fines de control de plazo legal.

---

## 9. VÍA DE RECURSO

De denegarse total o parcialmente el acceso, o de no recibirse respuesta en el plazo legal, **TAD Taxi Advertising SRL** ejercerá los recursos previstos en el **Artículo 15 de la Ley 200-04** (recurso de amparo ante la Jurisdicción Contencioso-Administrativa) y/o denuncia ante la **Dirección General de Ética e Integridad Gubernamental (DIGEIG)**.

---

**Atentamente,**

__________________________
**Mendy [APELLIDO]**
Arquitecto de Producto
TAD Taxi Advertising SRL
Cédula: [NÚMERO]
RNC Empresa: [NÚMERO]

**Adjuntos:**
- [ ] Copia cédula identidad y electoral (representante)
- [ ] Copia RNC empresa
- [ ] Poder notarial / acta asamblea (si aplica representación legal)
- [ ] NDA consultora externa (borrador para revisión institucional)

---

### NOTAS PARA EL EQUIPO TAD (Uso Interno — Eliminar antes de enviar)

| Acción | Responsable | Deadline |
|--------|-------------|----------|
| Completar datos entre [CORCHETES] | Mendy / Legal | Inmediato |
| Adjuntar docs legales (cédula, RNC, poder) | Legal | Pre-envío |
| Enviar por **vía física certificada** (Correos RD / courier) + **email con acuse** | Mendy / Admin | 2026-09-05 |
| Registrar número radicado y fecha en tracker | Admin | Día envío |
| Calendarizar seguimiento día 12 hábil (recordatorio) | Mendy | Auto |
| Preparar Plan B (conteo propio Miovision/Numina) si no respuesta día 15 | Data / Mendy | 2026-09-20 |

---

### CONTACTOS CLAVE INSTITUCIONALES (Para seguimiento directo)

| Institución | Unidad | Contacto Referenciado | Tel/Email |
|-------------|--------|----------------------|-----------|
| DIGESETT | Depto. Estadísticas / Planificación | [Nombre si conocido] | 809-682-XXXX / estadisticas@digessett.gob.do |
| INTRANT | Dirección Planificación y Desarrollo / Observatorio Vial | [Nombre si conocido] | 809-687-XXXX / observatoriovial@intrant.gob.do |
| INTRANT | Dirección Seguridad Vial | [Nombre si conocido] | 809-687-XXXX / segurvial@intrant.gob.do |
| ONE | Dirección Estadísticas Económicas / Movilidad | [Nombre si conocido] | 809-683-XXXX / movilidad@one.gob.do |

---

**Versión:** 1.0 — 2026-09-02  
**Próxima revisión:** Tras respuesta institucional (máx. 15 días hábiles)