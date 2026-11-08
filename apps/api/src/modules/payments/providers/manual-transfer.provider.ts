/**
 * Manual Transfer Payment Provider
 *
 * Implementación inicial para transferencias bancarias con revisión humana.
 * Según Plan Maestro TAD v1: "Etapa inicial: transferencia y revisión humana"
 *
 * Flujo:
 * 1. createPaymentIntent → genera instrucciones de pago + reference
 * 2. Usuario transfiere y envía comprobante (PaymentEvidence)
 * 3. Humano revisa → PaymentVerification → PAYMENT_CONFIRMED
 * 4. Sistema crea comisión y activa flujo correspondiente
 */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IPaymentProvider,
  PaymentProviderConfig,
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentWebhookPayload,
  PaymentVerificationResult,
  RefundResult,
  PaymentProviderType,
} from "../interfaces/payment-provider.interface";

@Injectable()
export class ManualTransferProvider implements IPaymentProvider {
  private readonly logger = new Logger(ManualTransferProvider.name);

  readonly providerType: PaymentProviderType = "MANUAL_TRANSFER";
  readonly config: PaymentProviderConfig = {
    provider: "MANUAL_TRANSFER",
  };

  // Configuración bancaria de TAD (inyectable via ConfigService)
  private readonly bankConfig = {
    bankName: "Banco Popular Dominicano",
    accountName: "TAD Taxi Advertising SRL",
    accountNumber: "XXXXXXXXXX", // Configurar via env
    accountType: "Corriente",
    currency: "DOP",
    swiftCode: "BPDODOSD", // Si aplica
  };

  constructor(private readonly configService: ConfigService) {}

  async initialize(_config: PaymentProviderConfig): Promise<void> {
    this.logger.log(`Initializing ${this.providerType} provider`);
    // Cargar config bancaria desde env
    this.bankConfig.accountNumber =
      this.configService.get("TAD_BANK_ACCOUNT") ||
      this.bankConfig.accountNumber;
    this.bankConfig.accountName =
      this.configService.get("TAD_BANK_ACCOUNT_NAME") ||
      this.bankConfig.accountName;
  }

  /**
   * Crea intención de pago - genera instrucciones para transferencia manual
   * Idempotente por idempotencyKey (se usa como reference)
   */
  async createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<PaymentIntentResult> {
    this.logger.log(
      `Creating manual payment intent: ${input.reference} for ${input.amount} ${input.currency}`,
    );

    const instructions = this.generatePaymentInstructions(input);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    return {
      id: input.reference, // Usamos reference como ID interno
      status: "CREATED",
      paymentInstructions: instructions,
      expiresAt,
      providerData: {
        bankConfig: this.bankConfig,
        amount: input.amount,
        currency: input.currency,
        type: input.type,
        leadId: input.leadId,
      },
    };
  }

  /**
   * Genera instrucciones de pago formateadas para el usuario
   */
  private generatePaymentInstructions(input: CreatePaymentIntentInput): string {
    const amountFormatted = this.formatCurrency(input.amount, input.currency);

    return `
PAGO DE ${input.type === "DRIVER_SUBSCRIPTION" ? "SUSCRIPCIÓN ANUAL CONDUCTOR" : "CAMPAÑA PUBLICITARIA"} - TAD

MONTO: ${amountFormatted}
REFERENCIA: ${input.reference} (OBLIGATORIO incluir en la transferencia)

DATOS BANCARIOS:
Banco: ${this.bankConfig.bankName}
Titular: ${this.bankConfig.accountName}
Cuenta: ${this.bankConfig.accountNumber}
Tipo: ${this.bankConfig.accountType}
Moneda: ${this.bankConfig.currency}

INSTRUCCIONES:
1. Realiza la transferencia desde tu banca online o app móvil
2. EN EL CONCEPTO/REFERENCIA COLOCA EXACTAMENTE: ${input.reference}
3. Guarda el comprobante (captura de pantalla o PDF)
4. Envía el comprobante por WhatsApp al número de TAD o súbelo en el portal
5. Un operador verificará el pago en 24-48 horas hábiles

IMPORTANTE:
- Sin la referencia exacta no podremos identificar tu pago
- El comprobante es evidencia pendiente de revisión (no prueba financiera definitiva)
- Tu ${input.type === "DRIVER_SUBSCRIPTION" ? "incorporación como conductor" : "activación de campaña"} iniciará tras confirmación humana

¿Dudas? Contacta a soporte TAD por WhatsApp.
    `.trim();
  }

  private formatCurrency(amount: number, currency: string): string {
    if (currency === "DOP") {
      return `RD$${(amount / 100).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
    }
    return `${amount / 100} ${currency}`;
  }

  /**
   * Obtiene estado - para transferencia manual depende de revisión humana
   */
  async getPaymentIntentStatus(
    reference: string,
  ): Promise<PaymentIntentResult> {
    // En implementación real, consultaría BD por PaymentIntent
    // Por ahora retorna estado basado en si hay verificación humana
    this.logger.log(`Getting status for manual payment: ${reference}`);

    return {
      id: reference,
      status: "PENDING", // CREATED, PENDING, PAID, FAILED, EXPIRED
      providerData: {
        bankConfig: this.bankConfig,
      },
    };
  }

  /**
   * Verificación manual - llamada tras revisión humana exitosa
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    this.logger.log(`Manual verification triggered for: ${reference}`);

    // En implementación real, esto se llama desde PaymentVerificationService
    // tras confirmación humana exitosa
    return {
      verified: true,
      amountConfirmed: 0, // Se llena desde BD
      currency: "DOP",
      paidAt: new Date(),
      providerRef: reference,
      rawResponse: { verifiedBy: "human_operator", method: "manual_review" },
    };
  }

  /**
   * Procesa webhook - no aplica para transferencia manual
   * Pero puede recibir notificaciones de banca online si se integra
   */
  async processWebhook(
    payload: import("../interfaces/payment-provider.interface").PaymentNotificationPayload,
    _signature?: string,
  ): Promise<PaymentWebhookPayload> {
    this.logger.warn(
      `Webhook received for manual transfer (unexpected):`,
      payload,
    );

    return {
      provider: "MANUAL_TRANSFER",
      eventType: "MANUAL_NOTIFICATION",
      transactionId: payload.transactionId || `manual-${Date.now()}`,
      reference: payload.reference || "",
      idempotencyKey: payload.idempotencyKey || "",
      amount: payload.amount || 0,
      currency: payload.currency || "DOP",
      status: "PAID",
      paidAt: new Date(),
      rawData: payload,
    };
  }

  /**
   * Reembolso manual - requiere intervención humana
   */
  async refundPayment(
    reference: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult> {
    this.logger.log(
      `Manual refund requested for: ${reference}, amount: ${amount}, reason: ${reason}`,
    );

    return {
      success: true,
      refundId: `manual-refund-${Date.now()}`,
      amount: amount || 0,
      status: "PENDING", // Requiere procesamiento humano/bancario
    };
  }

  /**
   * Conciliación diaria - para transferencia manual revisa PaymentIntent pendientes
   */
  async reconcileDaily(date: Date): Promise<PaymentWebhookPayload[]> {
    this.logger.log(
      `Daily reconciliation for manual transfers: ${date.toISOString().split("T")[0]}`,
    );

    // En implementación real, consultaría PaymentIntent con status CREATED/PENDING
    // y verificaría cuáles tienen PaymentVerification confirmada
    return [];
  }

  /**
   * Health check - siempre healthy para transferencia manual
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    return { healthy: true, latencyMs: 0 };
  }
}
