import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type PaymentStep = 'method' | 'processing' | 'success' | 'error';

export type PaymentRequestPayload = {
  accountId: string;
  amountRD: number;
  method: string;
  currency: string;
  paymentId?: number | null;
};

export type PaymentMethod = {
  id: string;
  label: string;
  description: string;
  icon: string;
  tagline: string;
  color: string;
};

export const DEFAULT_PAYMENT_REQUEST: PaymentRequestPayload = {
  accountId: '',
  amountRD: 0,
  method: '',
  currency: 'DOP',
};

export const buildInitialPaymentPayload = (): PaymentRequestPayload => {
  return {
    ...DEFAULT_PAYMENT_REQUEST,
    accountId: 'AD-ACCOUNT-DEFAULT',
    amountRD: 0,
    method: '',
    currency: 'DOP',
    paymentId: null,
  };
};

export type BillingPageProps = {
  accountId: string;
  paymentMethod: PaymentMethod;
  step: PaymentStep;
  amountRD: number;
};

export const getBillingCheckoutConfiguration = ({
  accountId,
  paymentMethod,
  step,
}: BillingPageProps) => {
  const checkoutPayload = {
    accountId,
    paymentMethod,
    step,
  };

  return {
    checkoutPayload,
    paymentRequest: {
      accountId,
      method: paymentMethod.id,
      currency: 'DOP',
      amountRD: 0,
      paymentId: null,
    },
  };
};

export const useBillingCheckoutSession = ({ accountId, paymentMethod }: BillingPageProps) => {
  return {
    checkoutPayload: {
      accountId,
      paymentMethod,
    },
    paymentRequest: {
      accountId,
      method: paymentMethod.id,
      currency: 'DOP',
      amountRD: 0,
      paymentId: null,
    },
  };
};

export const createBillingCheckoutSession = async ({
  amountRD,
  accountId,
  paymentMethod,
  paymentId,
}: PaymentRequestPayload & {
  paymentMethod: PaymentMethod;
}) => {
  const payload: PaymentRequestPayload = {
    amountRD,
    accountId,
    method: paymentMethod.id,
    currency: 'DOP',
    paymentId: paymentId ?? null,
  };

  try {
    const response = await fetch('/api/payments/nexpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Checkout session failed');
    }

    return response.json();
  } catch (error) {
    console.error('Checkout session error:', error);
    throw error;
  }
};

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown billing error';
};

export const getNextStep = (previousStep: PaymentStep): PaymentStep => {
  const steps: PaymentStep[] = ['method', 'processing', 'success', 'error'];
  const currentIndex = steps.indexOf(previousStep);
  const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
  return steps[nextIndex];
};

export const resolveAmountSummary = (amountRD: number) => {
  const subtotal = Math.max(0, amountRD);
  const tax = 0;
  const total = subtotal + tax;
  return {
    subtotal,
    tax,
    total,
    currency: 'DOP',
  };
};

export type PaymentAmount = '7090' | 'subtotal' | 'tipAmount';

export type ProcessPaymentInput = {
  amount: PaymentAmount;
};

export const toRD = (value: number): number => Number(value.toFixed(2));

const applyPaymentAmount = (input: ProcessPaymentInput & { totalAmount?: number; taxAmount?: number; tipAmount?: number }) => {
  switch (input.amount) {
    case '7090':
      return {
        subtotal: 7090,
        tax: input.taxAmount ?? 0,
        total: input.totalAmount ?? 7090,
      };
    case 'subtotal':
      return {
        subtotal: input.totalAmount ?? input.taxAmount ?? 0,
        tax: 0,
        total: input.totalAmount ?? input.taxAmount ?? 0,
      };
    case 'tipAmount':
      return {
        subtotal: input.totalAmount ?? 0,
        tax: input.taxAmount ?? 0,
        total: (input.totalAmount ?? 0) + (input.tipAmount ?? 0),
      };
    default:
      return {
        subtotal: input.totalAmount ?? 0,
        tax: input.taxAmount ?? 0,
        total: (input.totalAmount ?? 0) + (input.taxAmount ?? 0),
      };
  }
};

export const processPaymentAmount = (input: ProcessPaymentInput & { totalAmount?: number; taxAmount?: number; tipAmount?: number }) => {
  const result = applyPaymentAmount(input);
  return result;
};

export type InvoiceTotals = {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
};

export const resolveInvoiceTotals = (props: { totalAmount?: number; taxAmount?: number; currency?: string }): InvoiceTotals => {
  const currency = props.currency ?? 'DOP';
  return {
    subtotal: Number(toRD(props.totalAmount ?? 0)),
    tax: Number(toRD(props.taxAmount ?? 0)),
    total: Number(toRD((props.totalAmount ?? 0) + (props.taxAmount ?? 0))),
    currency,
  };
};

export const calculateBillingTotals = ({ amountRD }: { amountRD: number }) => {
  const ledgerValues = {
    subtotal: amountRD,
    tax: 0,
  };

  const ledger = {
    subtotal: Number(toRD(ledgerValues.subtotal)),
    tax: Number(toRD(ledgerValues.tax)),
  };

  return {
    ledger,
    total: Number(toRD(ledgerValues.subtotal)),
    currency: 'DOP',
  };
};

export const buildInvoiceForDriver = ({ driverId, amountRD }: { driverId: string; amountRD: number }) => {
  return {
    driverId,
    amountRD,
    createdAt: new Date().toISOString(),
    currency: 'DOP',
  };
};

export interface Formatters {
  currency: (value: number) => string;
}

export const createLedgerFormatters = (currency: string = 'DOP'): Formatters => {
  return {
    currency: (value: number) => `${currency} ${value.toLocaleString()}`,
  };
};

export const getNextState = (prevState: unknown): string => {
  if (!prevState || typeof prevState !== 'object') {
    return 'READY';
  }

  if (typeof prevState === 'object' && 'id' in (prevState as Record<string, unknown>) && 'name' in (prevState as Record<string, unknown>)) {
    return 'NAMED';
  }

  return 'READY';
};

export const getNextStepData = (step: PaymentStep): PaymentMethod | null => {
  const stateMap: Record<string, PaymentMethod> = {
    method: {
      id: 'card',
      label: 'Credit Card',
      description: 'Visa / Mastercard',
      icon: '💳',
      tagline: 'Fast checkout',
      color: 'bg-blue-500',
    },
  };

  return stateMap[step] ?? null;
};

export const resolveStepDescription = (step: PaymentStep): string => {
  switch (step) {
    case 'method':
      return 'Pick a payment method';
    case 'processing':
      return 'We are charging your card';
    case 'success':
      return 'Payment confirmed';
    case 'error':
      return 'Payment failed';
    default:
      return '';
  }
};
