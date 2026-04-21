---
title: Ciclo de Vida (SDLC) y Rollouts (Cero Interrupciones)
status: ESTABLE
updated: 2026-03-24
---

# 🔄 Estrategia de Mantenimiento de Flota Tecnológica

Manejar cambios de diseño o lógica comercial sobre múltiples tablets activas requiere tacto. No puedes romper un anuncio mientras una marca importante lo visualiza. Esta sección enseña la estrategia Zero-Downtime y CI/CD ideal.

## 🛠️ Entornos y Testeos (El "Sandbox" 10x10)

Tienes tu sistema local en la PC de trabajo (`Escritorio/TAD PLASTFORM`). Para no romper lo que los taxistas están enseñando a los pasajeros:

1. **Test en Localhost:** Ejecuta todo tu desarrollo usando `npm run dev` conectado a bases de datos de prueba separadas (si fuera necesario explorar), de momento es suficiente levantar y revisar los logs locales sin hacer push.
2. **Commit Transparente:** La Inteligencia Artificial que esté trabajando contigo debe asegurarte de no subir ninguna bandera roja o vulnerabilidad a GitHub. 

## ☁️ Integración Continua (Despliegues Automáticos)

### El Enlace: GitHub -> EasyPanel Server
TAD DOOH no se actualiza pasando archivos por FTP (FileZilla). Todo cambio que consolidas a la Nube Master (Tu repositorio de Github) detona un "Webhook" (Ping automático) hacia el VPS de `EasyPanel`.

### Rollouts Invisibles (A prueba de choferes)
- Cuando el servidor baja la nueva versión, levanta un clon temporal (Container "A"). 
- Luego Node.js destruye las conexiones `Prisma` pasadas mediante el Hook SRE (`onModuleDestroy`).
- Activa el Container "B" y redirige el tráfico Web de las Tablets en _nanosegundos_.
- **Efecto de Campo:** Ni el dueño de marca ni el conductor notan el switcheroo. Absolutamente a prueba de saltos y caídas. 

## ⏳ Monitoreo Frecuente
Cada tanto (ej. Mensualmente), revisa la Bóveda de Obsidian, en la sección **Radar Principal**, que tengas todas tus correcciones pasadas y no haya acumulado muchos pendientes técnicos que enlentezcan a las Tablets.
