"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACT_VERSION = exports.JWT_EXPIRY = exports.BCRYPT_ROUNDS = exports.BUSINESS_RULES = void 0;
exports.BUSINESS_RULES = {
    DRIVER_RATE_PER_CAMPAIGN_RD: 500,
    DRIVER_REFERRAL_BONUS_RD: 500,
    ADVERTISER_REFERRAL_BONUS_RD: 500,
    STARTER_KIT_ANNUAL_FEE_RD: 6000,
    MAX_CAMPAIGNS_PER_DRIVER: 15,
    MAX_VIDEO_SIZE_MB: 55,
    MAX_VIDEO_SIZE_BYTES: 57671680,
    ALLOWED_MEDIA_MIME_TYPES: [
        'video/mp4',
        'image/jpeg',
        'image/png',
    ],
    ALLOWED_MEDIA_EXTENSIONS: ['.mp4', '.jpg', '.jpeg', '.png'],
    MAX_CAMPAIGNS_PER_ADVERTISER: 15,
    ADVERTISER_COST_PER_CAMPAIGN_RD: 1500,
    ITBIS_RATE: 0.18,
    JWT_EXPIRY: '7d',
    BCRYPT_ROUNDS: 10,
    STATUS: {
        DRIVER: {
            INITIAL: 'PENDIENTE_PAGO',
            ACTIVE: 'OPERATIVO',
            SUSPENDED: 'BLOQUEADO',
            BLOCKED: 'BLOQUEADO',
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
            BLOCKED: 'BLOQUEADO',
            INITIAL: 'PENDIENTE_PAGO',
        }
    },
    LEVELS: {
        BASE: { hours: 120, label: 'BASE', priority: 1, penalty: 0.10 },
        PLATA: { hours: 160, label: 'PLATA', priority: 2, penalty: 0 },
        ORO: { hours: 200, label: 'ORO', priority: 3, penalty: 0 },
    },
    PENALTY_THRESHOLD_MONTHS: 2,
    COMMAND_TTL_DAYS: 7,
    REFERRAL_RETENTION_RATE: 0.10,
    CHURN_RATE_DEFAULT: 0.045,
};
exports.BCRYPT_ROUNDS = exports.BUSINESS_RULES.BCRYPT_ROUNDS;
exports.JWT_EXPIRY = exports.BUSINESS_RULES.JWT_EXPIRY;
exports.CONTRACT_VERSION = '2.0';
//# sourceMappingURL=business-rules.js.map