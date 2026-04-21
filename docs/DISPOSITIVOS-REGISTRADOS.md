# 📱 Dispositivos Registrados - TAD DOOH Platform

---

## 🚗 Flota Activa

| # | Device ID | Nombre | Ciudad | Estado | Última Sync | Videos |
|---|-----------|--------|--------|--------|-------------|--------|
| 1 | `taxi-9wu77o406` | Taxi Santiago 1 | Santiago | 🟢 Activo | 2026-03-06 16:20 UTC | 0 |
| ~ | `taxi-at23izb1d` | (anterior) | Santiago | ⚪ Reemplazado | 2026-03-06 16:04 UTC | 0 |

---

## 📊 Estadísticas

- **Total dispositivos:** 1
- **Activos:** 1
- **Offline:** 0
- **Con errores:** 0

---

## 🎯 Dispositivo: taxi-at23izb1d

**Registro:** 6 de Marzo, 2026 (16:04 UTC)  
**Ubicación:** Santiago, República Dominicana  
**Tipo:** Tablet Android + Fully Kiosk Browser  
**Player URL:** https://tad-tablet-player.vercel.app

### Configuración

```
Device ID: taxi-at23izb1d
Fully Kiosk: Instalado
Kiosk Mode: Activado
Start URL: https://tad-tablet-player.vercel.app
```

### Estado Actual

| Métrica | Valor |
|---------|-------|
| **Status** | 🟢 En línea |
| **Última actividad** | 2026-03-06 16:04 UTC |
| **Videos en playlist** | 0 (pendiente campaña) |
| **Analytics subidos** | 0 |
| **Comandos pendientes** | 0 |

### Próximas Acciones

- [ ] Crear campaña de prueba
- [ ] Subir video promocional
- [ ] Asignar campaña al dispositivo
- [ ] Testear sync diario
- [ ] Verificar analytics

---

## 📝 Historial de Actividad

### 2026-03-06

| Hora (UTC) | Evento | Detalles |
|------------|--------|----------|
| 16:20 | ✅ **Device ID actualizado** | `taxi-9wu77o406` (nuevo ID persistente) |
| 16:12 | 🔄 Cache borrada | ID anterior: taxi-at23izb1d |
| 16:04 | ✅ Device registrado | ID: taxi-at23izb1d |
| 15:57 | 🚀 Player deployado | https://tad-tablet-player.vercel.app |
| 15:53 | 📱 Fully Kiosk instalado | Mendy confirmó instalación |

---

## 🔧 Comandos Remotos Disponibles

```bash
# Forzar sync
curl -X POST https://tad-dooh-api.vercel.app/api/devices/taxi-at23izb1d/command \
  -H "Content-Type: application/json" \
  -d '{"commandType": "sync"}'

# Reiniciar player
curl -X POST https://tad-dooh-api.vercel.app/api/devices/taxi-at23izb1d/command \
  -H "Content-Type: application/json" \
  -d '{"commandType": "restart"}'

# Limpiar cache
curl -X POST https://tad-dooh-api.vercel.app/api/devices/taxi-at23izb1d/command \
  -H "Content-Type: application/json" \
  -d '{"commandType": "clear_cache"}'
```

---

## 📞 Soporte

**Contacto:** tad.taxiadvertising@gmail.com

**Documentación:** `docs/` en GitHub

---

*Última actualización: 6 de Marzo, 2026 (16:04 UTC)*
