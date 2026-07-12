"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./modules/prisma/prisma.service");
const common_1 = require("@nestjs/common");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
if (!BigInt.prototype.toJSON) {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
}
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
            logger.error('❌ FATAL: JWT_SECRET no configurado en producción. Abortando arranque.');
            process.exit(1);
        }
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            bufferLogs: true,
            logger: ['error', 'warn', 'log', 'debug'],
        });
        const prismaService = app.get(prisma_service_1.PrismaService);
        app.enableShutdownHooks();
        app.setGlobalPrefix('api/v1', {
            exclude: [
                { path: '/', method: common_1.RequestMethod.GET },
                { path: 'api', method: common_1.RequestMethod.GET },
                { path: 'api/health', method: common_1.RequestMethod.GET },
                { path: 'api/v1', method: common_1.RequestMethod.GET },
                { path: 'health', method: common_1.RequestMethod.GET },
            ],
        });
        const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
        const baseOrigins = [
            'https://tad-admin.rewvid.easypanel.host',
            'https://tad-driver.rewvid.easypanel.host',
            'https://tad-advertiser.rewvid.easypanel.host',
            'https://tad-api.rewvid.easypanel.host',
            'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host',
            'https://proyecto-ia-tad-player.rewvid.easypanel.host',
            'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host',
            'https://proyecto-ia-tad-driver.rewvid.easypanel.host',
            'https://proyecto-ia-tad-simulator.rewvid.easypanel.host',
            'https://tad-simulator.rewvid.easypanel.host',
        ];
        const allowedOrigins = [...new Set([...baseOrigins, ...envOrigins])]
            .map((o) => o.replace(/\/$/, ''));
        const allowAllOrigins = allowedOrigins.includes('*');
        if (process.env.NODE_ENV !== 'production') {
            allowedOrigins.push('http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3000');
        }
        app.enableCors({
            origin: (origin, callback) => {
                if (!origin) {
                    callback(null, true);
                    return;
                }
                const normalizedOrigin = origin.replace(/\/$/, '');
                if (allowAllOrigins || allowedOrigins.includes(normalizedOrigin)) {
                    callback(null, true);
                    return;
                }
                logger.warn(`[CORS] Blocked origin: ${origin}. Configure CORS_ORIGIN to allow it.`);
                callback(new Error(`CORS blocked for origin: ${origin}`), false);
            },
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, X-Device-Id, X-Tablet-Id, X-Tablet-Key, X-Admin-Secret',
            credentials: true,
            optionsSuccessStatus: 204,
            preflightContinue: false,
        });
        app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
        const port = process.env.PORT || 3000;
        await app.listen(port, '0.0.0.0');
        logger.log(`🚀 TAD DOOH API Gateway Operativo en el puerto ${port}`);
    }
    catch (error) {
        logger.error('❌ CRASH FATAL DE ARRANQUE:', error instanceof Error ? error.stack : JSON.stringify(error));
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map