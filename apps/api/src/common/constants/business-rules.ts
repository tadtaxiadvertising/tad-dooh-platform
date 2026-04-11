/**
 * TAD DOOH — Reglas de Negocio Centralizadas
 *
 * Fuente de verdad única para todas las tarifas y umbrales del sistema.
 * Modificar aquí afecta automáticamente todos los servicios que importen estas constantes.
 */

export const BUSINESS_RULES = {
  /** RD$ que gana el conductor por cada campaña activa en su tablet al mes */
  DRIVER_RATE_PER_CAMPAIGN_RD: 500,

  /** RD$ de bono mensual por disponibilidad GPS (requiere >= GPS_BONUS_THRESHOLD pings) */
  AVAILABILITY_BONUS_RD: 500,

  /** Número mínimo de pings GPS en el mes para calificar al bono de disponibilidad */
  GPS_BONUS_THRESHOLD: 100,

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
      INITIAL: 'PENDING_PAYMENT',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
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
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
    }
  }
} as const;

export type BusinessRules = typeof BUSINESS_RULES;

/** Salt rounds para bcrypt — configurable vía env, default 10 */
export const BCRYPT_ROUNDS = BUSINESS_RULES.BCRYPT_ROUNDS;

/** Duración del JWT de sesión */
export const JWT_EXPIRY = BUSINESS_RULES.JWT_EXPIRY;

/** Versión actual del contrato de socio conductor */
export const CONTRACT_VERSION = '2.0';
