---
title: Plan de Continuidad y Disaster Recovery
status: COMPLETO (Protocolo V1)
updated: 2026-03-24
---

# 🚨 Plan de Contingencia y Recuperación (DRP)

TAD DOOH es un sistema en tránsito (Vehículos) de alto impacto. Este documento instruye a la gerencia sobre cómo actuar ante caídas de la nube.

## 🌐 Escenario 1: Caída o Apagón del VPS (EasyPanel Host)

Si el servidor central (`proyecto-ia-tad-api.rewvid...`) deja de emitir respuesta (HTTP 502/503), por ejemplo debido a un reinicio de mantenimiento:

- **Impacto a las Tablets:** NINGUNO inmediato. El `Motor Cache-First` de las tablets seguirá emitiendo publicidad rotacional utilizando la Base Local 24 Horas. Los taxistas seguirán su ruta sin saber que hay una incidencia. Ocasionalmente verás un lag de recálculo estadístico en el Dashboard, pero perder data de Anunciantes está mitigado por un Buffer de almacenamiento asíncrono (Event Queue).
- **Acción:** Acceder al EasyPanel y presionar el botón de `Restart` o `Force Redeploy`.
- **Riesgo Fuga RAM:** Mitigado por el Parámetro Node `--max-old-space-size=400`. Si crashea es por cuellos de CPU, no RAM.

## 🛢️ Escenario 2: Bloqueo de Conexión de Prisma DB (Supabase)

Si el "Transaction Pooler" falla o Supabase detiene la cuenta por exceso de tráfico (*Connection Timeout Error*).

- **Impacto:** Nuevas Ingestas no funcionarán. Registros de conductores emitirán `Error 500`. 
- **Verificación:** Visita Supabase Dashboard > Database > Connections. Comprueba los hilos huérfanos. 
- **Comprobación:** Asegúrate de que la String de Conexión (`DATABASE_URL`) **OBLIGATORIAMENTE** use:
  - Terminación: `?connection_limit=5`.
  - Puerto: `:6543`.
- **Acción:** Presionar el botón `Restart` en Supabase Settings.

## 📉 Escenario 3: Bloqueo Súbito de una Unidad Específica 4G

Si el concho (Uber, inDrive, etc.) entra en un túnel en plena loma donde no existe infraestructura telefónica dominicana o pierde por 2 días la cuota de data de internet.

- **Impacto:** En el tablero del AdminDashboard en "De-synchronized Devices" verás un globo de advertencia `Offline`.
- **Acción de Tablet:** Se desplegará el _UI Toast_ de Alerta para que el chófer solucione su problema sin saturar al Contact Center de TAD.
- **Acción Administrativa:** Si permanece más de 5 días offline, el vehículo deberá ser suspendido del programa (Desmarcarlo vía Interfaz Financiera en el Dashboard principal) para que no infle artificialmente la deuda viva publicitaria.
