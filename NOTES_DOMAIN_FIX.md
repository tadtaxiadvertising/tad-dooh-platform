# ✅ Fix: Dominio del API Gateway

Fecha: 2026-10-13

## Descripción
Se corrigió un typo en las URLs de configuración del API Gateway.

### Error
- URL incorrecta: `https://tad.api.ibuisiness.com.do/api`
- URL correcta: `https://tad.api.ibusiness.com.do/api`

### Archivos afectados
| Archivo | Estado |
|---------|--------|
| `apps/admin/.env` | ✅ Corregido localmente |
| `apps/advertiser/.env` | ✅ Corregido localmente |
| `apps/driver/.env` | ✅ Corregido localmente |

### Nota importante
Los archivos `.env` son ignorados por git (`.gitignore`) y contienen variables de entorno de desarrollo/producción. El fix fue aplicado a los archivos locales del repositorio.

Para nuevos desarrolladores:
1. Copiar de `.env.example` a `.env`
2. Configurar las variables de entorno correctamente
3. Verificar que `NEXT_PUBLIC_API_URL` apunte a `tad.api.ibusiness.com.do`

### Dominios de producción
| Servicio | Dominio |
|----------|---------|
| Admin | `https://tad.adm.ibusiness.com.do` |
| Advertiser | `https://tad.anunciante.ibusiness.com.do` |
| Driver | `https://tad.driver.ibusiness.com.do` |
| Player | `https://tad.player.ibusiness.com.do` |
| API | `https://tad.api.ibusiness.com.do` |
