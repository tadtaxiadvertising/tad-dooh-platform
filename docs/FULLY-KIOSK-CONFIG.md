# 📱 Configuración de Fully Kiosk Browser

**¡Tu tablet player ya está en línea!**

---

## 🎯 PASOS PARA CONFIGURAR

### Paso 1: Descargar Fully Kiosk

**URL:** https://www.fully-kiosk.de/#download

**Costo:** ~$8 USD por licencia (una vez)

---

### Paso 2: Instalar en Tablet Android

1. Descarga el APK desde el link de arriba
2. Instala en tu tablet Android
3. Abre la app

---

### Paso 3: Configurar URL

```
Settings → Web Content:
├─ Start URL: https://tad-tablet-player.vercel.app
├─ Load URL on App Start: ON ✓
├─ Enable JavaScript: ON ✓
└─ Zoom: 100%
```

---

### Paso 4: Activar Kiosk Mode

```
Settings → Kiosk Mode:
├─ Start on Boot: ON ✓
├─ Keep Screen On: ON ✓
├─ Disable Status Bar: ON ✓
├─ Disable Navigation: ON ✓
└─ Prevent from Exiting: ON ✓
```

---

### Paso 5: Configurar Pantalla

```
Settings → Screen:
├─ Screen Timeout: Never
└─ Brightness: 80-100%
```

---

### Paso 6: Activar Admin Remoto

```
Settings → Remote Administration:
├─ Enable Remote Administration: ON ✓
└─ Password: [crea una contraseña segura]
```

**Guarda esta contraseña** - la necesitarás para control remoto.

---

## 🧪 TESTEAR

1. **Reinicia la tablet**
2. Fully Kiosk debería iniciar automáticamente
3. Debería cargar: https://tad-tablet-player.vercel.app
4. Deberías ver la pantalla de carga del TAD Player

---

## 📊 VER DEVICE ID

El device ID aparece en la esquina superior derecha de la pantalla.

**Formato:** `taxi-xxxxxxxxx`

**Este ID es único** - lo usarás para registrar el dispositivo en el backend.

---

## 🎨 MODO DEBUG (Opcional)

Para ver más información durante testing:

1. Edita `tablet-player/index.html` en GitHub
2. Busca: `<header id="header" class="hidden`
3. Cambia a: `<header id="header" class="`
4. Commit y push
5. Vercel redeployará automáticamente

**Esto mostrará:**
- Device ID
- Estado de conexión (online/offline)
- Hora actual
- Botones de debug

---

## 🔧 COMANDOS REMOTOS (Fully Kiosk API)

Fully Kiosk tiene API HTTP en `http://localhost:2323`

### Ejemplos:

```bash
# Reboot device
curl http://localhost:2323/reboot -d password=TU_PASSWORD

# Forzar carga de URL
curl http://localhost:2323/loadURL -d password=TU_PASSWORD -d url="https://tad-tablet-player.vercel.app"

# Tomar screenshot
curl http://localhost:2323/screenshot -d password=TU_PASSWORD

# Ver estado
curl http://localhost:2323/deviceInfo -d password=TU_PASSWORD
```

---

## 🚨 TROUBLESHOOTING

### Problema: No carga la URL

**Solución:**
1. Verifica que la tablet tenga internet
2. Prueba abrir la URL en Chrome primero
3. Revisa que Start URL esté bien escrita

### Problema: Pantalla se apaga

**Solución:**
1. Settings → Screen → Keep Screen On: ON
2. Conecta la tablet a corriente continua

### Problema: No inicia automático

**Solución:**
1. Settings → Kiosk Mode → Start on Boot: ON
2. Reinicia la tablet para probar

---

## 📞 SOPORTE

**Documentación completa:** https://www.fully-kiosk.de/de/#manual

**URL del Player:** https://tad-tablet-player.vercel.app

**Contacto:** tad.taxiadvertising@gmail.com

---

**¡Listo para usar!** 🚀
