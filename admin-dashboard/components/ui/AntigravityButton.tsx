import React from 'react';
import { useTADAction } from '../../hooks/useTADAction';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
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
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Auto-reset confirmation state after 4 seconds of inactivity
  React.useEffect(() => {
    if (isConfirming) {
      const timer = setTimeout(() => setIsConfirming(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirming]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) {
       console.warn(`[Antigravity] 🛑 Esperando a que termine la acción anterior: ${actionName}`);
       return;
    }

    if (!onAsyncClick) {
      toast.error(`Error interno: "${actionName}" no tiene una función vinculada.`);
      console.error(`[AntigravityButton] ⚠️ No hay acción vinculada para: "${id ?? actionName}".`);
      return;
    }

    // New internal confirmation flow instead of window.confirm
    if (confirmMessage && !isConfirming) {
       setIsConfirming(true);
       console.log(`[Antigravity] 🛡️ Solicitando confirmación para: ${actionName}`);
       return;
    }

    console.log(`[Antigravity] ⚡ Desplegando acción determinística: ${actionName}`, { critical, isPending });
    
    // Feedback visual inmediato
    toast.info(`Iniciando: ${actionName.replace(/_/g, ' ')}...`, { duration: 1500 });
    setIsConfirming(false); // Clear confirmation state upon execution

    executeAction(onAsyncClick, {
      actionName,
      critical,
      onSuccess: () => {
        setIsConfirming(false);
        if (onSuccess) onSuccess();
      },
      onError: (err) => {
        setIsConfirming(false);
        if (onError) onError(err);
      },
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
      {...props}
      id={id}
      type="button"
      onClick={handleClick}
      disabled={isPending || disabled || !onAsyncClick}
      className={cn(
        'relative z-[100] !pointer-events-auto', // Elevación máxima y eventos forzados
        'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]',
        'transition-all duration-300 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed border',
        isConfirming ? 'bg-amber-500 text-black border-white animate-pulse' : variants[variant],
        className
      )}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : isConfirming ? (
        <>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>[!] CONFIRMAR</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
