import React, { useEffect, useState } from 'react';
import api from '@tad/services';
import { enqueueOfflineAction, syncOfflineQueue } from '../lib/offlineQueue';

type BankAccountType = 'AHORRO' | 'CORRIENTE';

interface BankFormData {
  banco: string;
  cuenta: string;
  tipo: BankAccountType;
  ownerName: string;
  cedula: string;
}

interface BankFormProps {
  driverId: string;
  onSuccess: () => void;
}

const normalizeAccountType = (value: unknown): BankAccountType => {
  if (value === 'CHECKING' || value === 'CORRIENTE') {
    return 'CORRIENTE';
  }

  return 'AHORRO';
};

const buildBankPayload = (data: BankFormData) => {
  return {
    banco: data.banco,
    cuenta: data.cuenta,
    tipo: normalizeAccountType(data.tipo),
    cedula: data.cedula,
    ownerName: data.ownerName.trim(),
  };
};

export const getDriverBankPendingKey = (driverId: string) => `tad_driver_bank_pending_${driverId}`;

export const BankForm: React.FC<BankFormProps> = ({ driverId, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BankFormData>({
    banco: '',
    cuenta: '',
    tipo: 'AHORRO',
    ownerName: '',
    cedula: '',
  });
  const [isOffline, setIsOffline] = useState(false);
  const draftKey = `tad_driver_bank_draft_${driverId}`;
  const pendingKey = getDriverBankPendingKey(driverId);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOffline(!navigator.onLine);

    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData({
          banco: typeof parsed?.banco === 'string' ? parsed.banco : '',
          cuenta: typeof parsed?.cuenta === 'string' ? parsed.cuenta : '',
          tipo: normalizeAccountType(parsed?.tipo),
          ownerName: typeof parsed?.ownerName === 'string' ? parsed.ownerName : '',
          cedula: typeof parsed?.cedula === 'string' ? parsed.cedula : '',
        });
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
  }, [draftKey]);

  const handleChange = (field: keyof BankFormData, value: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: field === 'tipo' ? normalizeAccountType(value) : value,
      } as BankFormData;

      if (typeof window !== 'undefined') {
        localStorage.setItem(draftKey, JSON.stringify(next));
      }

      return next;
    });
  };

  const queueOfflineSave = async (data: BankFormData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(draftKey, JSON.stringify(data));
      localStorage.setItem(pendingKey, '1');
    }

    await enqueueOfflineAction('/wallet/bank', buildBankPayload(data), 'PUT');
  };

  const submitData = async (data: BankFormData) => {
    try {
      await api.put('/wallet/bank', buildBankPayload(data), {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
        },
      });

      if (typeof window !== 'undefined') {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(pendingKey);
      }

      onSuccess();
      return;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo guardar la información bancaria.';
      const isNetworkFailure =
        !navigator.onLine ||
        !error?.response ||
        /failed to fetch|network|load failed/i.test(String(errorMessage).toLowerCase());

      if (isNetworkFailure || (typeof status === 'number' && status >= 500)) {
        await queueOfflineSave(data);
        onSuccess();
        return;
      }

      throw new Error(errorMessage);
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
      setStep((prev) => prev + 1);
      return;
    }

    if (isOffline || !navigator.onLine) {
      await queueOfflineSave(formData);
      alert('Sin conexión. Datos guardados localmente y listos para sincronizar cuando vuelva la red.');
      onSuccess();
      return;
    }

    try {
      await submitData(formData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la información bancaria.';
      alert(message);
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
              <option value="AHORRO">Ahorros</option>
              <option value="CORRIENTE">Corriente</option>
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
            onClick={() => setStep((prev) => prev - 1)}
            className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
          >
            Atrás
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => void handleNext()}
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
