---
title: Arquitectura de Monetización (B2B SaaS DOOH)
status: ESTABLE
updated: 2026-03-24
---

# 💰 Modelo de Ingresos MRR (Monthly Recurring Revenue)

Esta sección de la `Base de Datos Estructural` contiene las asunciones base, el código duro, y las proyecciones de rentabilidad que se utilizaron a nivel mundial de las empresas SaaS aplicadas para TAD.

## 📈 La Membresía de Operadores (Suscripción Base Hardware)

TAD NO depende sólo de la venta de anuncios de compañías externas (Advertisers), también monetiza en base al hardware en arrendamiento o modelo afiliado. 

- **RD$ 6,000 pesos:** Cobro estructural configurado en la pasarela mensual por CADA dispositivo activado bajo la firma de un chofer (Driver) que circule más de `N` horas conectadas a TAD.

### Integridad en el Diseño del SaaS
Cada que das de alta a tu red a un Conductor, el `MRR (Ingreso Mensual Recurrente)` del módulo *Finanzas* incrementará por RD$6,000. 

> *Ejemplo Matemático Básico:* Con el rollout planeado del RoadMap `Prueba 10x10`, la flotilla tendrá 10 dispositivos. Esto inyectará una proyección de base MRR de **RD$ 60,000** brutos por rentas / plataforma sin siquiera vender inventario a marcas grandes (Anunciantes de Video / Imágenes).

## 🚀 Proyección Cíclica (Cashflow)

### Flujo Positivo
Para garantizar un *Customer Lifetime Value (CLTV)* infinito sobre las flotillas de concho, la plataforma de hardware es estricta:

- El cron de Sincronización `Cache-First` (en el lado de la tablet - Frontend) incluye un escudo Anti-Mora (Código HTTP HTTP-402 API).
- Si el conductor/unidad (DeviceID) está *overdue* (en mora), no le borrará las campañas publicitarias ya guardadas, ni apagará el hardware (evitar un bloqueo agresivo inicial).
- Lo que sí hace el protocolo es inyectar un globo semitransparente color rojo oscuro: `TAD_UI_TOAST` que dice (SISTEMA TAD ⚠️ SUSCRIPCIÓN VENCIDA (RD$6,000)...) a la vista de los pasajeros en el taxi.
- Opcionalmente en futuras iteraciones: Suspender la campaña local enteramente y pedirle a la tablet poner un video fijo exigiendo llamar a TAD.

### Escalabilidad Publicitaria (Inventario Dinámico)
Las pantallas admiten N "slots" dentro sus playlists. Un Anuncio puede pesar unos cuantos Megas y en el Dashboard puedes apuntar dinámicamente el Asset de *Samsung Dominicana* o de *Brahmita* directo a los vehículos VIP (Categorizados). 

El backend es tolerante a miles de transacciones de video por hora, por lo que TAD puede cobrar precios estelares para zonas VIP de Santiago u otras localidades mediante la segmentación GPS y de dispositivos.
