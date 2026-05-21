import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  onNext: (data: any) => void;
}

export const BrandIdentityStep = ({ onNext }: Props) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onNext({
      companyName: formData.get('companyName'),
      rnc: formData.get('rnc'),
    });
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Bienvenido a TAD</h2>
        <p className="text-gray-400">Comencemos con la identidad de tu marca.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de la Empresa</label>
          <input 
            type="text" 
            name="companyName" 
            required 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Ej. Acme Corp"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">RNC (Opcional)</label>
          <input 
            type="text" 
            name="rnc" 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="1-01-12345-1"
          />
        </div>

        <div className="pt-8 mt-auto flex justify-end">
          <button 
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Continuar
          </button>
        </div>
      </form>
    </motion.div>
  );
};
