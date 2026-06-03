/**
 * TAD DOOH — Reglas de Negocio Centralizadas
 *
 * Fuente de verdad única para todas las tarifas y umbrales del sistema.
 * Modificar aquí afecta automáticamente todos los servicios que importen estas constantes.
 */

export const BUSINESS_RULES = {
  /** RD$ que gana el conductor por cada campaña activa en su tablet al mes */
  DRIVER_RATE_PER_CAMPAIGN_RD: 500,

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

  /** Costo por campaña para el anunciante en RD$ (subtotal sin ITBIS) */
  ADVERTISER_COST_PER_CAMPAIGN_RD: 1500,

  /** Tasa de ITBIS aplicable (18%) */
  ITBIS_RATE: 0.18,

  // ==========================================
  // CONFIGURACIÓN DE SEGURIDAD
  // ==========================================
  JWT_EXPIRY: '7d',
  BCRYPT_ROUNDS: 10,

  // ==========================================
  // ESTADOS POR DEFECTO (ONBOARDING)
  // ==========================================
  STATUS: {
    DRIVER: {
      INITIAL: 'PENDIENTE_PAGO',
      ACTIVE: 'OPERATIVO',
      SUSPENDED: 'BLOQUEADO',
      ONBOARDING: {
        TOS_PENDING: 'TOS_PENDING',
        READY: 'READY',
      }
    },
    ADVERTISER: {
      INITIAL: 'PENDING_REVIEW',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
    },
    CAMPAIGN: {
      DRAFT: 'DRAFT',
      PENDING: 'PENDING_REVIEW',
      PENDING_PAYMENT: 'PENDING_PAYMENT',
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
    },
    DEVICE: {
      ACTIVE: 'OPERATIVO',
      SUSPENDED: 'BLOQUEADO',
      INITIAL: 'PENDIENTE_PAGO',
    }
  },

  /** Niveles de desempeño del chofer basados en horas de transmisión */
  LEVELS: {
    BASE: { hours: 120, label: 'BASE', priority: 1, penalty: 0.10 },
    PLATA: { hours: 160, label: 'PLATA', priority: 2, penalty: 0 },
    ORO: { hours: 200, label: 'ORO', priority: 3, penalty: 0 },
  },

  /** TTL de comandos de dispositivo en días */
  COMMAND_TTL_DAYS: 7,

  /** Tasa de retención por referidos (10%) */
  REFERRAL_RETENTION_RATE: 0.10,

  /** Monto mínimo de retiro para conductores (RD$) */
  MIN_WITHDRAWAL_AMOUNT_RD: 500,

  /** Segundos de debounce para ingesta de telemetría GPS (5 min) */
  TELEMETRY_DEBOUNCE_SECONDS: 300,

  /** Minutos de offline para marcar dispositivo como OFFLINE */
  OFFLINE_THRESHOLD_MINUTES: 15,

  /** Horas sin señal para marcar connectivity_issue (crítico) */
  CRITICAL_OFFLINE_HOURS: 48,
} as const;

export type BusinessRules = typeof BUSINESS_RULES;

/** Salt rounds para bcrypt — configurable vía env, default 10 */
export const BCRYPT_ROUNDS = BUSINESS_RULES.BCRYPT_ROUNDS;

/** Duración del JWT de sesión */
export const JWT_EXPIRY = BUSINESS_RULES.JWT_EXPIRY;

/** Versión actual del contrato de socio conductor */
export const CONTRACT_VERSION = '2.0';
