import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Building2, ArrowRight } from 'lucide-react';
import api from '../../../services/api';

export default function AdvertiserLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Campos adicionales para el registro
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/advertisers/login', { email, password });
      
      // Store advertiser auth (separate from admin)
      localStorage.setItem('tad_advertiser_token', data.access_token);
      localStorage.setItem('tad_advertiser_id', data.advertiserId);
      
      router.push(`/p/advertiser/${data.advertiserId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Credenciales inválidas. Contacte a soporte si olvidó su contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/advertisers', { companyName, contactName, email, password });
      
      // Auto-login after successful registration
      const { data } = await api.post('/advertisers/login', { email, password });
      
      localStorage.setItem('tad_advertiser_token', data.access_token);
      localStorage.setItem('tad_advertiser_id', data.advertiserId);
      
      router.push(`/p/advertiser/${data.advertiserId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al registrar la marca.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingrese su correo corporativo.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/advertisers/recover-password', { email });
      setRecoverySent(true);
    } catch (err: any) {
      // Don't leak if email exists or not, just always show success usually, 
      // but for internal app we can show the error.
      setError(err.response?.data?.message || 'Error al solicitar recuperación. Contacte a soporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white selection:bg-tad-yellow selection:text-black font-sans">
      <Head>
        <title>Login Anunciante | TAD DOOH</title>
      </Head>

      <div className="max-w-md w-full space-y-8 bg-zinc-900/40 p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-[50px] -m-10" />
        
        <div className="text-center space-y-2 relative z-10">
          <div className="w-16 h-16 bg-tad-yellow/10 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm border border-tad-yellow/20">
             <Building2 className="w-8 h-8 text-tad-yellow" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            {isForgotPassword ? 'Recuperar Acceso' : isRegistering ? 'Nueva Cuenta' : 'Portal de Marcas'}
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-loose">
            {isForgotPassword ? 'Te enviaremos las instrucciones' : isRegistering ? 'Crea tu perfil publicitario' : 'Acceso Exclusivo para Anunciantes TAD'}
          </p>
        </div>

        {/* Custom Tabs */}
        {!isForgotPassword && !recoverySent && (
          <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 relative z-10 mb-6">
            <button 
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Iniciar Sesión
            </button>
            <button 
              type="button"
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Registrarse
            </button>
          </div>
        )}

        {recoverySent ? (
          <div className="space-y-6 relative z-10 mt-8 text-center animate-in fade-in zoom-in duration-500">
             <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-3xl text-sm font-bold leading-relaxed shadow-inner">
               Hemos enviado un enlace de recuperación segura a <span className="text-white">{email}</span>. Revisa tu bandeja de entrada o spam.
             </div>
             <button 
               onClick={() => { setIsForgotPassword(false); setRecoverySent(false); }}
               className="mt-6 text-[10px] text-zinc-500 font-black uppercase tracking-widest hover:text-tad-yellow transition-colors"
             >
               Volver al Login
             </button>
          </div>
        ) : (
          <form onSubmit={isForgotPassword ? handleRecovery : isRegistering ? handleRegister : handleLogin} className="space-y-6 relative z-10 mt-8">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[10px] uppercase font-black tracking-widest text-center animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              {isRegistering && !isForgotPassword && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Nombre de la Marca / Empresa</label>
                    <input 
                      type="text" 
                      required 
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Ej: TAD Studio"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-tad-yellow/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Persona de Contacto</label>
                    <input 
                      type="text" 
                      required 
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-tad-yellow/50 transition-all"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Correo Corporativo</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-tad-yellow/50 transition-all"
                />
              </div>
              
              {!isForgotPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center pr-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Acceso Seguro</label>
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(null); }}
                      className="text-[9px] text-zinc-600 font-black uppercase tracking-widest hover:text-tad-yellow transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-tad-yellow/50 transition-all"
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-tad-yellow hover:bg-yellow-400 text-black px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
            >
              {loading ? (isForgotPassword ? 'Enviando...' : isRegistering ? 'Creando Marca...' : 'Validando Nexus...') : (
                isForgotPassword ? (
                  <>Enviar Enlace <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></>
                ) : isRegistering ? (
                  <>Crear Perfil <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></>
                ) : (
                  <>Ingresar al Radar <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></>
                )
              )}
            </button>

            {isForgotPassword && (
               <div className="text-center mt-6">
                 <button 
                   type="button" 
                   onClick={() => { setIsForgotPassword(false); setError(null); }}
                   className="text-[9px] text-zinc-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                 >
                   Cancelar y volver al Login
                 </button>
               </div>
            )}
          </form>
        )}
        
        <div className="text-center pt-8 border-t border-white/5 relative z-10">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em]">TAD DOOH NETWORK &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
