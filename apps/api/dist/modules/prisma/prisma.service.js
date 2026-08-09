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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        let url = process.env.DATABASE_URL;
        let warnMsg;
        if (url && !url.includes('connection_limit=')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}connection_limit=5`;
        }
        else if (url && url.includes('connection_limit=')) {
            const match = url.match(/connection_limit=(\\d+)/);
            if (match && parseInt(match[1]) > 10) {
                warnMsg = `⚠️ [SRE] connection_limit=${match[1]} detectado en DATABASE_URL. Recomendado: 5 para EasyPanel Free Tier.`;
            }
        }
        if (url && !url.includes('pool_timeout=')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}pool_timeout=10`;
        }
        if (url && !url.includes('sslmode=')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}sslmode=require`;
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
        if (warnMsg) {
            this.logger.warn(warnMsg);
        }
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
                const errMsg = e instanceof Error ? e.message : String(e);
                this.logger.error(`❌ Intento ${attempts}/${MAX_RETRIES} fallido: ${errMsg}`);
                if (attempts >= MAX_RETRIES) {
                    this.logger.error('🚨 ERROR FATAL: No se pudo conectar a la base de datos tras 5 intentos.');
                    this.logger.error(`Último error: ${errMsg}`);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async initializeSreViews() {
        try {
            this.logger.log('🏗️ Sincronizando Vistas Materializadas (Master Sync)...');
            const viewsFile = path.resolve(process.cwd(), 'prisma/views.sql');
            if (!fs.existsSync(viewsFile)) {
                this.logger.warn('⚠️ No se encontró prisma/views.sql. Saltando.');
                return;
            }
            const sql = fs.readFileSync(viewsFile, 'utf8');
            const statements = this.splitSqlStatements(sql);
            for (const query of statements) {
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
    splitSqlStatements(sql) {
        const statements = [];
        let current = '';
        let dollarDepth = 0;
        for (let i = 0; i < sql.length; i++) {
            const c = sql[i];
            current += c;
            if (c === '$' && i + 1 < sql.length && sql[i + 1] === '$') {
                dollarDepth++;
                i++;
                current += sql[i];
            }
            else if (c === ';' && dollarDepth % 2 === 0) {
                const trimmed = current.replace(/;\s*$/, '').trim();
                if (trimmed.length > 0)
                    statements.push(trimmed + ';');
                current = '';
            }
        }
        const trimmed = current.trim();
        if (trimmed.length > 0)
            statements.push(trimmed);
        return statements;
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
    async getHealthMetrics() {
        try {
            const result = await this.$queryRaw `
        SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()
      `;
            return {
                connected: true,
                activeConnections: Number(result[0]?.active_connections ?? 0),
            };
        }
        catch {
            return { connected: false };
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map