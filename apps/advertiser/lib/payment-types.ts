export type PaymentMethod =
  | "card"
  | "bank_transfer"
  | "apple_pay"
  | "google_pay"
  | "paypal";

export interface PaymentRequestPayload {
  accountId: string;
  amountRD: number;
  method: PaymentMethod;
  currency?: string;
  items: Array<{
    id: string;
    name: string;
    amountRD: number;
  }>;
}

export interface PaymentMethodConfig {
  id: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "card",
    label: "Tarjeta de crédito/débito",
    icon: "💳",
    description: "Visa, Mastercard, American Express",
  },
  {
    id: "bank_transfer",
    label: "Transferencia bancaria",
    icon: "🏦",
    description: "Transferencia desde tu banco",
  },
  {
    id: "apple_pay",
    label: "Apple Pay",
    icon: "",
    description: "Paga con tu dispositivo Apple",
  },
  {
    id: "google_pay",
    label: "Google Pay",
    icon: "",
    description: "Paga con tu cuenta Google",
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: "",
    description: "Pago protegido por PayPal",
  },
];

export const TAD_ACCOUNT_ID = "ad_acc_001_nexpay";
