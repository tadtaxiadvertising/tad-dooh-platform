# Definición de Estructura: Reportes, Facturas y Métricas (TAD DOOH)

Este documento establece el estándar oficial para el procesamiento de datos, cálculos financieros y generación de informes dentro de la plataforma **TAD Ecosystem OS**.

---

## 1. Definición de Métricas (Core Analytics)

La plataforma utiliza telemetría en tiempo real desde las tablets para auditar cada impacto.

### 1.1. Impacto Auditado (Impresión)
*   **Definición**: Una reproducción completa confirmada por el hardware (`play_confirm`).
*   **Criterio de Auditoría**: El evento debe incluir `deviceId`, `videoId`, `timestamp` y coordenadas GPS válidas.
*   **Frecuencia**: Los datos se capturan en la tablet y se sincronizan al backend en lotes cada 10-15 minutos.

### 1.2. Alcance Geográfico (Reach)
*   **Definición**: Número de unidades físicas únicas (Taxis) que han reproducido el contenido en un rango de tiempo.
*   **Métrica**: `COUNT(DISTINCT deviceId)`.

### 1.3. Engagement (QR Scans)
*   **Definición**: Escaneo del código QR dinámico superpuesto en el video.
*   **Captura**: Evento `QR_SCAN` registrado a través del gateway de redirección `tad.do`.

---

## 2. Estructura de Facturación (Marcas/Anunciantes)

El modelo de negocio se basa en la disponibilidad y duración del contenido.

### 2.1. Modelo de Bloque de 30 Segundos
*   **Unidad Base**: RD$ 1,500.00 por bloque de 30 segundos.
*   **Cálculo de Bloques**: `CEIL(Duración_Anuncio / 30)`.
    *   *Ejemplo*: Un video de 15s paga 1 bloque (RD$ 1,500). Un video de 45s paga 2 bloques (RD$ 3,000).
*   **Recurrencia**: El monto se factura mensualmente por el tiempo de vida de la campaña.

### 2.2. Cálculo del Subtotal
`Subtotal = Sumatoria(Bloques_por_Asset) * Meses_Activos`

### 2.3. Estructura Fiscal
*   **Impuesto**: ITBIS (18.00%) aplicado sobre el subtotal.
*   **Moneda**: Pesos Dominicanos (RD$).

---

## 3. Estructura de Nómina (Conductores)

El incentivo para el conductor por mantener la tablet encendida y el contenido actualizado.

### 3.1. Incentivo por Campaña
*   **Monto**: RD$ 500.00 fijos por cada anuncio (campaña) activa y descargada en la unidad.
*   **Criterio**: Solo computa si el dispositivo ha reportado `sync_success` en el mes corriente.

---

## 4. Reportes y Exportaciones (Estructura de Datos)

### 4.1. Reporte Maestro de Ingresos (CSV)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `ID Campaña` | UUID | Identificador único del sistema. |
| `Nombre Campaña` | String | Nombre descriptivo. |
| `Estado` | Enum | ACTIVE, DRAFT, EXPIRED. |
| `Taxis Asignados`| Int | Volumen de la flota impactada. |
| `Impactos Reales`| Int | Conteo de impresiones auditadas. |
| `Ingreso Proyectado`| Float | Subtotal calculado por bloques. |

### 4.2. Reporte de Rendimiento (Unico por Campaña)
Desglose detallado por archivo multimedia:
*   `ID Media`: ID del video.
*   `Duración`: Segundos del video.
*   `Bloques`: Cantidad de bloques de 30s.
*   `Costo Mensual`: RD$ 1,500 * Bloques.

---

## 5. Estructura de Factura (UI/Visual)

Toda factura debe contener:
1.  **Header**: Branding TAD DOOH + Número de Factura (INV-XXXX) + Fecha Emisión.
2.  **Info**: Datos del emisor (TAD Advertising) y Cliente (Marca/Agencia).
3.  **Detalle**: Tabla con Descripción, Meses, Impresiones Auditadas, Precio Unitario y Total de Línea.
4.  **Resumen**: Subtotal, ITBIS y Total Final en negrita.
5.  **Footer**: Mensaje de agradecimiento y validez legal.
