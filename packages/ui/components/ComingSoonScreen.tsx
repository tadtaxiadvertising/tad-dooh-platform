import React from 'react';
import { Construction, ArrowLeft, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ComingSoonScreenProps {
  /** Module or feature name */
  title: string;
  /** Optional description of what's coming */
  description?: string;
  /** Optional back button handler */
  onBack?: () => void;
  /** Optional icon override */
  icon?: React.ReactNode;
  /** Estimated launch (e.g. "Q3 2026") */
  estimatedLaunch?: string;
  className?: string;
}

export const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({
  title,
  description,
  onBack,
  icon,
  estimatedLaunch,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[60vh] px-6 py-12',
        'bg-[#0a0a0f]',
        className
      )}
    >
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className={cn(
            'absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10',
            'border border-white/5 hover:border-white/20',
            'transition-all duration-300 backdrop-blur-md'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">Volver</span>
        </button>
      )}

      {/* Icon container with glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-tad-yellow/20 blur-3xl rounded-full animate-pulse" />
        <div
          className={cn(
            'relative flex items-center justify-center w-24 h-24 rounded-3xl',
            'bg-gradient-to-br from-zinc-800 to-zinc-900',
            'border border-white/10 backdrop-blur-xl',
            'shadow-[0_0_40px_rgba(250,212,0,0.15)]'
          )}
        >
          {icon || (
            <Construction className="w-10 h-10 text-tad-yellow" strokeWidth={1.5} />
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-black text-white tracking-tight mb-3 text-center">
        {title}
      </h2>

      {/* Description */}
      <p className="text-zinc-400 text-sm text-center max-w-md mb-6 leading-relaxed">
        {description || 'Este módulo está en desarrollo. Pronto estará disponible para ti.'}
      </p>

      {/* Estimated launch badge */}
      {estimatedLaunch && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full',
            'bg-tad-yellow/10 border border-tad-yellow/20',
            'backdrop-blur-md'
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-tad-yellow" />
          <span className="text-xs font-semibold text-tad-yellow tracking-wide">
            Próximamente: {estimatedLaunch}
          </span>
        </div>
      )}

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none opacity-30" />
    </div>
  );
};
