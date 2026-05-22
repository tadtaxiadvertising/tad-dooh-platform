import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api, PORTAL_CONFIGS } from '@tad/services';
import { LogIn, Eye, EyeOff, AlertCircle, X, UserPlus, HelpCircle, RotateCcw } from 'lucide-react';
import { ErrorBoundary } from '@tad/ui';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register' | 'recovery';

type AdvertiserLoginResponse = {
  access_token?: string;
  advertiserId?: string;
  entityId?: string;
  name?: string;
  role?: string;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    entityId?: string;
    name?: string;
  };
};

export default function AdvertiserLoginPage() {
  const router = useRouter();
  const config = PORTAL_CONFIGS.ADVERTISER;
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const title = useMemo(() => {
    if (mode === 'register') return 'Registro | ' + config.name;
    if (mode === 'recovery') return 'Recuperar acceso | ' + config.name;
    return 'Login | ' + config.name;
  }, [config.name, mode]);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedEmail = localStorage.getItem('tad_advertiser_last_email');
    if (savedEmail) {
      setLoginForm(prev => ({ ...prev, email: savedEmail }));
      setRecoveryEmail(savedEmail);
      setRegisterForm(prev => ({ ...prev, email: savedEmail }));
    }
  }, []);

  const persistSession = (payload: AdvertiserLoginResponse, fallbackEmail: string) => {
    const accessToken = payload.access_token;
    if (!accessToken) throw new Error('No se recibió un token de acceso válido.');

    const normalizedUser = {
      id: payload.advertiserId || payload.entityId || payload.user?.id || '',
      email: payload.user?.email || fallbackEmail,
      role: payload.role || payload.user?.role || 'ADVERTISER',
      entityId: payload.entityId || payload.advertiserId || payload.user?.entityId || payload.user?.id || '',
      name: payload.name || payload.user?.name || fallbackEmail,
      companyName: payload.name || payload.user?.name || '',
    };

    const isSecure = window.location.protocol === 'https:';
    document.cookie = `sb-access-token=${accessToken}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    localStorage.setItem('tad_advertiser_token', accessToken);
    localStorage.setItem('tad_advertiser_user', JSON.stringify(normalizedUser));
    localStorage.setItem('tad_advertiser_last_email', fallbackEmail);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post<AdvertiserLoginResponse>('/advertisers/login', loginForm);
      persistSession(data, loginForm.email);
      toast.success('Acceso autorizado', { description: `Bienvenido al ${config.name}` });
      router.replace(config.dashboardPath);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Credenciales incorrectas.';
      setError(status === 401 ? 'Correo o contraseña incorrectos.' : message);
      toast.error('No pudimos iniciar sesión', { description: 'Revisa tus credenciales y vuelve a intentarlo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registerForm.companyName || !registerForm.contactName || !registerForm.email || !registerForm.password) {
      setError('Completa el nombre de empresa, contacto, correo y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/advertisers', {
        companyName: registerForm.companyName,
        contactName: registerForm.contactName,
        email: registerForm.email,
        phone: registerForm.phone || undefined,
        password: registerForm.password,
      });

      const { data } = await api.post<AdvertiserLoginResponse>('/advertisers/login', {
        email: registerForm.email,
        password: registerForm.password,
      });

      persistSession(data, registerForm.email);
      sessionStorage.setItem('tad_advertiser_force_onboarding', '1');
      toast.success('Cuenta creada', { description: 'Tu acceso quedó listo para entrar al dashboard.' });
      router.replace(config.dashboardPath);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'No pudimos completar el registro.';
      setError(Array.isArray(message) ? message[0] : message);
      toast.error('Registro no completado', { description: 'Revisa los campos y vuelve a intentarlo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setError('Ingresa el correo de la cuenta que quieres recuperar.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/advertisers/recover-password', { email: recoveryEmail });
      toast.success('Solicitud enviada', { description: 'Si el correo existe, recibirás instrucciones de recuperación.' });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'No pudimos procesar la recuperación.';
      setError(Array.isArray(message) ? message[0] : message);
      toast.error('Recuperación fallida', { description: 'Intenta otra vez o usa otro correo autorizado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-yellow-400 selection:text-black font-sans m-0 absolute inset-0 z-50">
        <Head>
          <title>{title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>

        <div className="flex flex-col items-center mb-8">
          <div className="text-yellow-400 font-black text-5xl tracking-tighter select-none mb-1">
            TAD<span className="text-white text-xs tracking-widest block text-center font-normal mt-1 opacity-60">DOOH PLATFORM</span>
          </div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">{config.subtitle}</p>
        </div>

        <div className="w-full max-w-md bg-zinc-950/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex-none">
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === 'login' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === 'register' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => setMode('recovery')}
              className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === 'recovery' ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'
              }`}
            >
              Recuperar
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-950/50 border border-red-500 rounded-lg flex items-center gap-4 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <p className="font-medium flex-1">{error}</p>
              <button onClick={() => setError('')} type="button" className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="w-full">
                  <label htmlFor="login-email" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="anunciante@tad.do"
                    required
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                  />
                </div>

                <div className="w-full">
                  <label htmlFor="login-password" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      onKeyUp={handleKeyUp}
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-4 flex items-center text-zinc-400 hover:text-yellow-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {capsLock && <p className="text-yellow-400 text-xs mt-2">⚠️ Bloqueo de mayúsculas activado</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-yellow-400/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Empresa</label>
                <input
                  type="text"
                  value={registerForm.companyName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                  placeholder="Nombre comercial"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Contacto</label>
                <input
                  type="text"
                  value={registerForm.contactName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, contactName: e.target.value }))}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                  placeholder="Nombre de la persona responsable"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Correo</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                  placeholder="marca@empresa.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                  placeholder="809-555-5555"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm pr-12"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-zinc-400 hover:text-yellow-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-yellow-400/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Crear y Entrar
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'recovery' && (
            <form onSubmit={handleRecoverySubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Correo de recuperación</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                  placeholder="anunciante@tad.do"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-yellow-400/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Enviar enlace
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 text-[11px] text-zinc-500 leading-relaxed">
            El acceso del anunciante se sincroniza localmente para que el dashboard reconozca tu entidad en el próximo inicio de sesión.
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
