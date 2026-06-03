# ⚡ Quick Reference: Rutas de Dockerfile por Servicio

Usa esta referencia rápida cuando configures cada servicio en EasyPanel.

## 📋 Tabla de Configuración

| Servicio | Dockerfile Path | Puerto | SSH Key |
|----------|-----------------|--------|---------|
| **tad-api** | `apps/api/Dockerfile` | 3000 | `S1-api-<hash>` |
| **tad-admin** | `apps/admin/Dockerfile` | 80/443 | `S1-admin-<hash>` |
| **tad-advertiser** | `apps/advertiser/Dockerfile` | 80/443 | `S1-advertiser-<hash>` |
| **tad-driver** | `apps/driver/Dockerfile` | 80/443 | `S1-driver-<hash>` |
| **tad-player** | `apps/tablet-player/Dockerfile` | 80/443 | `S1-player-<hash>` |
| **tad-simulator** | `apps/tad-simulator/Dockerfile` | 3001 | `S1-simulator-<hash>` |
| **tad-remotion** | `apps/tad-remotion/Dockerfile` | 3000 | `S1-remotion-<hash>` |

---

## 🔧 Pasos Rápidos para EasyPanel

Para cada servicio:

```
1. EasyPanel Dashboard → [Servicio] → Settings → Build
2. Dockerfile Path: [Ver tabla arriba]
3. Build Method: Dockerfile
4. Save → Force Redeploy
```

---

## ❌ Valores INCORRECTOS (Evitar)

```
✗ Dockerfile           (raíz - no existe)
✗ Dockerfile.api       (sufijo incorrecto)
✗ ./Dockerfile         (ruta relativa)
✗ /Dockerfile          (ruta absoluta)
✗ Dockerfile.nodejs    (archivo no existe)
```

---

## ✅ Valores CORRECTOS

```
✓ apps/api/Dockerfile              (tad-api)
✓ apps/admin/Dockerfile            (tad-admin)
✓ apps/advertiser/Dockerfile       (tad-advertiser)
✓ apps/driver/Dockerfile           (tad-driver)
✓ apps/tablet-player/Dockerfile    (tad-player)
✓ apps/tad-simulator/Dockerfile    (tad-simulator)
✓ apps/tad-remotion/Dockerfile     (tad-remotion)
```

---

## 🚀 Build Exitoso

Si ves esto en los Build Logs:
```
#1 DONE 0.0s
#7 DONE 1.2s
...
Successfully built image
```

✅ **El Dockerfile fue encontrado correctamente**

---

## 📞 Si sigue fallando

1. Verifica que el archivo existe: `ls -la apps/[servicio]/Dockerfile`
2. Revisa Git status: `git status` (asegúrate de que todo está committed)
3. Revisa EasyPanel Build Logs para mensajes de error específicos
4. Consulta: [DOCKERFILE_ERROR_SOLUTION.md](DOCKERFILE_ERROR_SOLUTION.md)

---

**Última actualización:** 22 de Abril, 2026
