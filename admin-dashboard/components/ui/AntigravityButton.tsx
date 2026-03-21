import React from 'react';
import { useTADAction } from '../../hooks/useTADAction';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AntigravityButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Primary action. */
  onAsyncClick?: () => Promise<any>;
  loadingText?: string;
  actionName: string;
  critical?: boolean;
  /** If provided, will show a native confirm() dialog before executing the action. */
  confirmMessage?: string;
  onSuccess?: () => void;
  onError?: (err: any) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const AntigravityButton: React.FC<AntigravityButtonProps> = ({
  children,
  onAsyncClick,
  loadingText = 'Procesando...',
  className,
  actionName,
  critical = false,
  confirmMessage,
  onSuccess,
  onError,
  variant = 'primary',
  disabled,
  id,
  ...props
}) => {
  const { executeAction, isPending } = useTADAction();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onAsyncClick) {
      console.warn(`[AntigravityButton] ⚠️ No hay acción vinculada para: "${id ?? actionName}".`);
      return;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
       console.log(`[Antigravity] 🛑 Acción cancelada por el usuario: ${actionName}`);
       return;
    }

    console.log(`[Antigravity] ⚡ Desplegando acción determinística: ${actionName}`, { critical });
    
    executeAction(onAsyncClick, {
      actionName,
      critical,
      onSuccess,
      onError,
    });
  };

  const variants: Record<string, string> = {
    primary:   'bg-tad-yellow text-black hover:bg-white border-tad-yellow shadow-[0_4px_20px_rgba(250,212,0,0.15)]',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 border-white/10',
    danger:    'bg-rose-600 text-white hover:bg-rose-700 border-rose-500/10',
    ghost:     'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 border-transparent',
  };

  return (
    <button
      id={id}
      type="button"
      onClick={handleClick}
      disabled={isPending || disabled || !resolvedAction}
      className={cn(
        'relative z-[100] !pointer-events-auto', // Elevación máxima y eventos forzados
        'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]',
        'transition-all duration-300 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed border',
        variants[variant],
        className
      )}
      {...props}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
