"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        let url = process.env.DATABASE_URL;
        if (url && !url.includes('connection_limit=')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}connection_limit=5`;
        }
        else if (url && url.includes('connection_limit=')) {
            const match = url.match(/connection_limit=(\d+)/);
            if (match && parseInt(match[1]) > 10) {
                console.warn(`⚠️ [SRE] connection_limit=${match[1]} detectado en DATABASE_URL. Recomendado: 5 para EasyPanel Free Tier.`);
            }
        }
        super({
            datasources: {
                db: {
                    url,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        this.logger.log('🔌 Inicializando conexión al Pooler de Supabase...');
        const MAX_RETRIES = 5;
        let attempts = 0;
        while (attempts < MAX_RETRIES) {
            try {
                await this.$connect();
                this.logger.log(`✅ Conexión establecida con éxito en el intento ${attempts + 1}`);
                this.initializeSreViews().catch(e => {
                    this.logger.error(`❌ Fallo en inicialización de fondo: ${e.message}`);
                });
                return;
            }
            catch (e) {
                attempts++;
                const delay = attempts * 2000;
                this.logger.error(`❌ Intento ${attempts}/${MAX_RETRIES} fallido al conectar a Supabase. Reintentando en ${delay / 1000}s...`);
                if (attempts >= MAX_RETRIES) {
                    this.logger.error('🚨 ERROR FATAL: No se pudo conectar a la base de datos tras 5 intentos.');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async initializeSreViews() {
        try {
            this.logger.log('🏗️ Sincronizando Vistas Materializadas (Master Sync)...');
            const fs = require('fs');
            const path = require('path');
            const viewsFile = path.resolve(process.cwd(), 'prisma/views.sql');
            if (!fs.existsSync(viewsFile)) {
                this.logger.warn('⚠️ No se encontró prisma/views.sql. Saltando.');
                return;
            }
            const sql = fs.readFileSync(viewsFile, 'utf8');
            const queries = sql.split(';').map((q) => q.trim()).filter((q) => q.length > 0);
            for (const query of queries) {
                await this.$executeRawUnsafe(query).catch(e => {
                    if (!e.message.includes('already exists')) {
                        this.logger.error(`Error SQL en vista: ${e.message}`);
                    }
                });
            }
            this.logger.log('✅ Master Sync Views configuradas.');
        }
        catch (viewError) {
            this.logger.error(`❌ Fallo al cargar script de vistas: ${viewError.message}`);
        }
    }
    async onModuleDestroy() {
        this.logger.log('🔌 Cierre de conexiones al Pooler solicitado (Shutdown/Redeploy)...');
        await this.$disconnect();
    }
    async refreshActiveCampaignsView() {
        this.logger.log('🔄 Refrescando Materialized View (Master Sync)...');
        try {
            await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;');
            this.logger.log('✅ mv_active_campaigns actualizada con éxito.');
        }
        catch (e) {
            if (e.message.includes('not been populated')) {
                await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_active_campaigns;');
            }
            else {
                this.logger.error(`❌ Error al refrescar vista: ${e.message}`);
            }
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map