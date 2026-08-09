"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntigravityService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let AntigravityService = class AntigravityService {
    constructor() {
        this.logger = new common_1.Logger('AntigravityService');
    }
    async streamAIContent(prompt) {
        const API_KEY = process.env.GEMINI_API_KEY?.trim();
        const PROJECT_ID = process.env.SUPABASE_PROJECT_ID?.trim() || "ltdcdhqixvbpdcitthqf";
        const region = 'us-central1';
        const model = 'gemini-1.5-flash';
        const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${region}/publishers/google/models/${model}:streamGenerateContent`;
        try {
            this.logger.log(`[ANTIGRAVITY] Handshake regionalizado: ${region}`);
            const response = await axios_1.default.post(url, {
                contents: [{ parts: [{ text: prompt }] }]
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream'
            });
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 404) {
                this.logger.error(`[404 NOT FOUND] La entidad no existe en ${region}. Probando fallback global...`);
                return this.fallbackGlobal(prompt, API_KEY);
            }
            throw new common_1.InternalServerErrorException('Falla total de Antigravity');
        }
    }
    async fallbackGlobal(prompt, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`;
        const response = await axios_1.default.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        }, { responseType: 'stream' });
        return response.data;
    }
};
exports.AntigravityService = AntigravityService;
exports.AntigravityService = AntigravityService = __decorate([
    (0, common_1.Injectable)()
], AntigravityService);
//# sourceMappingURL=antigravity.service.js.map