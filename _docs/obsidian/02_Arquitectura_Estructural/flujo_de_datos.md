---
title: ARQUITECTURA ESTRUCTURAL - FLUJO DE DATOS (TABLET -> NÓMINA)
status: DRAFT
updated: 2026-03-23
author: Antigravity AI (Digital Architect)
---

## 🏗️ Arquitectura Estructural de Datos

Este documento detalla el viaje de la información desde que una Tablet de la prueba de **10 socios** entra en funcionamiento hasta que se refleja en el **Dashboard** y la **Nómina**.

### 🗺️ Mapa de Flujo (Mermaid Diagram)

```mermaid
graph TD
    subgraph "Nodos de Campo (Hardware)"
        T1[Tablet TAD-DEV001] --> HB[Heartbeat / Telemetría]
        T2[Tablet TAD-DEV002] --> HB
    end

    subgraph "Nervio Central (Backend API)"
        HB --> API[API REST - /api/devices/heartbeat]
        API --> DB[(Base de Datos Prisma / Supabase)]
    end

    subgraph "Dashboard Administrativo (Frontend)"
        DB --> WS[TabSync / BroadcastChannel]
        WS --> DASH[Dashboard Metrics]
        WS --> FIN[Pestaña de Finanzas]
        
        DASH -- "Upload Bypass" --> SUPA[(Supabase Storage Direct)]
        SUPA -- "URL Registrada" --> API
    end

    subgraph "Lógica de Negocio (Nómina)"
        FIN --> CALC[Calculadora de Ingresos - MRR]
        CALC --> PAY[Nómina de Conductores RD$6,000]
    end

    style T1 fill:#FFD400,stroke:#000,stroke-width:2px,color:#000
    style T2 fill:#FFD400,stroke:#000,stroke-width:2px,color:#000
    style API fill:#1a1a1a,stroke:#FFD400,stroke-width:2px,color:#fff
    style DB fill:#1a1a1a,stroke:#FFD400,stroke-width:2px,color:#fff
    style DASH fill:#FFD400,stroke:#000,stroke-width:2px,color:#000
    style FIN fill:#FFD400,stroke:#000,stroke-width:2px,color:#000
```

### 🚦 Puntos de Control Criticos para la Prueba 10x10

#### 1. El Latido (Heartbeat)

Cada tablet de la prueba envía una señal cada **30 segundos**.

- **Si el dato llega**: El Dashboard muestra la unidad como `ONLINE`.
- **Si falla**: El Radar de Detalles (Obsidian) lanzará una alerta en 5 min.

#### 2. Sincronización de Pestañas (TabSync)

Gracias a la mejora del `BroadcastChannel`, si abres la pestaña de **Conductores** y la de **Finanzas**:

1. Al registrar un driver en una ventana.
2. La señal viaja por el canal local.
3. El Dashboard se recalcula **sin refrescar la página**. ✨

#### 3. Upload Bypass (Supabase P2P)

Los videos publicitarios (ej. +200MB) **NUNCA** pasan por el backend en NestJS. El Dashboard obtiene una "URL Firmada" y sube temporalmente a Supabase Storage y sólo cruza metadata al final. *Node.js nunca colapsa de RAM.*

#### 4. Tolerancia a Fallos (Tablets)

Si una tablet (TAD-DEV) pierde red por más de XX horas o entra a un túnel, entra en modo **Cache-First** persistiendo en `localStorage` las campañas activas. Si debe cobro (402), despliega un alert box (`TAD_UI_TOAST`).

#### 3. Integridad de Hardware

- **Restricción**: Un Conductor NO puede existir sin una Tablet vinculada. El sistema ahora valida esto proactivamente.

---
> [!IMPORTANT]
> **Arismendy**: Este diagrama es interactivo dentro de Obsidian. Si ves que el flujo no es el esperado en alguna tablet, busca el punto de falla en este mapa.
