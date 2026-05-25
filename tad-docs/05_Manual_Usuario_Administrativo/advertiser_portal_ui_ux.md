---
title: "Advertiser Portal UI/UX Guidelines"
description: "Guía de diseño, experiencia de usuario y prevención de errores para el Portal de Anunciantes (TAD Advertiser)."
---

# TAD Advertiser Portal - UI/UX & Process Guidelines

El Portal de Anunciantes de TAD (TAD Advertiser) es la interfaz "Premium" orientada a agencias de marketing y clientes directos. Debe proyectar confianza, innovación tecnológica y una experiencia libre de fricciones.

## 1. Lenguaje de Diseño: "Stitched UI"

El portal de anunciantes se rige por el lenguaje visual **Stitched UI**, definido en la hoja de estilos global (`globals.css`). Este diseño se caracteriza por su estética "High-end" y "Dark Mode".

### Paleta de Colores
*   **Fondo Principal (Background):** `hsl(240 10% 3.9%)` - Un tono muy oscuro con un toque de azul marino para profundidad.
*   **Acento Primario (TAD Yellow):** `#FFD400` / `hsl(50 100% 50%)` - Utilizado para llamadas a la acción (CTAs), iconos de métricas clave y elementos de foco. Transmite energía y visibilidad.
*   **Elementos Neutros:** Blanco puro (`#FFFFFF`) para textos principales y Zinc profundo (`#09090b`) para contrastes.
*   **Glassmorphism:** Uso intensivo de fondos semitransparentes (`bg-zinc-900/40`), desenfoque (`backdrop-blur-3xl`), y bordes sutiles (`border-white/5`).

### Componentes Clave
*   **Stitched Cards (`.stitched-card`):** Tarjetas con bordes brillantes, sombras internas, y micro-interacciones al hacer hover (`hover:border-tad-yellow/40`, `hover:-translate-y-2`). Utilizadas para métricas superiores, inventario de campañas, y hubs de dispositivos.
*   **Efectos de Brillo (`.text-shadow-glow`, `.stitched-glow`):** Gradientes dorados y sombras proyectadas amarillas para dar vida a los números y títulos.
*   **Animaciones Fluidas:** 
    *   `.animate-float`: Para elementos destacados que requieren atención sutil.
    *   `.animate-pulse-soft`: Para estados de "en vivo" o "cargando".
    *   `.animate-border-glow`: Para resaltar campañas activas en el mapa.

## 2. Prevención de Errores en Procesos (Error-Proofing)

Para asegurar que los procesos de creación de campañas y gestión de medios no fallen:

### 2.1. Carga de Material Multimedia (Bypass Upload)
*   **UI/UX:** Proveer indicadores claros de carga (Progress bars con `.progress-fill`), y un estado de "Verificación de Integridad" (MD5 Check) antes de permitir al usuario continuar.
*   **Prevención:** Bloquear el botón de "Crear Campaña" hasta que el archivo se haya validado al 100% y se haya confirmado la recepción de la URL del CDN de Cloudflare (o Supabase Storage).
*   **Mensajes de Error:** En caso de interrupción de red, usar alertas (Toasts) informativos que expliquen qué ocurrió y permitir la reanudación del archivo.

### 2.2. Selección de Audiencia y Geocercas (Map View)
*   **UI/UX:** El mapa de Leaflet debe integrar el tema oscuro (ver CSS `leaflet-container`) para no romper la estética. Las geocercas deben delimitarse con `TAD Yellow` semitransparente.
*   **Prevención:** Validar en tiempo real que el polígono trazado contenga rutas válidas y calcular las impresiones estimadas inmediatamente. Si el área es muy pequeña, mostrar un "Warning" visual sugiriendo ampliar la zona.

### 2.3. Resumen Financiero y Pago
*   **UI/UX:** Mostrar desgloses financieros claros con tipografía monospace para números (ej. `font-display`). Utilizar gradientes de texto (`.text-gradient-gold`) para el "Total a Invertir".
*   **Prevención:** Validar que haya saldo suficiente o método de pago válido antes de activar la pauta. Los estados "Pendiente de Pago" y "Bloqueado por Mora (Error 402)" deben ser imposibles de ignorar mediante insignias de color rojo o naranja alerta.

## 3. Top Metrics y Dashboards

Los dashboards (como `TopMetrics.tsx`) deben estructurarse para facilitar el escaneo rápido:
*   **Jerarquía:** Número gigante y grueso (`text-5xl font-black`), seguido de subtítulos con alto tracking (`tracking-[0.3em]`).
*   **Skeletons:** Al cargar, usar animaciones de shimmer (esqueletos) que imiten las tarjetas finales para reducir el tiempo percibido (e.g. `TopMetricsSkeleton`).

## 4. Entregable de Calidad (Checklist UX)

1.  [ ] **Aesthetics:** ¿Se siente premium? ¿Los botones primarios reaccionan con escala (`hover:scale-105`) y sombras?
2.  [ ] **Feedback Visual:** ¿Cada clic, carga, y guardado tiene una animación o toast confirmando la acción?
3.  [ ] **Responsive:** ¿Las tablas complejas y los mapas se adaptan a móviles mediante desplazamiento táctil suavizado (`-webkit-overflow-scrolling: touch`)?
4.  [ ] **Consistencia:** ¿Se evitaron los colores genéricos y se usaron las utilidades de CSS centralizadas en `globals.css`?
