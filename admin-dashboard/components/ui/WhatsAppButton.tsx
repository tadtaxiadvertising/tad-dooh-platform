import React from 'react';
import { MessageCircle } from 'lucide-react';
import clsx from 'clsx';

interface WhatsAppButtonProps {
  phone?: string;
  name?: string;
  className?: string;
  variant?: 'icon' | 'full';
}

export default function WhatsAppButton({ phone, name, className, variant = 'icon' }: WhatsAppButtonProps) {
  if (!phone) return null;

  // Sanear el teléfono: Solo números
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Si no tiene prefijo de país, asumimos DR (+1)
  const finalPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
  
  const waUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(`Hola ${name || ''}, te escribo desde el panel de administración de TAD.`)}`;

  if (variant === 'full') {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
          className
        )}
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </a>
    );
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noreferrer"
      title={`Contactar a ${name || 'Socio'} vía WhatsApp`}
      className={clsx(
        "p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all shadow-sm flex items-center justify-center",
        className
      )}
    >
      <MessageCircle className="w-4 h-4 fill-current sm:fill-none" />
    </a>
  );
}
