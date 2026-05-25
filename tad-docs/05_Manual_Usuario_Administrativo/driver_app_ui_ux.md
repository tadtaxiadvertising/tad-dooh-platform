---
title: "Driver App UI/UX Guidelines"
description: "Guía de diseño, experiencia de usuario y prevención de errores para la aplicación de Conductores (TAD Driver)."
---

# TAD Driver App - UI/UX & Process Guidelines

La aplicación o portal de Conductores (TAD Driver) está diseñada para el usuario de campo: taxistas, choferes y propietarios de vehículos. A diferencia del portal de anunciantes, el enfoque aquí es **funcionalidad extrema, visibilidad bajo el sol, y procesos guiados paso a paso**.

## 1. Lenguaje de Diseño y Usabilidad

El Driver App también hereda aspectos del **Stitched UI**, pero se adapta para uso en dispositivos móviles y entornos de calle.

### Contraste y Accesibilidad
*   **Legibilidad Máxima:** Uso de tipografías grandes (fuentes Sans-serif como `Inter`) e iconografía gruesa (`lucide-react`) para que el conductor pueda leer rápidamente en semáforos o mientras está estacionado.
*   **Modo Oscuro Adaptado:** El fondo oscuro reduce el brillo en el habitáculo del vehículo durante la noche, previniendo la fatiga visual. El `TAD Yellow` destaca perfectamente sobre este fondo para alertas e ingresos.
*   **Botones Táctiles Enormes:** Los botones primarios (`.btn-primary`, `.btn-pill`) deben tener un área táctil muy amplia (mínimo 48x48px) para compensar vibraciones del vehículo.

### Micro-interacciones Funcionales
*   Uso de `.animate-pulse-soft` para indicar que el sistema de geolocalización (GPS) está buscando señal o enviando latidos (heartbeats).
*   Tarjetas simplificadas: Se utiliza `.card-premium` pero con menos distracciones visuales que en el portal de anunciantes, priorizando datos puros (Ej: "Ganancias de Hoy: RD$ 450").

## 2. Prevención de Errores en Procesos Clave

El conductor no debe requerir soporte técnico constante. La UI debe anticipar los errores de usuario.

### 2.1. Integración de Pagos (Stitch Pay)
*   **Seguridad:** Toda interacción con el sistema de pagos (cobros o suscripciones) ahora está mitigada mediante un backend proxy, eliminando el riesgo de API Keys expuestas (como sucedía en implementaciones antiguas HTML).
*   **UI/UX de Pago:** 
    *   Mostrar el estado actual de la suscripción mensual de RD$6,000 en una barra de progreso (`.bar-fill` o circular).
    *   Bloquear interfaces secundarias si la cuenta cae en mora, llevando la atención directamente a un portal seguro de regularización.
    *   Validaciones de tarjetas con feedback en tiempo real y carga de estado "skeleton" mientras se procesa.

### 2.2. Proceso de Verificación KYC (Know Your Customer)
*   **UI/UX:** Subir fotos de la licencia, papel de buena conducta, y seguro debe ser un proceso tipo "Wizard" (paso 1, paso 2, paso 3). 
*   **Prevención:** 
    *   Uso de cámara en tiempo real con guías overlay (ej. "Coloque su cédula en el recuadro").
    *   Validación inmediata del tamaño y formato de la imagen antes del upload. Si es muy borrosa, pedir reintento en el cliente si es posible, o tras el rechazo del backend.
    *   El botón "Enviar Revisión" solo se habilita al tener el 100% de la documentación requerida localmente completada.

### 2.3. Estado de la Tablet Asignada
*   **UI/UX:** Pantalla de "Diagnóstico del Dispositivo" mostrando un semáforo de estado: Verde (Online, Sincronizado), Amarillo (Atrasado de sincronización Delta), Rojo (Offline/Apagado).
*   **Prevención:** Si el conductor reporta que no gana dinero, la UI debe mostrar claramente por qué: "Tablet sin conexión desde hace 4 horas", invitando al conductor a revisar el cargador tipo C o el chip 4G, en lugar de llamar a soporte.

## 3. Entregable de Calidad (Checklist UX)

1.  [ ] **Legibilidad:** ¿Puede un conductor de 50 años leer los montos de sus ganancias sin lentes de lectura a 60cm de distancia?
2.  [ ] **Claridad de Estado:** ¿Es evidente si el reproductor está generando dinero (Online) o si tiene un error de hardware?
3.  [ ] **Fricción de Pago:** ¿El flujo de pagar la mensualidad toma menos de 3 taps si la tarjeta está guardada?
4.  [ ] **Robusteza:** ¿La interfaz maneja la pérdida de red intermitente sin mostrar pantallas blancas (aprovechando Service Workers o estados locales persistentes)?
