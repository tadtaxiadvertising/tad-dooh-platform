/**
 * Payment Provider Abstraction Interface
 *
 * Permite intercambiar proveedores de pago (AZUL, Stripe, transferencia manual, etc.)
 * sin reescribir la lógica de campañas, referidos y finanzas.
 *
 * Basado en Plan Maestro TAD v1 - Fase 7: "Interfaz de proveedor intercambiable"
 */

export type PaymentProviderType =
  | "AZUL"
  | "STRIPE"
  | "MANUAL_TRANSFER"
  | "OTHER";

export interface PaymentProviderConfig {
  provider: PaymentProviderType;
  apiUrl?: string;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantId?: string;
  [key: string]: any;
}

export interface CreatePaymentIntentInput {
  type: "DRIVER_SUBSCRIPTION" | "ADVERTISER_CAMPAIGN";
  amount: number; // en centavos/unidad mínima (ej: 600000 = RD$6,000.00)
  currency: string; // 'DOP'
  reference: string; // Clave de idempotencia única
  idempotencyKey: string;
  leadId?: string;
  metadata?: Record<string, any>;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
}

export interface PaymentIntentResult {
  id: string; // ID interno del proveedor
  status: PaymentIntentStatus;
  redirectUrl?: string; // URL para redirigir al usuario (tarjeta)
  qrCode?: string; // QR para pago móvil
  paymentInstructions?: string; // Instrucciones para transferencia manual
  expiresAt?: Date;
  providerData?: Record<string, any>;
}

export type PaymentIntentStatus =
  | "CREATED"
  | "REDIRECTED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "CANCELLED";

export interface PaymentWebhookPayload {
  provider: PaymentProviderType;
  eventType: string;
  transactionId: string;
  reference: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  paidAt?: Date;
  rawData: Record<string, any>;
  signature?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  amountConfirmed: number;
  currency: string;
  paidAt: Date;
  providerRef: string;
  rawResponse: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

/**
 * Interfaz base que todos los proveedores deben implementar
 */
export interface IPaymentProvider {
  readonly providerType: PaymentProviderType;
  readonly config: PaymentProviderConfig;

  /**
   * Inicializa el proveedor con configuración
   */
  initialize(config: PaymentProviderConfig): Promise<void>;

  /**
   * Crea una intención de pago
   * Debe ser idempotente usando idempotencyKey
   */
  createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<PaymentIntentResult>;

  /**
   * Obtiene el estado de una intención de pago
   */
  getPaymentIntentStatus(reference: string): Promise<PaymentIntentResult>;

  /**
   * Verifica un pago usando webhook o consulta directa
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;

  /**
   * Procesa un webhook del proveedor
   * Debe validar firma y retornar payload parseado
   */
  processWebhook(
    payload: any,
    signature?: string,
  ): Promise<PaymentWebhookPayload>;

  /**
   * Inicia un reembolso
   */
  refundPayment(
    reference: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult>;

  /**
   * Realiza conciliación diaria
   * Retorna transacciones del día para comparar con BD
   */
  reconcileDaily(date: Date): Promise<PaymentWebhookPayload[]>;

  /**
   * Verifica si el proveedor está disponible/healthy
   */
  healthCheck(): Promise<{
    healthy: boolean;
    latencyMs?: number;
    error?: string;
  }>;
}

/**
 * Factory para obtener proveedor configurado
 */
export type PaymentProviderFactory = (
  providerType: PaymentProviderType,
) => IPaymentProvider;
