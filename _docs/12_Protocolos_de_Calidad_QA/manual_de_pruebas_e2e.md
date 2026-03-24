---
title: Manual de Pruebas y Aseguramiento de Calidad (QA)
status: DOCUMENTADO
updated: 2026-03-24
---

## 🧪 Protocolos de Certificación y Pruebas (QA)

Para garantizar que el TAD DOOH Platform mantenga su estándar de estabilidad "Antigravity", se deben seguir los siguientes protocolos de prueba antes de cualquier despliegue masivo.

### 🤖 Pruebas Automatizadas (Playwright)

Contamos con una suite de pruebas End-to-End (E2E) que simulan el comportamiento real de dispositivos y administradores.

#### Cómo ejecutar las pruebas

1. Asegúrate de tener las dependencias instaladas: `npm install`.
2. Ejecuta la suite completa: `npx playwright test`.
3. Para ver el reporte visual: `npx playwright show-report`.

#### Escenarios Críticos Cubiertos

- **Auth Flow**: Verificación de login y persistencia de sesión JWT.
- **Kiosk Activation**: Simulación de registro de un `deviceId` y descarga del manifiesto de sincronización.
- **Offline Resilience**: Simula la desconexión de red y verifica que el player siga reproduciendo desde `localStorage`.
- **GPS Batch Sync**: Verifica que los puntos de GPS se guarden localmente y se envíen en bloque al recuperar conexión.

---

### 👨‍💻 Protocolo de Verificación Manual (Benchmark 10x10)

Para la prueba de 10 conductores y 20 pantallas, se debe seguir esta lista de verificación (Checklist):

#### 1. Preparación de Datos

- [ ] Base de datos purgada (`POST /api/drivers/purge-all`).
- [ ] 10 Conductores registrados con teléfonos reales.
- [ ] 10 Dispositivos vinculados con sus IDs de hardware.

#### 2. Verificación de Hardware (In-Situ)

- [ ] La tablet enciende y carga automáticamente la URL del player.
- [ ] El video publicitario inicial se descarga al 100% antes de iniciar el loop.
- [ ] Al desconectar el WiFi/4G, el video no se detiene.

#### 3. Auditoría de Dashboard

- [ ] El mapa muestra los 10 "pines" de taxi con sus estelas de movimiento.
- [ ] La pestaña de Finanzas refleja el balance deudor inicial (RD$6,000) por cada unidad.
- [ ] Las métricas de reproducción ("Impressions") suben en tiempo real cada vez que termina un video en la tablet.

---

### 📈 Reporte de Bugs

Cualquier anomalía detectada que no sea capturada por los tests automáticos debe ser registrada inmediatamente en el **[Radar Principal](../01_Radar_de_Detalles/radar_principal.md)** con la etiqueta `#QA_Report`.
