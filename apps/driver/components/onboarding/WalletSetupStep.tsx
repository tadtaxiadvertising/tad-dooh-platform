import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Landmark } from 'lucide-react';

interface Props {
  onComplete: (data: any) => void;
  onBack: () => void;
}

export const WalletSetupStep = ({ onComplete, onBack }: Props) => {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onComplete({ bank, accountNumber });
  };

  return (
    <motion.div
      key="step3-driver"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Setup de Billetera</h2>
        <p className="text-gray-400">Configura tu cuenta bancaria para recibir los depósitos automáticos.</p>
      </div>

      <div className="flex-1 flex flex-col space-y-8">
        {/* Digital Credit Card Visual */}
        <div className="w-full max-w-sm mx-auto h-48 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-800 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start mb-8 relative z-10">
            <CreditCard className="w-8 h-8 text-white/80" />
            <div className="text-white/80 font-medium tracking-widest text-sm">
              TAD V12
            </div>
          </div>
          <div className="space-y-4 relative z-10">
            <div className="text-white/60 text-xs uppercase tracking-wider">Cuenta Destino</div>
            <div className="text-xl text-white font-mono tracking-widest">
              {accountNumber ? accountNumber.padEnd(16, '•').match(/.{1,4}/g)?.join(' ') : '•••• •••• •••• ••••'}
            </div>
            <div className="text-white/80 text-sm font-medium">
              {bank || 'Nombre del Banco'}
            </div>
          </div>
        </div>

        <form id="wallet-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Banco</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Landmark className="h-5 w-5 text-gray-400" />
              </div>
              <select 
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
              >
                <option value="" disabled className="text-gray-500">Selecciona tu banco</option>
                <option value="Banco Popular" className="text-black">Banco Popular</option>
                <option value="Banreservas" className="text-black">Banreservas</option>
                <option value="BHD" className="text-black">BHD</option>
                <option value="Scotiabank" className="text-black">Scotiabank</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Número de Cuenta</label>
            <input 
              type="text" 
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
              required 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              placeholder="0000000000"
            />
          </div>
        </form>
      </div>

      <div className="pt-8 mt-auto flex justify-between items-center">
        <button 
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors"
        >
          Atrás
        </button>
        <button 
          type="submit"
          form="wallet-form"
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
        >
          Finalizar
        </button>
      </div>
    </motion.div>
  );
};
