/**
 * TAD DOOH — Reglas de Negocio Centralizadas
 *
 * Fuente de verdad única para todas las tarifas y umbrales del sistema.
 * Modificar aquí afecta automáticamente todos los servicios que importen estas constantes.
 */

export const BUSINESS_RULES = {
  /** RD$ que gana el conductor por cada campaña activa en su tablet al mes */
  DRIVER_RATE_PER_CAMPAIGN_RD: 500,

  /** RD$ por cada playback verificado (30s ad play). M15: tarifa única centralizada. */
  DRIVER_RATE_PER_AD_PLAY_RD: 1.25,

  /** RD$ de comisión por cada conductor activo referido */
  DRIVER_REFERRAL_BONUS_RD: 500,

  /** RD$ de comisión por cada anunciante referido */
  ADVERTISER_REFERRAL_BONUS_RD: 500,

  /** Costo anual del Starter Kit (Membresía) en RD$ */
  STARTER_KIT_ANNUAL_FEE_RD: 6000,

  /** Máximo de campañas simultáneas que puede tener un conductor */
  MAX_CAMPAIGNS_PER_DRIVER: 15,

  /** Límite de peso para archivos multimedia (55MB) en bytes (55 * 1024 * 1024) */
  MAX_VIDEO_SIZE_MB: 55,
  MAX_VIDEO_SIZE_BYTES: 57671680,

  /** Tipos MIME permitidos para piezas publicitarias (video MP4 H.264 + estáticos JPG/PNG) */
  ALLOWED_MEDIA_MIME_TYPES: [
    "video/mp4",
    "video/quicktime",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],

  /** Extensiones permitidas para piezas publicitarias */
  ALLOWED_MEDIA_EXTENSIONS: [".mp4", ".mov", ".jpg", ".jpeg", ".png", ".webp"],

  /** Máximo de campañas activas simultáneas por anunciante */
  MAX_CAMPAIGNS_PER_ADVERTISER: 15,

  /**
   * @deprecated Historic fixed rate (RD$1,500). Do not use this as the base
   * price for NEW advertiser offers. Confirmed base is RD$2,500/screen/month;
   * RD$1,500 is the 40%-discounted rate ONLY with a server-verified driver
   * referral code. Use calculateAdvertiserOffer() for new quote requests.
   *
   * Kept unchanged until legacy billing/BI consumers and historical invoice
   * semantics are migrated via an independently reviewed financial rollout.
   */
  ADVERTISER_COST_PER_CAMPAIGN_RD: 1500,

  /** Tasa de ITBIS aplicable (18%) */
  ITBIS_RATE: 0.18,

  /**
   * Duración fija del slot publicitario en segundos.
   * Regla de negocio: cada anuncio se reproduce exactamente cada 30 segundos.
   * El manifiesto de sync y el player deben forzar este valor.
   */
  AD_SLOT_DURATION_SECONDS: 30,

  // ==========================================
  // CONFIGURACIÓN DE SEGURIDAD
  // ==========================================
  JWT_EXPIRY: "7d",
  BCRYPT_ROUNDS: 10,

  // ==========================================
  // ESTADOS POR DEFECTO (ONBOARDING)
  // ==========================================
  STATUS: {
    DRIVER: {
      INITIAL: "PENDIENTE_PAGO",
      ACTIVE: "OPERATIVO",
      // @deprecated Use 'BLOCKED' (alias) en código nuevo. Se conserva
      // 'SUSPENDED' por compatibilidad — apunta al mismo string histórico.
      SUSPENDED: "BLOQUEADO",
      BLOCKED: "BLOQUEADO",
      ONBOARDING: {
        TOS_PENDING: "TOS_PENDING", // Recién creado, pendiente aceptar TOS
        READY: "READY", // TOS aceptado, pendiente pago suscripción
        PENDING_PAYMENT: "PENDING_PAYMENT", // Alias semántico para READY (pago pendiente)
        BANK_PENDING: "BANK_PENDING", // Pago confirmado, pendiente configurar cuenta bancaria
        COMPLETED: "COMPLETED", // Onboarding 100% completo (TOS + Pago + Banco)
      },
    },
    ADVERTISER: {
      INITIAL: "PENDING_REVIEW",
      ACTIVE: "ACTIVE",
      SUSPENDED: "SUSPENDED",
    },
    CAMPAIGN: {
      DRAFT: "DRAFT",
      PENDING: "PENDING_REVIEW",
      PENDING_PAYMENT: "PENDING_PAYMENT",
      ACTIVE: "ACTIVE",
      COMPLETED: "COMPLETED",
    },
    DEVICE: {
      ACTIVE: "OPERATIVO",
      // @deprecated Use 'BLOCKED'.
      SUSPENDED: "BLOQUEADO",
      BLOCKED: "BLOQUEADO",
      INITIAL: "PENDIENTE_PAGO",
    },
  },

  /** Niveles de desempeño del chofer definidos según horas de transmisión */
  LEVELS: {
    BASE: { hours: 120, label: "BASE", priority: 1, penalty: 0.1 },
    PLATA: { hours: 160, label: "PLATA", priority: 2, penalty: 0 },
    ORO: { hours: 200, label: "ORO", priority: 3, penalty: 0 },
  },

  /** Penalización se aplica tras N meses consecutivos incumpliendo la meta de horas. */
  PENALTY_THRESHOLD_MONTHS: 2,

  /** TTL de comandos de dispositivo en días */
  COMMAND_TTL_DAYS: 7,

  /** Tasa de retención por referidos (10%) */
  REFERRAL_RETENTION_RATE: 0.1,

  /**
   * Tasa de churn mensual por defecto (4.5%).
   * Usada por `bi.service.ts:getBiDashboard()` cuando no hay datos históricos
   * suficientes para calcular el churn real. Si se requiere un valor dinámico,
   * debe migrarse a `SystemSettings` (tabla `system_settings`).
   */
  CHURN_RATE_DEFAULT: 0.045,

  /**
   * RNC del emisor (TAD Taxi Advertising SRL) para exportaciones contables DGII
   * (formatos 606/607/608). TODO(config): completar con el RNC real de la empresa
   * antes de presentación formal ante la DGII. Si queda vacío, los CSV se
   * generan igualmente pero con el campo RNC Emisor en blanco.
   */
  DGII_RNC_EMISOR: "",
} as const;

export type BusinessRules = typeof BUSINESS_RULES;

/** Salt rounds para bcrypt — configurable vía env, default 10 */
export const BCRYPT_ROUNDS = BUSINESS_RULES.BCRYPT_ROUNDS;

/** Duración del JWT de sesión */
export const JWT_EXPIRY = BUSINESS_RULES.JWT_EXPIRY;

/** Versión actual del contrato de socio conductor */
export const CONTRACT_VERSION = "2.0";
