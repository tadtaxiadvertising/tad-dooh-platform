import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { PortalConfig, getPortalConfig } from '@tad/services';

interface AuthCallbackProps {
  config?: PortalConfig;
}

export function AuthCallback({ config: externalConfig }: AuthCallbackProps) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const config = externalConfig || getPortalConfig(window.location.pathname);
    const { hash, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const nextPath = urlParams.get('next') || config.dashboardPath;
    
    // Supabase PKCE automatically handles the #access_token exchange internally 
    // when using @supabase/supabase-js v2, turning the hash into a session cookie.
    // We just need to wait briefly and then redirect to the correct next path.
    
    // In some PKCE flows (e.g., magic link or password reset), Supabase might put an error in the hash.
    const hashParams = new URLSearchParams(hash.substring(1));
    if (hashParams.get('error')) {
      console.error('Error en callback:', hashParams.get('error_description'));
      router.replace(`${config.loginPath}?error=${encodeURIComponent('El enlace es inválido o ha expirado.')}`);
      return;
    }

    // Delay redirect slightly to ensure Supabase client finishes exchanging tokens
    const timer = setTimeout(() => {
      router.replace(nextPath);
    }, 1500);

    return () => clearTimeout(timer);
  }, [router, externalConfig]);

  const config = externalConfig || getPortalConfig(router.pathname);

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      {/* Environment Glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] blur-[180px] rounded-full animate-pulse-soft opacity-10" 
          style={{ backgroundColor: config.accentColor }} 
        />
      </div>

      <div className="w-full max-w-sm text-center">
        <div className="relative inline-block mb-8 animate-pulse">
          <div 
            className="absolute inset-0 blur-[30px] opacity-20" 
            style={{ backgroundColor: config.accentColor }} 
          />
          <div 
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ backgroundColor: config.accentColor }} 
          >
            <ShieldCheck className="w-10 h-10 text-black" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black uppercase tracking-tight mb-4">Verificando Acceso</h1>
        
        <div className="flex items-center justify-center gap-3 text-gray-400 text-sm font-bold tracking-widest uppercase">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Procesando Código PKCE</span>
        </div>
      </div>
    </div>
  );
}
