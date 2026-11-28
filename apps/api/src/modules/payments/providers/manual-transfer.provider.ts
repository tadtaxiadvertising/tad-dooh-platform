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
import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
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
  PaymentNotificationPayload,
} from "../interfaces/payment-provider.interface";

@Injectable()
export class ManualTransferProvider implements IPaymentProvider {
  private readonly logger = new Logger(ManualTransferProvider.name);

  readonly providerType: PaymentProviderType = "MANUAL_TRANSFER";
  readonly config: PaymentProviderConfig = {
    provider: "MANUAL_TRANSFER",
  };

  constructor(private readonly configService: ConfigService) {}

  async initialize(_config: PaymentProviderConfig): Promise<void> {
    this.logger.log("Manual transfer adapter initialized");
  }

  // Resolve configuration at use time: the factory does not call initialize.
  // Never generate instructions with placeholder account details.
  private getBankConfig() {
    const accountNumber = this.configService
      .get<string>("TAD_BANK_ACCOUNT")
      ?.trim();
    const accountName =
      this.configService.get<string>("TAD_BANK_ACCOUNT_NAME")?.trim() ||
      "TAD Taxi Advertising SRL";

    if (
      !accountNumber ||
      !/^\d+$/.test(accountNumber) ||
      /^0+$/.test(accountNumber)
    ) {
      throw new ServiceUnavailableException(
        "Manual transfer account configuration is unavailable",
      );
    }

    return {
      bankName: "Banco Popular Dominicano",
      accountName,
      accountNumber,
      accountType: "Corriente",
      currency: "DOP",
      swiftCode: "BPDODOSD",
    };
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

    if (input.currency !== "DOP") {
      throw new ConflictException("Manual transfer supports DOP only");
    }
    const bankConfig = this.getBankConfig();
    const instructions = this.generatePaymentInstructions(input, bankConfig);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    return {
      id: input.reference, // Usamos reference como ID interno
      status: "CREATED",
      paymentInstructions: instructions,
      expiresAt,
      providerData: {
        bankConfig,
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
  private generatePaymentInstructions(
    input: CreatePaymentIntentInput,
    bankConfig: ReturnType<ManualTransferProvider["getBankConfig"]>,
  ): string {
    const amountFormatted = this.formatCurrency(input.amount, input.currency);

    return `
PAGO DE ${input.type === "DRIVER_SUBSCRIPTION" ? "SUSCRIPCIÓN ANUAL CONDUCTOR" : "CAMPAÑA PUBLICITARIA"} - TAD

MONTO: ${amountFormatted}
REFERENCIA: ${input.reference} (OBLIGATORIO incluir en la transferencia)

DATOS BANCARIOS:
Banco: ${bankConfig.bankName}
Titular: ${bankConfig.accountName}
Cuenta: ${bankConfig.accountNumber}
Tipo: ${bankConfig.accountType}
Moneda: ${bankConfig.currency}

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

  // This adapter has no bank connection or authoritative payment ledger.
  // Callers must use the canonical persisted evidence review workflow.
  async getPaymentIntentStatus(
    _reference: string,
  ): Promise<PaymentIntentResult> {
    throw new ConflictException("Use the persisted payment intent status");
  }

  async verifyPayment(_reference: string): Promise<PaymentVerificationResult> {
    throw new ConflictException("Manual payment verification requires review");
  }

  async processWebhook(
    _payload: PaymentNotificationPayload,
    _signature?: string,
  ): Promise<PaymentWebhookPayload> {
    throw new ConflictException("Manual transfer webhooks are not supported");
  }

  async refundPayment(
    _reference: string,
    _amount?: number,
    _reason?: string,
  ): Promise<RefundResult> {
    throw new ConflictException("Manual refund requires reconciliation");
  }

  async reconcileDaily(_date: Date): Promise<PaymentWebhookPayload[]> {
    throw new ConflictException("Bank reconciliation is not configured");
  }

  // Local configuration readiness only; not a bank connectivity check.
  async healthCheck(): Promise<{
    healthy: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    try {
      this.getBankConfig();
      return { healthy: true, latencyMs: 0 };
    } catch {
      return {
        healthy: false,
        error: "Manual transfer account configuration is unavailable",
      };
    }
  }
}
