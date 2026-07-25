# 📧 Configuración SMTP — TAD DOOH Platform

El servicio de email ya está implementado en:
`apps/api/src/modules/notifications/email.service.ts`

**Provider por defecto:** Brevo (Sendinblue)
**Puerto:** 587 (STARTTLS)
**Pool:** 3 conexiones | **Timeouts:** 10s conexión, 30s operación

## Variables de Entorno (EasyPanel)

Agrega estas variables en cada servicio de EasyPanel:

| Variable | Ejemplo | Obligatorio |
|---|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` | ❌ (default Brevo) |
| `SMTP_PORT` | `587` | ❌ (default 587) |
| `SMTP_USER` | `tu-email@dominio.com` | ✅ |
| `SMTP_PASSWORD` | `tu-api-key-brevo` | ✅ |
| `SMTP_FROM` | `TAD Advertising <no-reply@tad.do>` | ❌ (default) |

Si no se configura, el sistema **no falla** — entra en **MODO MOCK**:
- Los emails se registran en logs como `📧 [MOCK EMAIL] Para: X`
- Se retorna `{ success: true }` igualmente
- Las notificaciones en-app siguen funcionando

## Funcionalidades Disponibles

- ✅ Reportes de campaña (PDF adjunto)
- ✅ Facturación electrónica (PDF)
- ✅ Confirmaciones de pago a conductores
- ✅ Alertas de morosidad (Kill-Switch 402)
- ✅ Retry pattern (3 intentos, backoff exponencial)
- ✅ Logging de errores en tabla `system_errors`
- ✅ Pool de conexiones reutilizables