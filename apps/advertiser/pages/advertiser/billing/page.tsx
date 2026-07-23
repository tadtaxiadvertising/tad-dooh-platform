'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import PaymentMethodSelector from './components/payment-method-select';
import CardPaymentForm from './components/card-payment-form';
import BankTransferDetails from './components/bank-transfer-details';
import PaymentConfirmation from './components/payment-confirmation';
import { PAYMENT_METHODS, PaymentMethod } from '@/lib/payment-types';
import { initiatePayment, confirmPayment } from '@/lib/payment-api';
import type { PaymentRequestPayload } from '@/lib/payment-types';

type WizardStep = 'method' | 'details' | 'processing' | 'confirmation';

export default function BillingPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [lastPayment, setLastPayment] = useState<{ id: string; reference?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use the advertiser's NexPay account ID - in real app comes from auth/session
  const ACCOUNT_ID = 'ad_acc_001_nexpay';

  const handleMethodSelect = useCallback((methodId: PaymentMethod) => {
    setSelectedMethod(methodId);
    setError(null);
    setStep('details');
  }, []);

  const handlePaymentSubmit = useCallback(
    async (payload: PaymentRequestPayload) => {
      setError(null);
      try {
        const result = await initiatePayment(payload);
        // Simulate confirmation after "processing"
        setStep('processing');
        // In production: poll status or wait for NexPay webhook
        // For now, simulate auto-confirm after 3s
        setTimeout(async () => {
          await confirmPayment(result.id);
          setLastPayment({ id: result.id, reference: result.reference || `REF-${result.id.slice(0, 8)}` });
          setStep('confirmation');
        }, 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error initiating payment');
        setStep('details'); // allow retry
      }
    },
    []
  );

  const handleBackToMethod = useCallback(() => {
    setStep('method');
    setSelectedMethod(null);
    setError(null);
  }, []);

  const handleDone = useCallback(() => {
    router.push('/advertiser?tab=analytics');
  }, [router]);

  const selectedMethodConfig = selectedMethod
    ? PAYMENT_METHODS.find((m) => m.id === selectedMethod)
    : null;

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tad-yellow">
                  Billing Hub
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">
                Gestión de<span className="text-tad-yellow block">Pagos</span>
              </h1>
              <p className="text-zinc-500 text-sm mt-3 max-w-xl">
                Centraliza toda la facturación de tus campañas TAD. Procesa pagos en segundos con
                seguridad NexPay.
              </p>
            </div>
            <button
              onClick={() => router.push('/advertiser')}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl
                         text-[10px] font-black uppercase tracking-widest text-zinc-400
                         hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Volver al Portal
            </button>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {(['method', 'details', 'processing', 'confirmation'] as WizardStep[]).map((s, i) => {
            const labels = ['Método', 'Detalles', 'Procesando', 'Confirmación'];
            const active = step === s || (step === 'processing' && s === 'processing') || (step === 'confirmation' && s === 'confirmation');
            const done = (step === 'processing' || step === 'confirmation') && i <= 1;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-500',
                    active || done ? 'bg-tad-yellow w-12' : 'bg-zinc-800 w-6'
                  )}
                />
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-widest hidden sm:block',
                  active ? 'text-tad-yellow' : 'text-zinc-600'
                )}>
                  {labels[i]}
                </span>
                {i < 3 && <div className="w-2" />}
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-rose-400">Error en la transacción</p>
              <p className="text-xs text-zinc-400 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-zinc-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step: Method Selection */}
        {step === 'method' && (
          <PaymentMethodSelector
            selected={selectedMethod}
            onSelect={handleMethodSelect}
            totalRD={7080}
            subtotalRD={6000}
          />
        )}

        {/* Step: Payment Details */}
        {step === 'details' && selectedMethodConfig && (
          <div>
            <button
              onClick={handleBackToMethod}
              className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-8 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Cambiar método de pago
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Main form */}
              <div className="lg:col-span-3">
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-10">
                  {selectedMethod === 'card' && (
                    <CardPaymentForm
                      onSubmit={handlePaymentSubmit}
                      accountId={ACCOUNT_ID}
                      totalRD={7080}
                    />
                  )}
                  {selectedMethod === 'bank_transfer' && (
                    <BankTransferDetails
                      accountId={ACCOUNT_ID}
                      totalRD={7080}
                      onBack={handleBackToMethod}
                    />
                  )}
                  {selectedMethod === 'apple_pay' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-black uppercase italic">Apple Pay</h2>
                      <p className="text-zinc-400 text-sm">
                        Serás redirigido a Apple Pay para completar tu compra de forma segura.
                      </p>
                      <button
                        onClick={() => handlePaymentSubmit({
                          accountId: ACCOUNT_ID,
                          amountRD: 7080,
                          method: 'apple_pay',
                          currency: 'DOP',
                          items: [{ id: 'sub_annual', name: 'Suscripción Anual TAD', amountRD: 6000 }],
                        })}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm
                                   hover:scale-[1.02] transition-all"
                      >
                        Pagar con Apple Pay — RD$7,080
                      </button>
                    </div>
                  )}
                  {selectedMethod === 'google_pay' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-black uppercase italic">Google Pay</h2>
                      <p className="text-zinc-400 text-sm">
                        Paga directamente desde tu billetera Google.
                      </p>
                      <button
                        onClick={() => handlePaymentSubmit({
                          accountId: ACCOUNT_ID,
                          amountRD: 7080,
                          method: 'google_pay',
                          currency: 'DOP',
                          items: [{ id: 'sub_annual', name: 'Suscripción Anual TAD', amountRD: 6000 }],
                        })}
                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm
                                   hover:scale-[1.02] transition-all"
                      >
                        Pagar con Google Pay — RD$7,080
                      </button>
                    </div>
                  )}
                  {selectedMethod === 'paypal' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-black uppercase italic">PayPal</h2>
                      <p className="text-zinc-400 text-sm">
                        Compras seguras protegidas por PayPal. Se procesará en USD y convertirá a RD$.
                      </p>
                      <button
                        onClick={() => handlePaymentSubmit({
                          accountId: ACCOUNT_ID,
                          amountRD: 7080,
                          method: 'paypal',
                          currency: 'USD',
                          items: [{ id: 'sub_annual_usd', name: 'Suscripción Anual TAD (USD)', amountRD: 7080 }],
                        })}
                        className="w-full py-4 bg-[#0070ba] text-white rounded-2xl font-black text-sm
                                   hover:scale-[1.02] transition-all"
                      >
                        Pagar con PayPal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Order summary sidebar */}
              <div className="lg:col-span-2">
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 sticky top-8">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">
                    Resumen del pedido
                  </h3>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Suscripción Anual TAD</span>
                      <span className="font-bold text-white">RD$ 6,000.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">ITBIS (18%)</span>
                      <span className="font-bold text-zinc-300">RD$ 1,080.00</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between">
                      <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Total</span>
                      <span className="text-xl font-black text-tad-yellow">RD$ 7,080.00</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-tad-yellow/10 border border-tad-yellow/20">
                    <p className="text-[10px] font-black text-tad-yellow uppercase tracking-widest">
                      Garantía TAD 2026
                    </p>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      48h de reproducción offline garantizadas. Kill-switch desactivado tras confirmación exitosa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-20 h-20 rounded-full border-2 border-tad-yellow animate-spin mb-8" />
            <h2 className="text-3xl font-black uppercase italic mb-3">Procesando pago</h2>
            <p className="text-zinc-500">Espera un momento, estamos confirmando tu transacción...</p>
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirmation' && lastPayment && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleDone}
              className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al Dashboard
            </button>
            <PaymentConfirmation
              paymentId={lastPayment.id}
              reference={lastPayment.reference}
              amountRD={7080}
              onDone={handleDone}
            />
          </div>
        )}
      </div>
    </div>
  );
}
