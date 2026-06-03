import React, { useState, useEffect } from 'react';

interface BankFormData {
  bank: string;
  account: string;
  type: string;
  ownerName: string;
  idDocument: string;
}

interface BankFormProps {
  driverId: string;
  onSuccess: () => void;
}

export const BankForm: React.FC<BankFormProps> = ({ driverId, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BankFormData>({
    bank: '',
    account: '',
    type: 'SAVINGS',
    ownerName: '',
    idDocument: '',
  });
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => {
      setIsOffline(false);
      const savedData = localStorage.getItem('pendingBankUpdate');
      if (savedData) {
        submitData(JSON.parse(savedData));
      }
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const submitData = async (data: BankFormData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.rewvid.easypanel.host/api/v1'}/wallet/bank`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, ...data }),
      });
      
      if (response.ok) {
        localStorage.removeItem('pendingBankUpdate');
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving bank data:', error);
    }
  };

  const handleNext = () => {
    if (step === 2 && !/^\d{10,20}$/.test(formData.account)) {
      alert('Número de cuenta inválido (10-20 dígitos numéricos)');
      return;
    }
    if (step === 5 && !/^\d{11}$/.test(formData.idDocument)) {
      alert('Cédula inválida (11 dígitos, sin guiones)');
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      if (isOffline || !navigator.onLine) {
        localStorage.setItem('pendingBankUpdate', JSON.stringify(formData));
        alert('Sin conexión. Datos guardados localmente, se sincronizarán al recuperar la red.');
        onSuccess();
      } else {
        submitData(formData);
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
              value={formData.bank}
              onChange={(e) => handleChange('bank', e.target.value)}
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
              value={formData.account}
              onChange={(e) => handleChange('account', e.target.value.replace(/\D/g, ''))}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Tipo de Cuenta</label>
            <select 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
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
              value={formData.idDocument}
              onChange={(e) => handleChange('idDocument', e.target.value.replace(/\D/g, ''))}
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
            (step === 1 && !formData.bank) ||
            (step === 2 && formData.account.length < 10) ||
            (step === 4 && formData.ownerName.trim() === '') ||
            (step === 5 && formData.idDocument.length !== 11)
          }
          className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {step === 5 ? 'Guardar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
};
