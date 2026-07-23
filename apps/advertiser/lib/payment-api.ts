const NEXPAY_BASE_URL = process.env.NEXT_PUBLIC_NEXPAY_BASE_URL || '/api/payments/nexpay';

export interface PaymentRequestPayload {
  accountId: string;
  amountRD: number;
  method: string;
  currency?: string;
  items: Array<{
    id: string;
    name: string;
    amountRD: number;
  }>;
}

export interface NexPayInitResponse {
  id: string;
  status: 'pending' | 'paid' | 'failed';
  reference?: string;
  redirectUrl?: string;
}

export async function initiatePayment(payload: PaymentRequestPayload): Promise<NexPayInitResponse> {
  const res = await fetch(NEXPAY_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Payment init failed (${res.status})`);
  }

  return res.json();
}

export async function confirmPayment(paymentId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${NEXPAY_BASE_URL}/${encodeURIComponent(paymentId)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Payment confirm failed (${res.status})`);
  }

  return res.json();
}
