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
var SupabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SupabaseService_1.name);
        const url = this.configService.get('SUPABASE_URL');
        const key = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!url || !key) {
            this.logger.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is undefined!');
            throw new Error('MISSING_SUPABASE_CREDENTIALS: El contenedor no tiene acceso a las credenciales necesarias.');
        }
        try {
            this.supabase = (0, supabase_js_1.createClient)(url, key, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                }
            });
            this.logger.log(`SupabaseService initialized | URL: ${url.substring(0, 30)}... | Key: ***${key.slice(-6)}`);
        }
        catch (error) {
            this.logger.error(`Error fatal instanciando cliente Supabase: ${error.message}`);
            throw error;
        }
    }
    getPublicUrl(path, bucket = 'campaign-videos') {
        const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }
    async listMediaFiles(bucket = 'campaign-videos') {
        const { data, error } = await this.supabase.storage.from(bucket).list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
        });
        if (error)
            throw error;
        return data.map(file => ({
            ...file,
            url: this.getPublicUrl(file.name, bucket)
        }));
    }
    getClient() {
        return this.supabase;
    }
    async broadcastEvent(channelName, eventName, payload) {
        this.logger.log(`[REALTIME] Broadcasting ${eventName} to channel: ${channelName}`);
        const channel = this.supabase.channel(channelName);
        return channel.httpSend(eventName, {
            ...payload,
            timestamp: new Date().toISOString()
        });
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map