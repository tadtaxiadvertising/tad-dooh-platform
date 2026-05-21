import React, { useState, useEffect } from 'react';
import { enqueueOfflineAction, syncOfflineQueue } from '../lib/offlineQueue';

interface BankFormData {
  banco: string;
  cuenta: string;
  tipo: 'SAVINGS' | 'CHECKING';
  ownerName: string;
  cedula: string;
}

interface BankFormProps {
  driverId: string;
  onSuccess: () => void;
}

export const BankForm: React.FC<BankFormProps> = ({ driverId, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BankFormData>({
    banco: '',
    cuenta: '',
    tipo: 'SAVINGS',
    ownerName: '',
    cedula: '',
  });
  const [isOffline, setIsOffline] = useState(false);
  const draftKey = `tad_driver_bank_draft_${driverId}`;
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOffline(!navigator.onLine);

    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('No se pudo restaurar el borrador bancario', error);
    }

    const handleOnline = () => {
      setIsOffline(false);
      void syncOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [driverId]);

  const handleChange = (field: keyof BankFormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value } as BankFormData;
      if (typeof window !== 'undefined') {
        localStorage.setItem(draftKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const submitData = async (data: BankFormData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.rewvid.easypanel.host/api/v1'}/wallet/bank`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          banco: data.banco,
          cuenta: data.cuenta,
          tipo: data.tipo,
          cedula: data.cedula,
          ownerName: data.ownerName,
        }),
      });
      
      if (response.ok) {
        localStorage.removeItem(draftKey);
        onSuccess();
        return;
      }

      const payload = await response.json().catch(() => null);

      if (!navigator.onLine || response.status >= 500) {
        await enqueueOfflineAction('/wallet/bank', {
          driverId,
          banco: data.banco,
          cuenta: data.cuenta,
          tipo: data.tipo,
          cedula: data.cedula,
          ownerName: data.ownerName,
        }, 'PUT');
        return;
      }

      throw new Error(payload?.message || 'No se pudo guardar la información bancaria.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkFailure = !navigator.onLine || /failed to fetch|network|load failed/i.test(errorMessage.toLowerCase());

      if (isNetworkFailure) {
        console.error('Error saving bank data offline:', error);
        await enqueueOfflineAction('/wallet/bank', {
          driverId,
          banco: data.banco,
          cuenta: data.cuenta,
          tipo: data.tipo,
          cedula: data.cedula,
          ownerName: data.ownerName,
        }, 'PUT');
        return;
      }

      console.error('Error saving bank data:', error);
      throw error;
    }
  };

  const handleNext = async () => {
    if (step === 2 && !/^\d{10,20}$/.test(formData.cuenta)) {
      alert('Número de cuenta inválido (10-20 dígitos numéricos)');
      return;
    }
    if (step === 5 && !/^\d{11}$/.test(formData.cedula)) {
      alert('Cédula inválida (11 dígitos, sin guiones)');
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      if (isOffline || !navigator.onLine) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
        void enqueueOfflineAction('/wallet/bank', {
          driverId,
          banco: formData.banco,
          cuenta: formData.cuenta,
          tipo: formData.tipo,
          cedula: formData.cedula,
          ownerName: formData.ownerName,
        }, 'PUT');
        alert('Sin conexión. Datos guardados localmente, se sincronizarán al recuperar la red.');
        onSuccess();
      } else {
        try {
          await submitData(formData);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo guardar la información bancaria.';
          alert(message);
        }
      }
    }
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-white w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Datos Bancarios</h3>
        <span className="text-zinc-500 text-sm">Paso {step} de 5</span>
      </div>

      <div className="mb-8">
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Banco</label>
            <select 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              value={formData.banco}
              onChange={(e) => handleChange('banco', e.target.value)}
            >
              <option value="">Selecciona un banco</option>
              <option value="BPD">Banco Popular Dominicano</option>
              <option value="BHD">Banco BHD</option>
              <option value="BR">Banreservas</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Número de Cuenta</label>
            <input 
              type="text" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              placeholder="Ej: 0123456789"
              value={formData.cuenta}
              onChange={(e) => handleChange('cuenta', e.target.value.replace(/\D/g, ''))}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Tipo de Cuenta</label>
            <select 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
            >
              <option value="SAVINGS">Ahorros</option>
              <option value="CHECKING">Corriente</option>
            </select>
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Nombre del Titular</label>
            <input 
              type="text" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              placeholder="Nombre como aparece en la cuenta"
              value={formData.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
            />
          </div>
        )}

        {step === 5 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Cédula del Titular</label>
            <input 
              type="text" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              placeholder="Cédula (11 dígitos)"
              value={formData.cedula}
              onChange={(e) => handleChange('cedula', e.target.value.replace(/\D/g, ''))}
              maxLength={11}
            />
          </div>
        )}
      </div>

      <div className="flex justify-between">
        {step > 1 ? (
          <button 
            onClick={() => setStep(step - 1)}
            className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
          >
            Atrás
          </button>
        ) : <div />}
        
        <button 
          onClick={handleNext}
          disabled={
            (step === 1 && !formData.banco) ||
            (step === 2 && formData.cuenta.length < 10) ||
            (step === 4 && formData.ownerName.trim() === '') ||
            (step === 5 && formData.cedula.length !== 11)
          }
          className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {step === 5 ? 'Guardar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
};
