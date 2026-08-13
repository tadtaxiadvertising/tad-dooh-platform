# FINDING-003 — Bloquear / Habilitar Socio (toggle de suscripción, no lock real)

**Severidad:** MEDIA (flujo funcional, pero el "bloqueo" está acoplado al pago y mezcla conceptos)
**Fecha:** 2026-08-10
**Entorno:** https://proyecto-ia-tad-dashboard.rewvid.easypanel.host (admin)
**Ruta probada:** `/admin/drivers` → botón "Bloquear Socio" / "Habilitar Socio" sobre el socio QA FLOW Driver 01

## Síntoma / comportamiento observado
Con un driver creado vía API (`QA FLOW Driver 01`, id `6a2a968e-cf11-4dfd-b725-bd50efa45a16`):

1. **Bloquear** → el botón exige doble clic con confirmación interna
   "¿ESTÁS SEGURO? CONFIRMAR" (se arma al primer clic y se auto-resetea a los 4s).
   - UI: fila pasa de `Operativo` a **`Inhibido`**, la celda de auditoría pasa de
     "Suscripción Activa / Vence: N/A" a **"Suscripción Vencida / Acción Requerida"**.
   - API (`GET /api/proxy/drivers`): `status: BLOQUEADO`, `subscriptionPaid: false`,
     `blockedAt: 2026-08-10T06:12:17Z`.
2. **Habilitar** → clic único, sin confirmación.
   - UI: vuelve a `Operativo` y "Suscripción Activa / Vence: N/A".
   - API: `status: OPERATIVO`, `subscriptionPaid: true`, `blockedAt: null`.

## Causa raíz
El botón NO ejecuta una acción de bloqueo de hardware. Llama
`handleToggleStatus(driver.id, driver.subscriptionPaid)`
(`apps/admin/pages/admin/drivers/index.tsx:138-154`) que hace:
```ts
const newStatus = !currentPaidStatus;                    // invierte subscriptionPaid
await updateDriverSubscription(driverId, { paid: newStatus });
```
y el backend (`apps/api/src/modules/drivers/drivers.service.ts:366-376`) hace:
```ts
status: paid ? ACTIVE : SUSPENDED,   // ACTIVE='OPERATIVO', SUSPENDED='BLOQUEADO'
blockedAt: paid ? null : new Date(),
```
Es decir, **"bloquear" = marcar la suscripción como impaga**, no un flag de
inhibición independiente.

## Observaciones / problemas encontrados
1. **Confirmación asimétrica:** bloquear pide confirmación (4s, auto-reset), pero
   habilitar ejecuta de inmediato sin `confirmMessage`. Un admin puede desbloquear
   por accidente.
2. **Accesibilidad / timing del confirm:** mientras está armado, el nombre
   accesible del botón cambia a "¿ESTÁS SEGURO? CONFIRMAR", pero conserva el
   `title` original ("Bloquear Socio"). Herramientas/selectores por nombre antiguo
   resuelven al botón de OTRA fila (el de Test Driver), pudiendo armar la
   confirmación equivocada. La ventana de 4s es corta para una decisión crítica.
3. **Conflación pago ↔ bloqueo:** un bloqueo admin produce exactamente el mismo
   estado visual y de datos que un impago real ("Suscripción Vencida / Acción
   Requerida", `subscriptionPaid:false`). No hay forma de distinguir "inhibido por
   admin" de "no pagó".
4. **El toggle usa `subscriptionPaid` como fuente de verdad:** si un driver tuviera
   `subscriptionPaid:false` pero `status:OPERATIVO`, el botón mostraría "Bloquear
   Socio" y al pulsarlo lo "arreglaría" (habilitaría pago). El estado visual y la
   acción real pueden desincronizarse.
5. **Mensajes de error/éxito engañosos:** tras bloquear el toast dice "Socio
   INHIBIDO correctamente" y en fallo "FALLA DE SEGURIDAD: Error crítico en
   actualización de credenciales" — ninguno refleja que se tocó la suscripción.
6. El `confirmMessage` dice "Se inhibirá su hardware", pero no existe un flag de
   inhibición de hardware; el hardware se suspende indirectamente vía suscripción
   (guard `subscription.guard.ts`).

## Estado final
Socio restaurado a `OPERATIVO` / `subscriptionPaid:true` tras la prueba
(`blockedAt: null`). No quedan datos alterados en producción.

## Posibles arreglos (a decidir)
1. **Separar conceptos:** flag `isBlocked`/`blockedAt` independiente de
   `subscriptionPaid`; "Bloquear Socio" solo inhibe, "Marcar pago" solo cobra.
2. **Confirmación para ambos sentidos** (bloquear y habilitar) y ventana > 4s.
3. Mantener el `title` y el nombre accesible consistentes durante el estado de
   confirmación.
