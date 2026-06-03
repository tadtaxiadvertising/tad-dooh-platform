export declare const BUSINESS_RULES: {
    readonly DRIVER_RATE_PER_CAMPAIGN_RD: 500;
    readonly DRIVER_REFERRAL_BONUS_RD: 500;
    readonly ADVERTISER_REFERRAL_BONUS_RD: 500;
    readonly STARTER_KIT_ANNUAL_FEE_RD: 6000;
    readonly MAX_CAMPAIGNS_PER_DRIVER: 15;
    readonly MAX_VIDEO_SIZE_MB: 55;
    readonly MAX_VIDEO_SIZE_BYTES: 57671680;
    readonly ADVERTISER_COST_PER_CAMPAIGN_RD: 1500;
    readonly ITBIS_RATE: 0.18;
    readonly JWT_EXPIRY: "7d";
    readonly BCRYPT_ROUNDS: 10;
    readonly STATUS: {
        readonly DRIVER: {
            readonly INITIAL: "PENDIENTE_PAGO";
            readonly ACTIVE: "OPERATIVO";
            readonly SUSPENDED: "BLOQUEADO";
            readonly ONBOARDING: {
                readonly TOS_PENDING: "TOS_PENDING";
                readonly READY: "READY";
            };
        };
        readonly ADVERTISER: {
            readonly INITIAL: "PENDING_REVIEW";
            readonly ACTIVE: "ACTIVE";
            readonly SUSPENDED: "SUSPENDED";
        };
        readonly CAMPAIGN: {
            readonly DRAFT: "DRAFT";
            readonly PENDING: "PENDING_REVIEW";
            readonly PENDING_PAYMENT: "PENDING_PAYMENT";
            readonly ACTIVE: "ACTIVE";
            readonly COMPLETED: "COMPLETED";
        };
        readonly DEVICE: {
            readonly ACTIVE: "OPERATIVO";
            readonly SUSPENDED: "BLOQUEADO";
            readonly INITIAL: "PENDIENTE_PAGO";
        };
    };
    readonly LEVELS: {
        readonly BASE: {
            readonly hours: 120;
            readonly label: "BASE";
            readonly priority: 1;
            readonly penalty: 0.1;
        };
        readonly PLATA: {
            readonly hours: 160;
            readonly label: "PLATA";
            readonly priority: 2;
            readonly penalty: 0;
        };
        readonly ORO: {
            readonly hours: 200;
            readonly label: "ORO";
            readonly priority: 3;
            readonly penalty: 0;
        };
    };
    readonly COMMAND_TTL_DAYS: 7;
    readonly REFERRAL_RETENTION_RATE: 0.1;
};
export type BusinessRules = typeof BUSINESS_RULES;
export declare const BCRYPT_ROUNDS: 10;
export declare const JWT_EXPIRY: "7d";
export declare const CONTRACT_VERSION = "2.0";
