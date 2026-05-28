"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    constructor() {
        this.logger = new common_1.Logger(WhatsAppService_1.name);
        this.INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || 'instance_mock';
        this.TOKEN = process.env.ULTRAMSG_TOKEN || 'token_mock';
        this.API_URL = `https://api.ultramsg.com/${this.INSTANCE_ID}/messages/chat`;
    }
    async sendMessage(to, message) {
        const cleanTo = to.replace(/\D/g, '');
        this.logger.log(`📱 WHATSAPP_OUTGOING -> Para: ${cleanTo} | Mensaje: ${message.substring(0, 50)}...`);
        if (this.TOKEN === 'token_mock') {
            return { success: true, id: `mock-${Date.now()}` };
        }
        try {
            const response = await axios_1.default.post(this.API_URL, {
                token: this.TOKEN,
                to: cleanTo,
                body: message,
                priority: 10
            });
            return { success: response.status === 200, id: response.data.id };
        }
        catch (err) {
            this.logger.error(`❌ Error enviando WhatsApp a ${to}: ${err.message}`);
            return { success: false };
        }
    }
    async sendImpactReport(to, advertiserName, campaignName, reportUrl) {
        const message = `🚀 *REPORTE DE IMPACTO TAD*\n\nHola *${advertiserName}*,\n\nTu campaña *"${campaignName}"* está teniendo un excelente rendimiento. Adjuntamos tu reporte de inteligencia táctica certificado:\n\n🔗 Ver Reporte: ${reportUrl}\n\nGracias por confiar en la red TAD Dominicana. 🚗🎥`;
        return this.sendMessage(to, message);
    }
    async sendDriverPaymentConfirm(to, driverName, amount, month) {
        const message = `✅ *PAGO PROCESADO - TAD*\n\nHola *${driverName}*,\n\nSe ha procesado tu liquidación publicitaria de *${month}* por un monto de *RD$ ${amount.toLocaleString()}*.\n\nRecuerda mantener tu tablet encendida para maximizar tus ingresos diaria. 🚗💰\n\n_Equipo TAD Dominicana._`;
        return this.sendMessage(to, message);
    }
    async sendDelinquencyAlert(to, driverName, deviceId) {
        const message = `⚠️ *AVISO DE MOROSIDAD - TAD*\n\nHola *${driverName}*,\n\nDetectamos un retraso en el pago de suscripción para tu dispositivo *${deviceId}*.\n\nEl servicio de reproducción publicitaria ha sido suspendido temporalmente. Para reactivarlo, favor realizar el pago de *RD$ 6,000* vía transferencia.\n\n_Tu éxito es nuestro motor. Equipo TAD Dominicana._`;
        return this.sendMessage(to, message);
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)()
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map