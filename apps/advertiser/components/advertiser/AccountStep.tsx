// apps/advertiser/components/advertiser/AccountStep.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Mail, Phone, Lock } from 'lucide-react';

interface AccountStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

const AccountStep: React.FC<AccountStepProps> = ({ formData, setFormData, onNext, onPrev }) => {
  const isFormValid = formData.name && formData.companyName && formData.email && formData.phone && formData.password;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-xl mx-auto space-y-6"
    >
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-black text-white tracking-tight">DATOS DE CUENTA</h2>
          <p className="text-slate-400 text-sm">Configura tu perfil de anunciante premium</p>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#fad400] transition-colors" />
            <input
              type="text"
              placeholder="Nombre Completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#fad400] transition-all"
            />
          </div>

          <div className="relative group">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#fad400] transition-colors" />
            <input
              type="text"
              placeholder="Empresa"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#fad400] transition-all"
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#fad400] transition-colors" />
            <input
              type="email"
              placeholder="Correo Electrónico"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#fad400] transition-all"
            />
          </div>

          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#fad400] transition-colors" />
            <input
              type="tel"
              placeholder="WhatsApp"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#fad400] transition-all"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#fad400] transition-colors" />
            <input
              type="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#fad400] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          className="flex-1 bg-slate-900 text-slate-400 font-bold py-4 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          ATRÁS
        </button>
        <button
          onClick={onNext}
          disabled={!isFormValid}
          className="flex-[2] bg-[#fad400] text-slate-950 font-black py-4 rounded-2xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(250,212,0,0.15)]"
        >
          CONTINUAR
        </button>
      </div>
    </motion.div>
  );
};

export default AccountStep;
