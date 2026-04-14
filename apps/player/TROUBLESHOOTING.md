# tad-player — Catálogo de Errores Operativos (TROUBLESHOOTING)

> **Servicio:** `tad-player` (Vite Static App — Tablet Driver)
> **Versión:** v1.0.0
> **Estado:** Producción (Core)
> **Última revisión:** 2026-04-13

---

## Instrucciones de Uso para Soporte Técnico (Campo)

1. El reproductor corre sobre **FullyKiosk** o un browser móvil en la tablet.
2. Si el contenido no se muestra, la primera acción es **recargar la página** (Swipe down).
3. Para diagnósticos avanzados, conectar un teclado y pulsar `F12` (si está habilitado) o revisar el log del backend para el `deviceId`.

---

## 1. Errores de Reproducción y Media

| Código de Error | Síntoma | Causa Técnica | Acción de Mitigación |
|-----------------|---------|---------------|----------------------|
| `PlayerStatus: error` | Pantalla negra o spinner infinito | El video MP4 está corrupto en caché o el códec no es soportado por el browser de la tablet. | **1.** El motor saltará el video tras 2s. **2.** El Watchdog forzará fallback tras 120s. **3.** Limpiar caché del browser desde el menú de la tablet. |
| Bucle de Fallback | Solo se ven videos genéricos de TAD | No hay campañas activas asignadas a este `deviceId`, o todas las descargas fallaron. | **1.** Verificar en Admin Panel si el taxi tiene campañas activas. **2.** Verificar conexión a internet de la tablet (SIM 4G). |
| Video Congelado | Imagen fija pero no avanza | Stalling de red si el video se está streameando (cache miss) o error de decodificación de hardware. | **Esperar 120s.** El Watchdog de `video-engine.ts` detectará la inactividad y reiniciará el loop. |
| Audio en los anuncios | El video emite sonido | `muted` no está configurado o fue removido por el usuario. | **Estructural.** El player fuerza `muted` en el tag `<video>`. Verificar que no se haya modificado el código fuente. |

---

## 2. Errores de Sincronización y Caché (Offline)

| Síntoma | Causa Técnica | Acción de Mitigación |
|---------|---------------|----------------------|
| "Disk Space Low" en Heartbeat | La tablet tiene menos de 1GB libre. La Cache API está llena o el browser tiene datos acumulados. | **1.** Borrar caché manual de la app en Android Settings. **2.** Aumentar capacidad de la SD si aplica. |
| El player muestra anuncios viejos | `executeFullSync` falló o la versión de la campaña no ha cambiado. La tablet no ha podido descargar (sin red). | **1.** Verificar `navigator.onLine`. **2.** Forzar sincronización reiniciando la tablet. |
| `Cache Storage` saturado | Errores de "QuotaExceededError". El navegador impone un límite al origen (TAD). | El player intenta gestionar esto, pero si persiste, se requiere un "Clear Data" completo del navegador. |

---

## 3. Errores de Hardware y Conectividad

| Síntoma | Causa Técnica | Acción de Mitigación |
|---------|---------------|----------------------|
| Heartbeat no reportado | El backend no ve al taxi hace >15 min. (Tablet apagada, sin señal 4G o app cerrada). | **1.** Conductor debe verificar encendido. **2.** Verificar app en primer plano. **3.** Usar FullyKiosk en modo Kiosk. |
| Batería al 0% en Monitor | `navigator.getBattery()` reporta 0 o nulo. Cable de carga desconectado o batería dañada. | **Urgente:** El taxi dejará de reportar pronto. Conductor debe verificar la conexión del encendedor. |
| Ubicación fija o nula | El GPS no se actualiza (permisos denegados o sin visibilidad de satélites). | **1.** Aceptar permisos de GPS en el browser. **2.** Mover el vehículo a cielo abierto. |

---

## 4. Errores de Identidad (ID Mismatch)

| Síntoma | Causa Técnica | Acción de Mitigación |
|---------|---------------|----------------------|
| El taxi aparece con ID aleatorio | `taxi-xxxxxx` en lugar de `TAX_00x`. Se borró el `localStorage` de la tablet. | **1.** Entrar a la URL con `?deviceId=VALOR_CORRECTO` para re-setear la identidad persistente. |
| Dos taxis con el mismo ID | Clonación de configuración o error de asignación manual. Ambos reportan al mismo ID. | **1.** Limpiar caché en uno de ellos. **2.** Asignar identificadores específicos via URL parameters. |

---

## Procedimiento de Emergencia (Hard Reset)

Si el reproductor entra en un estado inconsistente:
1. **Paso 1:** Cerrar y abrir el navegador o la app FullyKiosk.
2. **Paso 2:** Si persiste, ir a la configuración del navegador → Privacidad → Borrar Datos de Navegación (Caché y Cookies).
3. **Paso 3:** Asegurarse que la URL cargada sea la correcta (producción) y tenga el `deviceId` si es necesario.
4. **Paso 4:** Verificar que la tablet tenga la hora y fecha correcta (fundamental para validar certificados SSL/JWT).
