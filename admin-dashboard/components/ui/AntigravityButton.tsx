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
    primary:   'bg-tad-yellow text-black hover:bg-white border-tad-yellow shadow-[0_0_20px_rgba(250,212,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 border-white/10 hover:border-white/30 backdrop-blur-md',
    danger:    'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    ghost:     'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10',
  };

  return (
    <button
      {...props}
      id={id}
      type="button"
      onClick={handleClick}
      disabled={isPending || disabled || !onAsyncClick}
      className={cn(
        'group relative z-[100] !pointer-events-auto',
        'inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-[1.25rem] font-black uppercase tracking-[0.15em] text-[10px]',
        'transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)',
        'active:scale-[0.97] active:brightness-90',
        'disabled:opacity-40 disabled:cursor-not-allowed border-2',
        isConfirming 
          ? 'bg-gradient-to-br from-amber-400 via-rose-500 to-rose-600 text-white border-white shadow-[0_0_40px_rgba(244,63,94,0.6)] animate-[pulse_1s_infinite]' 
          : variants[variant],
        className
      )}
    >
      <div className="flex items-center gap-2.5 relative z-10">
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
            <span className="animate-pulse">{loadingText}</span>
          </>
        ) : isConfirming ? (
          <>
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span className="drop-shadow-sm">¿ESTÁS SEGURO? CONFIRMAR</span>
          </>
        ) : (
          children
        )}
      </div>

      {/* Glossy overlay effect */}
      {!isPending && !isConfirming && (
        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[1.1rem]" />
      )}
    </button>
  );
};
