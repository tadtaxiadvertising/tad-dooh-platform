"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AppModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const sentry_interceptor_1 = require("./common/interceptors/sentry.interceptor");
const zod = __importStar(require("zod"));
const device_module_1 = require("./modules/device/device.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const campaign_module_1 = require("./modules/campaign/campaign.module");
const fleet_module_1 = require("./modules/fleet/fleet.module");
const media_module_1 = require("./modules/media/media.module");
const assets_module_1 = require("./modules/assets/assets.module");
const drivers_module_1 = require("./modules/drivers/drivers.module");
const advertisers_module_1 = require("./modules/advertisers/advertisers.module");
const finance_module_1 = require("./modules/finance/finance.module");
const sync_module_1 = require("./modules/sync/sync.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const prisma_module_1 = require("./modules/prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const supabase_module_1 = require("./modules/supabase/supabase.module");
const sheets_module_1 = require("./modules/sheets/sheets.module");
const auth_service_1 = require("./modules/auth/auth.service");
const supabase_auth_guard_1 = require("./modules/auth/guards/supabase-auth.guard");
const logger_middleware_1 = require("./middleware/logger.middleware");
const simulation_module_1 = require("./modules/simulation/simulation.module");
const antigravity_module_1 = require("./antigravity/antigravity.module");
const portal_requests_module_1 = require("./modules/portal-requests/portal-requests.module");
const bi_module_1 = require("./modules/bi/bi.module");
const monitoring_module_1 = require("./modules/monitoring/monitoring.module");
const roles_guard_1 = require("./modules/auth/guards/roles.guard");
const app_controller_1 = require("./app.controller");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const telemetry_module_1 = require("./modules/telemetry/telemetry.module");
const referral_module_1 = require("./modules/referral/referral.module");
const system_settings_module_1 = require("./modules/system-settings/system-settings.module");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const kyc_module_1 = require("./modules/kyc/kyc.module");
const health_controller_1 = require("./health/health.controller");
let AppModule = AppModule_1 = class AppModule {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AppModule_1.name);
    }
    configure(consumer) {
        consumer.apply(logger_middleware_1.LoggerMiddleware).forRoutes('*');
    }
    async onModuleInit() {
        this.logger.log('🚀 TAD Backend Iniciado.');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = AppModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
                ignoreEnvFile: process.env.NODE_ENV === 'production',
                validate: (config) => {
                    const schema = zod.object({
                        DATABASE_URL: zod.string().url().optional(),
                        DIRECT_URL: zod.string().url().optional(),
                        JWT_SECRET: zod.string().default('tad-secret-2026'),
                        SUPABASE_URL: zod.string().url(),
                        SUPABASE_SERVICE_ROLE_KEY: zod.string().min(10),
                        SUPABASE_JWT_SECRET: zod.string().optional(),
                        PORT: zod.string().regex(/^\d+$/).default('3000'),
                        NODE_ENV: zod.string().default('production'),
                        CORS_ORIGIN: zod.string().default('*'),
                        UMAMI_API_TOKEN: zod.string().optional(),
                        CDN_URL_PREFIX: zod.string().url().optional(),
                    });
                    const result = schema.safeParse(config);
                    if (!result.success) {
                        console.error('🔥 FATAL ERROR: Configuración de entorno inválida en startup', result.error.format());
                        throw new Error('Configuración de entorno inválida. Revisar variables en Easypanel.');
                    }
                    const data = result.data || config;
                    if (!data.SUPABASE_JWT_SECRET && data.JWT_SECRET) {
                        data.SUPABASE_JWT_SECRET = data.JWT_SECRET;
                    }
                    return data;
                },
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            supabase_module_1.SupabaseModule,
            device_module_1.DeviceModule,
            analytics_module_1.AnalyticsModule,
            campaign_module_1.CampaignModule,
            fleet_module_1.FleetModule,
            media_module_1.MediaModule,
            assets_module_1.AssetsModule,
            drivers_module_1.DriversModule,
            advertisers_module_1.AdvertisersModule,
            finance_module_1.FinanceModule,
            sync_module_1.SyncModule,
            notifications_module_1.NotificationsModule,
            sheets_module_1.SheetsModule,
            antigravity_module_1.AntigravityModule,
            portal_requests_module_1.PortalRequestsModule,
            bi_module_1.BiModule,
            monitoring_module_1.MonitoringModule,
            wallet_module_1.WalletModule,
            telemetry_module_1.TelemetryModule,
            referral_module_1.ReferralModule,
            system_settings_module_1.SystemSettingsModule,
            simulation_module_1.SimulationModule,
            onboarding_module_1.OnboardingModule,
            kyc_module_1.KYCModule,
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: supabase_auth_guard_1.SupabaseAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: sentry_interceptor_1.SentryInterceptor,
            },
        ],
    }),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AppModule);
//# sourceMappingURL=app.module.js.map