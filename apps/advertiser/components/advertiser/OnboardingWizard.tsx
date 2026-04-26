// frontend/src/components/advertiser/OnboardingWizard.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImpactCalculator from './ImpactCalculator';

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    brandName: '',
    budget: 500,
    expectedScreens: 1,
    file: null as File | null
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const validateFile = (file: File): string | null => {
    if (file.type !== 'video/mp4') {
      return 'El archivo debe ser un video MP4 (H.264).';
    }
    if (file.size > 55 * 1024 * 1024) {
      return 'El tamaño del archivo no puede exceder los 55MB.';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        e.target.value = '';
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async () => {
    if (!formData.brandName || !formData.file) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Nota: En un flujo real, subiríamos el archivo primero (ej. Supabase Storage)
      // y enviaríamos la metadata. Aquí simulamos la metadata.
      const fileMetadata = {
        name: formData.file.name,
        size: formData.file.size,
        type: formData.file.type
      };

      const response = await fetch('/api/proxy/campaigns/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: formData.brandName,
          budget: formData.budget,
          expectedScreens: formData.expectedScreens,
          fileMetadata
        })
      });

      if (!response.ok) {
        throw new Error('Error al registrar la campaña.');
      }

      alert('¡Campaña registrada con éxito! Redirigiendo a pago...');
      // Aquí se redirigiría si hubiera pasarela de pago, pero no se implementa
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10 rounded-full" />
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#fad400] -z-10 rounded-full transition-all duration-300`} style={{ width: `${((step - 1) / 2) * 100}%` }} />
        {[1, 2, 3].map(i => (
          <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step >= i ? 'bg-[#fad400] text-slate-900 border-[#fad400]' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
            {i}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Paso 1: Tu Marca</h2>
              <label className="block text-slate-300 mb-2">Nombre de la Marca</label>
              <input 
                type="text" 
                value={formData.brandName}
                onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-[#fad400] transition-colors"
                placeholder="Ej. Mi Empresa S.R.L."
              />
            </div>
            <button onClick={handleNext} disabled={!formData.brandName} className="w-full bg-[#fad400] text-slate-900 font-bold p-4 rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors">
              Continuar
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Paso 2: Alcance y Presupuesto</h2>
            <ImpactCalculator onUpdate={(data) => setFormData({ ...formData, expectedScreens: data.screens, budget: data.budget })} />
            <div className="flex gap-4">
              <button onClick={handlePrev} className="w-1/3 bg-slate-800 text-white font-bold p-4 rounded-xl hover:bg-slate-700 transition-colors">Atrás</button>
              <button onClick={handleNext} className="w-2/3 bg-[#fad400] text-slate-900 font-bold p-4 rounded-xl hover:bg-yellow-400 transition-colors">Continuar</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Paso 3: Sube tu Contenido</h2>
              <p className="text-slate-400 mb-4 text-sm">Resolución recomendada: 1280x720. Máximo 55MB. Solo MP4.</p>
              
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-[#fad400] transition-colors cursor-pointer relative">
                <input type="file" accept="video/mp4" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="text-slate-300">
                  {formData.file ? (
                    <span className="text-[#fad400] font-medium">{formData.file.name}</span>
                  ) : (
                    <span>Haz clic o arrastra tu video aquí</span>
                  )}
                </div>
              </div>
              
              {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </div>
            
            <div className="flex gap-4">
              <button onClick={handlePrev} disabled={loading} className="w-1/3 bg-slate-800 text-white font-bold p-4 rounded-xl hover:bg-slate-700 transition-colors">Atrás</button>
              <button onClick={handleSubmit} disabled={!formData.file || loading} className="w-2/3 bg-[#fad400] text-slate-900 font-bold p-4 rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors flex justify-center items-center">
                {loading ? 'Procesando...' : 'Finalizar y Guardar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
