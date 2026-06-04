import React from 'react';
import { Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface AccountStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function AccountStep({ formData, setFormData, onNext, onPrev }: AccountStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-3xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-8"
    >
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-[#fad400]" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Datos de <span className="text-[#fad400]">Empresa</span></h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Nombre / Representante</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] transition-all"
            placeholder="Tu nombre completo"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Empresa</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] transition-all"
            placeholder="Nombre de tu empresa"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] transition-all"
            placeholder="tu@empresa.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Teléfono</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] transition-all"
            placeholder="+1 (809) 000-0000"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button onClick={onPrev} className="flex-1 py-4 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-slate-800">
          <ArrowLeft className="w-4 h-4 inline mr-2" /> Atrás
        </button>
        <button onClick={onNext} className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10">
          Continuar <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </motion.div>
  );
}