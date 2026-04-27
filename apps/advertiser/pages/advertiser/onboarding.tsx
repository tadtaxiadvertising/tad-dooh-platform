// apps/advertiser/pages/advertiser/onboarding.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import EducationCards from '../../components/advertiser/EducationCards';
import AccountStep from '../../components/advertiser/AccountStep';
import CampaignStep from '../../components/advertiser/CampaignStep';
import UploadStep from '../../components/advertiser/UploadStep';
import { toast, Toaster } from 'react-hot-toast';

export default function AdvertiserOnboarding() {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    expectedScreens: 1,
    budget: 1500,
    file: null as File | null
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      // 1. En un flujo real aquí subiríamos el video a Supabase Storage
      // Pero por ahora simulamos el éxito y enviamos metadata
      const fileMetadata = formData.file ? {
        name: formData.file.name,
        size: formData.file.size,
        type: formData.file.type
      } : null;

      const response = await fetch('/api/proxy/onboarding/advertiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fileMetadata,
          file: undefined // No enviamos el binario por JSON
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en el registro');
      }

      setStep(4); // Success Step
      toast.success('¡Registro completado con éxito!');
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-[#fad400] selection:text-slate-900 overflow-x-hidden">
      <Head>
        <title>Onboarding | TAD Anunciantes</title>
      </Head>
      
      <Toaster position="top-right" />

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#fad400]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-12 md:py-20 flex flex-col items-center min-h-screen">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-full mb-6 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#fad400]" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Plataforma DOOH v12</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">
            POTENCIA TU <span className="text-[#fad400]">MARCA</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
            Únete a la red publicitaria más dinámica de la República Dominicana en pocos pasos.
          </p>
        </motion.div>

        {/* Wizard Progress */}
        {step > 0 && step < 4 && (
          <div className="w-full max-w-md mb-12 flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-900 -z-10" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#fad400] transition-all duration-500 -z-10" 
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 border-2 ${
                  step >= i ? 'bg-[#fad400] text-slate-950 border-[#fad400]' : 'bg-slate-950 text-slate-600 border-slate-800'
                }`}
              >
                {i}
              </div>
            ))}
          </div>
        )}

        <div className="w-full flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <EducationCards key="edu" onNext={nextStep} />
            )}
            {step === 1 && (
              <AccountStep 
                key="acc" 
                formData={formData} 
                setFormData={setFormData} 
                onNext={nextStep} 
                onPrev={prevStep} 
              />
            )}
            {step === 2 && (
              <CampaignStep 
                key="camp" 
                formData={formData} 
                setFormData={setFormData} 
                onNext={nextStep} 
                onPrev={prevStep} 
              />
            )}
            {step === 3 && (
              <UploadStep 
                key="upload" 
                formData={formData} 
                setFormData={setFormData} 
                onSubmit={handleFinalSubmit} 
                onPrev={prevStep}
                isLoading={isLoading}
              />
            )}
            {step === 4 && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-3xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl text-center space-y-8"
              >
                <div className="bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-white">¡ESTÁS DENTRO!</h2>
                  <p className="text-slate-400">Tu intención de campaña ha sido registrada correctamente.</p>
                </div>
                
                <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 text-left">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Resumen de Registro</span>
                    <span className="bg-[#fad400]/10 text-[#fad400] text-[10px] px-2 py-1 rounded-full font-bold">PENDIENTE DE PAGO</span>
                  </div>
                  <p className="text-white font-bold text-xl">{formData.companyName}</p>
                  <p className="text-slate-400 text-sm">{formData.expectedScreens} Pantallas Activas</p>
                  <div className="mt-6 pt-6 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Total a Invertir:</span>
                    <span className="text-2xl font-black text-white">RD$ {formData.budget.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-slate-500 text-xs italic">
                  * Un consultor TAD te contactará vía WhatsApp para finalizar los detalles del pago y activación.
                </p>

                <button
                  onClick={() => window.location.href = '/advertiser/login'}
                  className="w-full bg-white text-slate-950 font-black py-5 rounded-2xl hover:bg-slate-100 transition-all shadow-xl"
                >
                  ACCEDER AL PORTAL
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
