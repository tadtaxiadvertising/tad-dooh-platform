import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  
  // Placeholder para credenciales (Pueden moverse a .env luego)
  private readonly INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || 'instance_mock';
  private readonly TOKEN = process.env.ULTRAMSG_TOKEN || 'token_mock';
  private readonly API_URL = `https://api.ultramsg.com/${this.INSTANCE_ID}/messages/chat`;

  /**
   * Envía un mensaje de texto por WhatsApp.
   * Por ahora opera en modo MOCK/LOGS hasta tener la API Key oficial.
   */
  async sendMessage(to: string, message: string): Promise<{ success: boolean; id?: string }> {
    const cleanTo = to.replace(/\D/g, ''); // Limpiar caracteres no numéricos
    
    this.logger.log(`📱 WHATSAPP_OUTGOING -> Para: ${cleanTo} | Mensaje: ${message.substring(0, 50)}...`);

    // SI NO HAY TOKEN REAL, SOLO LOGUEAMOS ÉXITO (Simulación para Piloto)
    if (this.TOKEN === 'token_mock') {
      return { success: true, id: `mock-${Date.now()}` };
    }

    try {
      const response = await axios.post(this.API_URL, {
        token: this.TOKEN,
        to: cleanTo,
        body: message,
        priority: 10
      });

      return { success: response.status === 200, id: response.data.id };
    } catch (err) {
      this.logger.error(`❌ Error enviando WhatsApp a ${to}: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * Envía el Reporte de Impacto a un Anunciante
   */
  async sendImpactReport(to: string, advertiserName: string, campaignName: string, reportUrl: string) {
    const message = `🚀 *REPORTE DE IMPACTO TAD*\n\nHola *${advertiserName}*,\n\nTu campaña *"${campaignName}"* está teniendo un excelente rendimiento. Adjuntamos tu reporte de inteligencia táctica certificado:\n\n🔗 Ver Reporte: ${reportUrl}\n\nGracias por confiar en la red TAD Dominicana. 🚗🎥`;
    return this.sendMessage(to, message);
  }

  /**
   * Envía Confirmación de Pago a un Chofer
   */
  async sendDriverPaymentConfirm(to: string, driverName: string, amount: number, month: string) {
    const message = `✅ *PAGO PROCESADO - TAD*\n\nHola *${driverName}*,\n\nSe ha procesado tu liquidación publicitaria de *${month}* por un monto de *RD$ ${amount.toLocaleString()}*.\n\nRecuerda mantener tu tablet encendida para maximizar tus ingresos diaria. 🚗💰\n\n_Equipo TAD Dominicana._`;
    return this.sendMessage(to, message);
  }

  /**
   * Envía Alerta de Morosidad (Regla 402)
   */
  async sendDelinquencyAlert(to: string, driverName: string, deviceId: string) {
    const message = `⚠️ *AVISO DE MOROSIDAD - TAD*\n\nHola *${driverName}*,\n\nDetectamos un retraso en el pago de suscripción para tu dispositivo *${deviceId}*.\n\nEl servicio de reproducción publicitaria ha sido suspendido temporalmente. Para reactivarlo, favor realizar el pago de *RD$ 6,000* vía transferencia.\n\n_Tu éxito es nuestro motor. Equipo TAD Dominicana._`;
    return this.sendMessage(to, message);
  }
}
