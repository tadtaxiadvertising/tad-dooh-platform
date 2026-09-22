# Auditoría: Plan Maestro TAD v1 vs. Repositorio Actual

**Fecha:** 2026-09-21  
**Repositorio:** /opt/data/tad-dooh-platform  
**Branch actual:** main (NO modificar directamente — trabajar en ramas de feature)  

---

## 1. RESUMEN EJECUTIVO

| Categoría | Estado | Comentario |
|-----------|--------|------------|
| **Modelo de datos (Plan §5)** | ❌ **GRANDES GAPS** | Faltan 9 entidades críticas: `Lead`, `ReferralAttribution`, `PaymentIntent`, `PaymentEvidence`, `PaymentVerification`, `CommissionLedger`, `HumanReviewTask`, `Conversation` (WhatsApp), `ConversionEvent` |
| **Regla de confianza (§2)** | ⚠️ **PARCIAL** | Estados de pago existen en `Subscription.status`, `FinancialTransaction.status`, `Commission.status` pero NO hay `PaymentEvidence` ni `PaymentVerification` ni `HumanReviewTask` |
| **Embudos separados (§3)** | ⚠️ **PARCIAL** | `PortalRequest` sirve para ambos pero sin distinción de tipo de lead (ADVERTISER/DRIVER), sin QR attribution, sin consentimiento |
| **WhatsApp Agent (§4)** | ⚠️ **SOLO META** | `SocialAgentService` + `SocialInteractionLog` + `SocialPostDraft` solo cubren Meta (IG/FB). **NO hay WhatsApp Business API** |
| **Atribución referidos (§6)** | ⚠️ **BÁSICA** | `Driver.referredBy`, `Advertiser.referredBy`, `Commission.sourceType` existen pero sin `ReferralAttribution` inmutable, sin idempotency key por evento |
| **Pagos por etapas (§7)** | 🔴 **ETAPA INICIAL SOLO** | Transferencia + revisión humana vía `PortalRequest` + `FinancialTransaction`. **NO hay `PaymentProvider` abstraction**, **NO hay webhook firmado**, **NO hay idempotencia en payroll/pay** |
| **Seguridad/RBAC (Skill Fase 1)** | 🔴 **CRÍTICO** | 6 controladores `@Public` sin `@Roles(ADMIN)`: `device-admin`, `monitoring`, `media`, `notifications`, `sheets`, `telemetry/playback-batch`, `portal-requests`, `kyc`, `referral` |
| **Mock Data (Skill Fase 2)** | 🔴 **CRÍTICO** | 3 `DirectUpload.tsx` (admin, advertiser, driver) fabrican URLs falsas. `driver` version SÍ sube a Supabase pero bucket público |
| **Wallet Unification (Skill Fase 3)** | ✅ **HECHO** | `Wallet` model es fuente autoritativa. `Driver.walletBalance` eliminado (migración 20260916). `WalletService.withdraw()` usa `SELECT FOR UPDATE` + raw SQL |
| **Social Agent (Skill Fase 4)** | ⚠️ **PARCIAL** | `publishPost()` existe pero **NO bloquea publicación automática** — actualiza a `APPROVED` sin verificación humana obligatoria |
| **Idempotencia V12 (Skill Fase 5)** | ⚠️ **PARCIAL** | `IdempotencyInterceptor` + `IdempotencyKey` model existen PERO: `payroll/pay` sin interceptor, `FinancialTransaction.reference` controlado por cliente |

---

## 2. MAPA DETALLADO DE GAPS POR FASE DEL PLAN MAESTRO

### FASE 1 — Definición, Seguridad y Gobierno (Plan §8)
| Requisito | Estado | Acción |
|-----------|--------|--------|
| Contrato comercial anunciante/conductor | ❓ | Documentar fuera del código |
| Regla atribución referidos | ⚠️ Parcial | Crear `ReferralAttribution` model |
| Rotar secretos expuestos | 🔴 **URGENTE** | Ver auditoría: JWT_SECRET, Supabase password, anon keys en Dockerfiles |
| Fuente única wallet/comisiones | ✅ | `Wallet` model + `WalletService` |
| Estados pago y revisión | ⚠️ Parcial | Faltan `PaymentEvidence`, `PaymentVerification`, `HumanReviewTask` |
| Rama piloto congelada | ✅ | Trabajar en `feature/*` branches |
| Inventario infra digital | ❓ | Documentar |
| Doc oficial + marcar históricos | ❓ | Documentar |
| Ambientes dev/staging/prod | ❓ | Verificar EasyPanel |

### FASE 2 — Leads, QR y Referidos (Plan §8)
| Requisito | Estado | Acción |
|-----------|--------|--------|
| Modelo `Lead` | ❌ | Crear model Prisma |
| QR con atribución persistente | ❌ | `ReferralService.generate()` crea URL pero sin tracking de primer contacto |
| Fuente, referente, consentimiento | ❌ | Añadir a `Lead` |
| Pruebas anti-auto-referido/duplicados | ❌ | Tests requeridos |
| Admin: camino completo del lead | ❌ | UI + API |

### FASE 3 — Pagos y Revisión Humana (Plan §8)
| Requisito | Estado | Acción |
|-----------|--------|--------|
| `PaymentIntent` + `PaymentEvidence` | ❌ | Crear models Prisma |
| Recepción comprobante | ⚠️ | `PortalRequest` recibe pero sin tipo `PAYMENT_EVIDENCE` |
| Bandeja revisión humana | ❌ | `HumanReviewTask` model + UI admin |
| Confirmación/rechazo con auditoría | ⚠️ | `FinancialTransaction.status` pero sin trail de revisor |
| Comisión solo al confirmar pago | ⚠️ | `Commission` se crea en `campaign.service` bonus referral PERO sin `PaymentVerification` gate |
| Idempotencia + transacciones | ⚠️ | `IdempotencyKey` existe PERO `payroll/pay` sin usarlo |

### FASE 4 — WhatsApp (Plan §8)
| Requisito | Estado | Acción |
|-----------|--------|--------|
| Webhook oficial WhatsApp | ❌ | Solo Meta webhook existe |
| Persistir conversaciones + estados | ⚠️ | `SocialInteractionLog` solo Meta |
| Catálogo aprobado | ❌ | Hardcodeado en `SocialAgentService.systemPrompt` |
| Respuestas variables controladas | ⚠️ | LLM libre, sin plantillas aprobadas |
| Handoff humano | ❌ | NO implementado |
| Bloquear promesas no verificadas | ⚠️ | System prompt lo dice pero NO hay enforcement técnico |

### FASE 5 — Activación Operativa (Plan §8)
| Requisito | Estado | Acción |
|-----------|--------|--------|
| Conductor: validar docs, suscripción, aprobación, dispositivo | ⚠️ | `drivers.service.ts` tiene onboarding PERO `subscriptionPaid` se puede inyectar en POST público (C2) |
| Anunciante: validar material, campaña, zona, calendario | ⚠️ | `campaign.service.ts` tiene validaciones PERO `media` controller sin `@Roles` (A7) |
| Reemplazar upload falso por flujo firmado real | 🔴 **CRÍTICO** | 3 `DirectUpload.tsx` mocks |
| Confirmar al usuario cada cambio de estado | ❌ | Notificaciones parciales |

### FASE 6 — Métricas, Comisiones, Cierre Mensual (Plan §8)
| Requisito | Estado | Acción |
|-----------|--------|--------|
| Separar reproducciones verificadas vs estimadas | ⚠️ | `PlaybackEvent.verified` existe PERO `telemetry/playback-batch` marca todo `verified:true` (C4) |
| QR scans + conversaciones deduplicadas | ❌ | NO hay tracking de QR scans |
| Conversiones confirmadas | ⚠️ | `Subscription.paidAt`, `Commission.status` |
| Calcular comisiones desde eventos financieros confirmados | ⚠️ | `Commission` se crea en bonus referral SIN `PaymentVerification` |
| Acumulación mensual por referente | ⚠️ | `ReferralService.getStats()` agrega PENDING PERO sin cierre mensual formal |
| Lote mensual liquidación con idempotencia | ❌ | NO existe `CommissionLedger` ni batch mensual |
| Conciliación comisiones/pagos | ⚠️ | `ReconciliationReport` existe PERO solo drivers, no referidos |
| Impedir doble comisión por mismo evento | ❌ | NO hay idempotency key por `ConversionEvent` |

### FASE 7 — Modernización Infra (Plan §8)
| Línea | Estado | Comentario |
|-------|--------|------------|
| Datos y estados | ❌ | Faltan 9 models |
| Seguridad | 🔴 | Secretos en git, RBAC roto, JWT fallbacks |
| Pagos | ❌ | Sin `PaymentProvider` abstraction |
| WhatsApp | ❌ | Solo Meta |
| Anunciante | ⚠️ | Upload mock, media controller público |
| Conductor | ⚠️ | Bypass Flutter, subscriptionPublic inyectable |
| Player | ⚠️ | Kill-switch TTL 24h vs 1h server, reintentos infinitos |
| Finanzas | ⚠️ | Wallet OK, PERO payroll/pay sin idempotencia |
| Analítica | ⚠️ | Heatmap OOM, verified falso |
| Operación | ⚠️ | Dockerfiles 1024MB en 512MB, auto-deploy |

### FASE 8 — Automatización Graduada (Plan §8)
| Requisito | Estado |
|-----------|--------|
| Mantener aprobación humana en pagos/conductores/campañas | ⚠️ Parcial (bypasses existen) |
| Agente tareas bajo riesgo (responder, capturar, crear lead, abrir review) | ⚠️ SocialAgent parcial |
| Acciones riesgo medio con reglas/límites | ❌ |
| Revisar métricas piloto antes de autonomía | ❌ |

---

## 3. HALLAZGOS CRÍTICOS DE AUDITORÍA (audit-report.json) QUE BLOQUEAN EL PLAN

| ID | Hallazgo | Severidad | Impacto en Plan Maestro |
|----|----------|-----------|-------------------------|
| **C1-C5** | RBAC roto: 6+ controladores `@Public` sin `@Roles(ADMIN)` | 🔴 CRÍTICA | Bloquea Fase 1, 3, 5, 7 (Seguridad) |
| **C1 (Frontend)** | 3 `DirectUpload.tsx` mocks — URLs falsas | 🔴 CRÍTICA | Bloquea Fase 2, 5 (Upload real) |
| **C1-C5 (Player)** | Kill-switch bypasses Flutter, TTL 24h local | 🔴 CRÍTICA | Bloquea Fase 5, 7 (R3) |
| **A2, A15** | `payroll/pay` sin idempotencia ni `$transaction` | 🔴 ALTA | Bloquea Fase 3, 6 (R8) |
| **A1, A23** | `notifyMorosidad` loop por heartbeat + P2002 | 🔴 ALTA | Bloquea Fase 5 (Operación) |
| **A7, A12** | JWT_SECRET fallbacks hardcodeados + generación aleatoria | 🔴 ALTA | Bloquea Fase 1 (Secretos) |
| **A1 (Infra)** | `.dockerignore` NO excluye `.env` → secrets en imagen | 🔴 ALTA | Bloquea Fase 1, 7 |
| **A3 (Infra)** | Auto-deploy EasyPanel en push a `main` | 🔴 ALTA | Bloquea Fase 1 (Gobierno) |
| **C1 (Infra)** | Credenciales Supabase commiteadas en git | 🔴 CRÍTICA | **ROTAR YA** antes de cualquier deploy |

---

## 4. MODELOS PRISMA: EXISTENTES vs. REQUERIDOS POR PLAN MAESTRO

### Modelos EXISTENTES (30+)
```
User, Device, Campaign, Playlist, PlaylistItem, DeviceCampaign,
Media, AnalyticsEvent, CampaignMetric, DeviceCommand, Video,
DeviceHeartbeat, PlaybackEvent, MediaAsset, Fleet, Driver,
FinancialTransaction, PayrollPayment, Subscription, Advertiser,
PortalRequest, DriverLocation, Notification, BiDashboardSnapshot,
ReconciliationReport, ContractAcceptance, AdvertiserSubscription,
Invoice, ActiveAd, Commission, Telemetry, Wallet,
SystemSetting, CampaignIntent, SystemError, IdempotencyKey,
SocialPostDraft, SocialInteractionLog
```

### Modelos FALTANTES (Plan §5) — **CREAR EN FASE 2-3**

```prisma
// 1. LEAD — Entrada de embudo unificada
model Lead {
  id              String      @id @default(uuid())
  type            LeadType    // ADVERTISER | DRIVER
  source          String      // QR_CODE, WHATSAPP, ORGANIC, REFERRAL
  qrCode          String?     @unique // QR identifier
  referrerCode    String?     // Referral code of referrer
  referrerId      String?     // Driver ID of referrer
  status          LeadStatus  @default(NEW) // NEW, QUALIFIED, PAYMENT_PENDING, CONVERTED, REJECTED
  consentGiven    Boolean     @default(false)
  consentAt       DateTime?
  contactName     String?
  companyName     String?     // for advertisers
  phone           String?
  email           String?
  city            String?
  vehicleInfo     Json?       // for drivers
  documents       Json?       // for drivers
  metadata        Json?       @default("{}")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  convertedAt     DateTime?
  
  // Relations
  paymentIntents  PaymentIntent[]
  evidences       PaymentEvidence[]
  verifications   PaymentVerification[]
  commissions     CommissionLedger[]
  tasks           HumanReviewTask[]
  conversations   Conversation[]
  conversionEvent ConversionEvent?
  
  @@index([type])
  @@index([status])
  @@index([referrerId])
  @@index([qrCode])
  @@index([phone])
  @@index([createdAt])
  @@map("leads")
}

enum LeadType {
  ADVERTISER
  DRIVER
}

enum LeadStatus {
  NEW
  QUALIFIED
  PAYMENT_PENDING
  CONVERTED
  REJECTED
}

// 2. REFERRAL ATTRIBUTION — Inmutable, auditable
model ReferralAttribution {
  id              String   @id @default(uuid())
  leadId          String   @unique @map("lead_id")
  referrerId      String   @map("referrer_id")
  referrerType    String   @map("referrer_type") // DRIVER | ADVERTISER
  qrCode          String   @map("qr_code")
  firstContactAt  DateTime @default(now()) @map("first_contact_at")
  firstContactChannel String @map("first_contact_channel") // WHATSAPP, QR, WEB
  deviceFingerprint String? @map("device_fingerprint")
  ipAddress       String?
  consentGiven    Boolean  @default(false) @map("consent_given")
  conversionEventId String? @unique @map("conversion_event_id")
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@index([referrerId])
  @@index([qrCode])
  @@index([conversionEventId])
  @@map("referral_attributions")
}

// 3. PAYMENT INTENT — Intención de pago tipada
model PaymentIntent {
  id              String           @id @default(uuid())
  leadId          String           @map("lead_id")
  type            PaymentIntentType // DRIVER_SUBSCRIPTION | ADVERTISER_CAMPAIGN | ADVERTISER_SUBSCRIPTION
  amount          Float
  currency        Currency         @default(DOP)
  provider        String?          // AZUL, TRANSFERENCIA, MANUAL
  providerRef     String?          @map("provider_ref") // external transaction ID
  status          PaymentIntentStatus @default(CREATED) // CREATED, PENDING_PROOF, UNDER_REVIEW, CONFIRMED, REJECTED, EXPIRED
  metadata        Json             @default("{}")
  expiresAt       DateTime?        @map("expires_at")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  confirmedAt     DateTime?        @map("confirmed_at")
  
  // Relations
  lead            Lead             @relation(fields: [leadId], references: [id], onDelete: Cascade)
  evidences       PaymentEvidence[]
  verification    PaymentVerification?
  
  @@index([leadId])
  @@index([status])
  @@index([providerRef])
  @@index([createdAt])
  @@map("payment_intents")
}

enum PaymentIntentType {
  DRIVER_SUBSCRIPTION
  ADVERTISER_CAMPAIGN
  ADVERTISER_SUBSCRIPTION
}

enum PaymentIntentStatus {
  CREATED
  PENDING_PROOF
  UNDER_REVIEW
  CONFIRMED
  REJECTED
  EXPIRED
}

// 4. PAYMENT EVIDENCE — Comprobante recibido
model PaymentEvidence {
  id              String              @id @default(uuid())
  paymentIntentId String              @map("payment_intent_id")
  fileUrl         String              @map("file_url")
  fileHash        String              @map("file_hash") // SHA256
  fileSize        Int                 @map("file_size")
  mimeType        String              @map("mime_type")
  submittedBy     String              @map("submitted_by") // LEAD, OPERATOR
  submittedAt     DateTime            @default(now()) @map("submitted_at")
  reviewedAt      DateTime?           @map("reviewed_at")
  reviewedBy      String?             @map("reviewed_by")
  reviewNotes     String?             @map("review_notes")
  status          EvidenceStatus      @default(SUBMITTED)
  
  // Relations
  paymentIntent   PaymentIntent       @relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)
  
  @@index([paymentIntentId])
  @@index([status])
  @@index([submittedAt])
  @@map("payment_evidences")
}

enum EvidenceStatus {
  SUBMITTED
  UNDER_REVIEW
  ACCEPTED
  REJECTED
}

// 5. PAYMENT VERIFICATION — Resultado de revisión humana o webhook
model PaymentVerification {
  id                  String               @id @default(uuid())
  paymentIntentId     String               @unique @map("payment_intent_id")
  verifiedBy          String               @map("verified_by") // OPERATOR_ID or WEBHOOK_PROVIDER
  verifiedAt          DateTime             @default(now()) @map("verified_at")
  method              VerificationMethod   // MANUAL_REVIEW | WEBHOOK_AZUL | WEBHOOK_OTHER
  providerResponse    Json?                @map("provider_response") // Raw webhook payload
  status              VerificationStatus   // CONFIRMED | REJECTED | REFUNDED
  notes               String?
  idempotencyKey      String?              @unique @map("idempotency_key") // For webhook idempotency
  
  // Relations
  paymentIntent       PaymentIntent        @relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)
  
  @@index([verifiedBy])
  @@index([status])
  @@index([verifiedAt])
  @@map("payment_verifications")
}

enum VerificationMethod {
  MANUAL_REVIEW
  WEBHOOK_AZUL
  WEBHOOK_OTHER
}

enum VerificationStatus {
  CONFIRMED
  REJECTED
  REFUNDED
}

// 6. COMMISSION LEDGER — Registro inmutable de comisiones
model CommissionLedger {
  id                  String                @id @default(uuid())
  referrerId          String                @map("referrer_id")
  leadId              String                @map("lead_id")
  conversionEventId   String                @unique @map("conversion_event_id")
  type                CommissionType        // DRIVER_REFERRAL | ADVERTISER_REFERRAL
  amount              Float                 @default(500.0)
  currency            Currency              @default(DOP)
  status              CommissionLedgerStatus @default(PENDING) // PENDING, APPROVED, PAID, BLOCKED, REVERSED
  sourcePaymentIntentId String              @map("source_payment_intent_id")
  accrualMonth        String                @map("accrual_month") // YYYY-MM
  batchId             String?               @map("batch_id") // Monthly settlement batch
  approvedAt          DateTime?             @map("approved_at")
  approvedBy          String?               @map("approved_by")
  paidAt              DateTime?             @map("paid_at")
  paidBatchId         String?               @map("paid_batch_id")
  reversalReason      String?               @map("reversal_reason")
  createdAt           DateTime              @default(now()) @map("created_at")
  updatedAt           DateTime              @updatedAt @map("updated_at")
  
  @@index([referrerId])
  @@index([leadId])
  @@index([status])
  @@index([accrualMonth])
  @@index([batchId])
  @@index([sourcePaymentIntentId])
  @@map("commission_ledger")
}

enum CommissionType {
  DRIVER_REFERRAL
  ADVERTISER_REFERRAL
}

enum CommissionLedgerStatus {
  PENDING
  APPROVED
  PAID
  BLOCKED
  REVERSED
}

// 7. HUMAN REVIEW TASK — Tarea asignada a operador
model HumanReviewTask {
  id              String           @id @default(uuid())
  type            ReviewTaskType   // PAYMENT_EVIDENCE | DRIVER_ONBOARDING | CAMPAIGN_MATERIAL | ADVERTISER_KYC
  entityType      String           @map("entity_type") // LEAD, DRIVER, ADVERTISER, CAMPAIGN
  entityId        String           @map("entity_id")
  leadId          String?          @map("lead_id")
  paymentIntentId String?          @map("payment_intent_id")
  assignedTo      String?          @map("assigned_to")
  status          ReviewTaskStatus @default(PENDING) // PENDING, IN_PROGRESS, COMPLETED, ESCALATED
  priority        Int              @default(0)
  notes           String?
  decision        String?          // APPROVED, REJECTED, REQUEST_MORE_INFO
  decidedAt       DateTime?        @map("decided_at")
  decidedBy       String?          @map("decided_by")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  dueAt           DateTime?        @map("due_at")
  
  @@index([type])
  @@index([entityType, entityId])
  @@index([assignedTo])
  @@index([status])
  @@index([leadId])
  @@index([paymentIntentId])
  @@map("human_review_tasks")
}

enum ReviewTaskType {
  PAYMENT_EVIDENCE
  DRIVER_ONBOARDING
  CAMPAIGN_MATERIAL
  ADVERTISER_KYC
}

enum ReviewTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ESCALATED
}

// 8. CONVERSATION — WhatsApp conversation tracking
model Conversation {
  id              String              @id @default(uuid())
  leadId          String?             @map("lead_id") // Nullable until lead created
  phone           String              @index
  platform        String              @default("WHATSAPP") // WHATSAPP, META_MESSENGER, INSTAGRAM_DM
  threadId        String              @unique @map("thread_id") // WhatsApp contact ID
  status          ConversationStatus  @default(ACTIVE) // ACTIVE, CLOSED, HANDOFF
  stage           String?             // QUALIFICATION, PAYMENT_INSTRUCTIONS, PROOF_COLLECTION, HUMAN_HANDOFF
  assignedOperator String?            @map("assigned_operator")
  consentGiven    Boolean             @default(false) @map("consent_given")
  consentAt       DateTime?           @map("consent_at")
  metadata        Json                @default("{}")
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")
  closedAt        DateTime?           @map("closed_at")
  
  messages        Message[]
  tasks           HumanReviewTask[]
  
  @@index([leadId])
  @@index([phone])
  @@index([status])
  @@index([assignedOperator])
  @@map("conversations")
}

enum ConversationStatus {
  ACTIVE
  CLOSED
  HANDOFF
}

model Message {
  id              String      @id @default(uuid())
  conversationId  String      @map("conversation_id")
  direction       MessageDirection // INBOUND | OUTBOUND
  content         String
  contentType     String      @default("text") // text, image, document, location
  mediaUrl        String?     @map("media_url")
  metaMessageId   String?     @map("meta_message_id") // WhatsApp message ID for idempotency
  status          MessageStatus @default(SENT) // SENT, DELIVERED, READ, FAILED
  createdAt       DateTime    @default(now()) @map("created_at")
  
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([metaMessageId])
  @@index([createdAt])
  @@map("messages")
}

enum MessageDirection {
  INBOUND
  OUTBOUND
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
  FAILED
}

// 9. CONVERSION EVENT — Evento de negocio confirmado
model ConversionEvent {
  id                  String              @id @default(uuid())
  leadId              String              @unique @map("lead_id")
  type                ConversionType      // DRIVER_SUBSCRIPTION_PAID | ADVERTISER_CAMPAIGN_PAID | ADVERTISER_SUBSCRIPTION_PAID
  paymentIntentId     String              @unique @map("payment_intent_id")
  paymentVerificationId String            @unique @map("payment_verification_id")
  referrerId          String?             @map("referrer_id")
  referrerType        String?             @map("referrer_type") // DRIVER | ADVERTISER
  amount              Float
  currency            Currency            @default(DOP)
  commissionAmount    Float               @default(500.0) @map("commission_amount")
  commissionCreated   Boolean             @default(false) @map("commission_created")
  commissionLedgerId  String?             @unique @map("commission_ledger_id")
  confirmedAt         DateTime            @map("confirmed_at")
  createdAt           DateTime            @default(now()) @map("created_at")
  
  @@index([referrerId])
  @@index([type])
  @@index([confirmedAt])
  @@map("conversion_events")
}

enum ConversionType {
  DRIVER_SUBSCRIPTION_PAID
  ADVERTISER_CAMPAIGN_PAID
  ADVERTISER_SUBSCRIPTION_PAID
}
```

---

## 5. PLAN DE ACCIÓN AUTÓNOMO (LOOP AGÉNTICO)

### FASE 0 — AISLAMIENTO Y PREPARACIÓN ✅ COMPLETADA
- [x] Auditar repositorio completo
- [x] Leer Plan Maestro TAD v1
- [x] Leer Skill "Ejecución del Plan Maestro de Estabilización"
- [x] Leer Prisma schema actual (822 líneas)
- [x] Leer auditoría integral (388 líneas, 177 hallazgos)
- [x] Identificar gaps modelo de datos (9 models faltantes)
- [x] Identificar hallazgos críticos bloqueantes (credenciales, RBAC, mocks, kill-switch)
- [x] Crear este documento de auditoría

### FASE 1 — SEGURIDAD Y RBAC (Prioridad P0) — **PRÓXIMA**
**Objetivo:** Cerrar sangría de acceso antes de cualquier cambio funcional

**Tareas:**
1. [ ] Rotar TODAS las credenciales expuestas (JWT_SECRET, Supabase password, anon keys)
2. [ ] Eliminar fallbacks hardcodeados de JWT_SECRET en 7+ archivos
3. [ ] Añadir `@Roles(UserRole.ADMIN)` a controladores críticos:
   - `device-admin.controller.ts` (C1)
   - `monitoring.controller.ts` fleet-status, gps-batch (C5, A5)
   - `media.controller.ts` (A7)
   - `notifications.controller.ts` (A6)
   - `sheets.controller.ts` (A13)
   - `telemetry.controller.ts` playback-batch (C4)
   - `portal-requests.controller.ts` (M16)
   - `kyc.controller.ts` (M18)
   - `referral.controller.ts` (M17)
4. [ ] Quitar `subscriptionPaid`/`subscriptionEnd` del DTO público `POST /drivers` (C2)
5. [ ] Auto-create device solo con status `INITIAL` (C3)
6. [ ] Validar cada evento en `playback-batch`, `verified=false` sin X-Tablet-Key válida (C4)
7. [ ] `.dockerignore` raíz: añadir `.env`, `.env.*`, `!*.env.example`
8. [ ] Desactivar webhook auto-deploy EasyPanel en `main`
9. [ ] `JWT_SECRET` → crash-early si falta en prod (main.ts:28-30)
8. [ ] Validación: `npx prisma validate`, `tsc --noEmit`, tests E2E críticos

### FASE 2 — ELIMINAR MOCK DATA Y PLACEHOLDERS (Prioridad P0)
**Objetivo:** Upload real de medios, eliminar fabricación de datos

**Tareas:**
1. [ ] Reemplazar `apps/admin/components/DirectUpload.tsx` → flujo `MediaService.generateUploadUrl()` + signed URL
2. [ ] Reemplazar `apps/advertiser/components/DirectUpload.tsx` → mismo flujo
3. [ ] Verificar `apps/driver/components/DirectUpload.tsx` — ya usa Supabase PERO bucket `campaign-videos` es `public: true` (M26) → cambiar a privado + RLS
4. [ ] `MediaService`: bucket `ads-videos` → `public: false` + RLS policies
5. [ ] Eliminar `registerBypassedMedia` o restringir a ADMIN + validar URL ownership
6. [ ] Validación: build admin/advertiser/driver, test upload real E2E

### FASE 3 — CONSOLIDACIÓN FUENTES DE VERDAD (Prioridad P1) — **YA HECHO**
- [x] `Wallet` model = fuente autoritativa
- [x] `Driver.walletBalance` eliminado (migración 20260916_wallet_unification)
- [x] `WalletService.withdraw()` usa `SELECT FOR UPDATE` + raw SQL atómico
- [x] `Driver.bankAccount` deprecado → `Wallet.bankInfo`
- **Verificar:** No queda código leyendo `Driver.walletBalance`

### FASE 4 — RESTRICCIÓN AGENTE SOCIAL (Prioridad P0)
**Objetivo:** Bloquear publicación automática a Meta Graph API

**Tareas:**
1. [ ] `SocialAgentService.publishPost()` → **REQUERIR** `HumanReviewTask` aprobada antes de publicar
2. [ ] Cambiar `SocialPostDraft.status`: `PENDING` → `HUMAN_REVIEW` → `APPROVED` → `PUBLISHED` / `REJECTED`
3. [ ] `publishPost()` solo permite transición `APPROVED` → `PUBLISHED` si `HumanReviewTask.decision === 'APPROVED'`
4. [ ] Añadir `@Roles(ADMIN)` a `social-agent.controller.ts` endpoints
5. [ ] Validación: test que draft en `PENDING` no se puede publicar

### FASE 5 — REVISIÓN REGLAS V12: IDEMPOTENCIA FINANCIERA (Prioridad P0)
**Objetivo:** `Idempotency-Key` header obligatorio + `prisma.$transaction` en todo flujo financiero

**Tareas:**
1. [ ] `finance.controller.ts:payrollPay()` → añadir `IdempotencyInterceptor` + `$transaction` + reference interno `PAY-YYMM-UUID8`
2. [ ] `campaign.service.ts` bonus referral (A15) → wrap en `$transaction`
3. [ ] `emailInvoice` (A3) → filtrar por `campaignId` AND `verified: true`
4. [ ] `Commission` creation → gate behind `PaymentVerification.status === CONFIRMED`
5. [ ] `ConversionEvent` + `CommissionLedger` creation atómica en `$transaction` tras `PaymentVerification`
6. [ ] Validación: test concurrente 10x `payroll/pay` con misma key → 1 solo pago

### FASE 6 — MODELOS NUEVOS PLAN MAESTRO (Fases 2-3 del Plan)
**Objetivo:** Implementar 9 models faltantes + migraciones + APIs

**Tareas:**
1. [ ] Añadir 9 models a `schema.prisma` (ver sección 4)
2. [ ] `npx prisma migrate dev --name "plan_maestro_models_phase2"`
3. [ ] Crear `LeadService`, `LeadController` con `@Roles(ADMIN)` + `TenantGuard` para leads propios
4. [ ] Crear `PaymentIntentService`, `PaymentEvidenceService`, `PaymentVerificationService`
5. [ ] Crear `HumanReviewTaskService` + admin UI "Bandeja de Revisión"
6. [ ] Crear `ReferralAttributionService` — inmutable, anti-duplicado
7. [ ] Crear `CommissionLedgerService` — acumulación mensual + batch liquidación
8. [ ] Crear `ConversationService` + `MessageService` — WhatsApp webhook (nuevo)
9. [ ] Crear `ConversionEventService` — trigger tras `PaymentVerification.CONFIRMED`
10. [ ] QR attribution: `ReferralService.generate()` → crea `ReferralAttribution` + `Lead`
11. [ ] Validación: `npx prisma validate`, `tsc --noEmit`, tests E2E 11 casos (Plan §9)

### FASE 7 — WHATSAPP BUSINESS API (Fase 4 del Plan)
**Objetivo:** Canal principal de piloto

**Tareas:**
1. [ ] Configurar WhatsApp Business API (Meta Developer Console)
2. [ ] Webhook `/api/whatsapp/webhook` con verificación `X-Hub-Signature-256`
3. [ ] `ConversationService.handleIncoming()` → crea/actualiza `Conversation` + `Message`
4. [ ] Agente comercial: plantillas aprobadas (no LLM libre), variables controladas
5. [ ] Handoff humano: `HumanReviewTask` tipo `PAYMENT_EVIDENCE` o `DRIVER_ONBOARDING`
6. [ ] Bloqueo técnico: agente NO puede confirmar pago, aprobar comisión, activar campaña
7. [ ] Validación: test flujo QR → WhatsApp → Lead → PaymentIntent → Evidence → Verification → Commission

### FASE 8 — CIERRE MENSUAL Y COMISIONES (Fase 6 del Plan)
**Objetivo:** Lote mensual inmutable, conciliación, pagos auditables

**Tareas:**
1. [ ] CRON mensual (día 1, 02:00) → `CommissionLedgerService.createMonthlyBatch()`
2. [ ] Batch: periodo, referentes, comisiones `APPROVED`, ajustes, retenciones, bruto, neto, fecha_aprobación, fecha_pago
3. [ ] Batch inmutable tras aprobación (solo ajuste compensatorio auditado)
4. [ ] Conciliación: `CommissionLedger` vs `FinancialTransaction` (WITHDRAWAL) vs `PayrollPayment`
5. [ ] Validación: test reembolso → `CommissionLedger.REVERSED` + `FinancialTransaction.REFUND`

---

## 6. COMANDOS DE VERIFICACIÓN OBLIGATORIOS (CADA FASE)

```bash
# 1. Prisma schema válido
cd /opt/data/tad-dooh-platform/apps/api && npx prisma validate

# 2. TypeScript sin errores (apps afectadas)
cd /opt/data/tad-dooh-platform/apps/api && npx tsc --noEmit
cd /opt/data/tad-dooh-platform/apps/admin && npx tsc --noEmit
cd /opt/data/tad-dooh-platform/apps/advertiser && npx tsc --noEmit
cd /opt/data/tad-dooh-platform/apps/driver && npx tsc --noEmit

# 3. Tests E2E críticos (Playwright)
cd /opt/data/tad-dooh-platform && npx playwright test tests/e2e/v12/ --reporter=line

# 4. Build Docker (simular EasyPanel)
cd /opt/data/tad-dooh-platform && docker build -f Dockerfile.api -t tad-api:test .
cd /opt/data/tad-dooh-platform && docker build -f Dockerfile.admin -t tad-admin:test .
cd /opt/data/tad-dooh-platform && docker build -f Dockerfile.advertiser -t tad-advertiser:test .
cd /opt/data/tad-dooh-platform && docker build -f Dockerfile.driver -t tad-driver:test .

# 5. Verificar contenedor NestJS estabiliza (prisma db push + node dist/main.js)
docker run --rm -e DATABASE_URL="..." tad-api:test
```

---

## 7. RIESGOS Y REGLAS DE NEGOCIO EN JUEGO (Skill + Plan)

| Regla | Riesgo | Mitigación |
|-------|--------|------------|
| **R9 (RBAC Estricto)** | Exposición endpoints admin si se modifican controladores sin reinyectar validadores JWT/roles | Añadir `@Roles(ADMIN)` ANTES de tocar lógica; test cada endpoint con token driver |
| **R8 (Idempotencia Financiera)** | Refactor wallet/comisiones → doble compensación, saldos fantasma | `IdempotencyKey` obligatorio + `$transaction` + test concurrencia 10x |
| **R1 (Offline-first)** | Alterar relaciones Prisma (campañas/dispositivos) → JSON incompleto rompe sync PWA | Verificar `sync.service.ts` output shape; test player offline 48h |
| **R3 (Kill-Switch)** | Bypass Flutter + TTL 24h local evade suspensión | Corregir `sync.service.ts` (subscriptionEnd), eliminar bypasses Flutter, player TTL server-driven |
| **R4 (Límite 15 slots)** | TOCTOU en count fuera de tx | Mover count dentro de tx con advisory lock |
| **Plan §2 (Regla confianza)** | Comprobante WhatsApp = prueba financiera | `PaymentEvidence` + `PaymentVerification` + `HumanReviewTask` obligatorios |
| **Plan §11 (Regla financiera)** | Pago RD$6,000 confirmado → comisión RD$500 creada → acumulada → liquidación mensual | `ConversionEvent` trigger → `CommissionLedger` creation atómica |

---

## 8. PRÓXIMO PASO INMEDIATO

**Iniciar FASE 1 — Seguridad y RBAC (P0)**

Crear branch `feature/security-rbac-phase1` y ejecutar tareas 1-9 de la sección 5.

¿Procedo con la FASE 1 de forma autónoma? (Crear branch, aplicar fixes, verificar con comandos obligatorios, reportar resultados)