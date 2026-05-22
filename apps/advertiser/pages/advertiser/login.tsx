import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from "@tad/services";
import { BarChart3, LogIn, AlertCircle, Eye, EyeOff, Briefcase, Shield, ArrowRight, CheckCircle, KeyRound, Mail, X, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';

type AuthView = 'login' | 'register' | 'forgot' | 'forgot-sent';

export default function AdvertiserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<AuthView>('login');

  useEffect(() => { setMounted(true); }, []);

  const resetForm = () => {
    setError('');
    setSuccess('');
    setPassword('');
  };

  const switchView = (v: AuthView) => {
    resetForm();
    setView(v);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/advertisers/login', { email, password });
      const data = res.data;
      if (!data.access_token) throw new Error('No se recibió token de acceso.');

      localStorage.setItem('tad_advertiser_token', data.access_token);
      localStorage.setItem('tad_advertiser_user', JSON.stringify({
        id: data.advertiserId, email, role: 'ADVERTISER',
        entityId: data.advertiserId, companyName: data.name,
        app_metadata: { role: 'ADVERTISER', entityId: data.advertiserId }
      }));
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      router.replace('/advertiser/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const res = await api.post('/advertisers', { companyName, contactName, email, phone, password });
      setSuccess('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      setTimeout(() => switchView('login'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/advertisers/recover-password', { email });
      setView('forgot-sent');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al enviar recuperación');
    } finally {
      setLoading(false);
    }
  };

  const viewTitle = {
    'login': 'Iniciar Sesión',
    'register': 'Crear Cuenta',
    'forgot': 'Recuperar Contraseña',
    'forgot-sent': 'Correo Enviado',
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Head>
        <title>{viewTitle[view]} | TAD Advertiser Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-tad-yellow/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className={clsx(
        "w-full max-w-[480px] z-10 transition-all duration-700",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-6 shadow-2xl">
            <BarChart3 className="w-8 h-8 text-tad-yellow" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
            ADVERTISER <span className="text-tad-yellow">HUB</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">Plataforma de Gestión de Campañas</p>
          {/* Social Proof */}
          <div className="mt-5 inline-flex items-center gap-2 px-5 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
            <div className="flex -space-x-2">
              {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-zinc-700 border-2 border-[#050505]" />)}
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">342+ empresas activas</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-tad-yellow/50 to-transparent" />

          {/* Tabs Selector for Login / Register */}
          {(view === 'login' || view === 'register') && (
            <div className="flex bg-black/45 border border-white/5 p-1 rounded-2xl mb-8 relative z-10">
              <button
                type="button"
                onClick={() => switchView('login')}
                className={clsx(
                  "flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-[0.98]",
                  view === 'login'
                    ? "bg-tad-yellow text-black shadow-[0_4px_15px_rgba(255,212,0,0.25)]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => switchView('register')}
                className={clsx(
                  "flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-[0.98]",
                  view === 'register'
                    ? "bg-tad-yellow text-black shadow-[0_4px_15px_rgba(255,212,0,0.25)]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Registrar Empresa
              </button>
            </div>
          )}

          {/* ─── LOGIN VIEW ─── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && <ErrorBanner message={error} onClose={() => setError('')} />}
              {success && <SuccessBanner message={success} />}

              <div className="space-y-5">
                <InputField
                  id="adv-email" label="Correo Electrónico" type="email"
                  value={email} onChange={setEmail} placeholder="correo@empresa.com"
                  icon={<Mail className="w-4 h-4" />}
                />
                <PasswordField
                  id="adv-password" label="Contraseña" value={password}
                  onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)}
                />
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <button type="button" onClick={() => switchView('forgot')}
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <SubmitButton loading={loading} text="Iniciar Sesión" loadingText="Validando..." />

              {/* Direct campaign onboarding link */}
              <div className="pt-6 border-t border-white/5 text-center space-y-3">
                <p className="text-[11px] text-gray-500">¿Aún no anuncias tu marca en taxis?</p>
                <button type="button" onClick={() => router.push('/advertiser/onboarding')}
                  className="inline-flex items-center gap-2 text-[11px] font-bold text-tad-yellow uppercase tracking-wider hover:text-white transition-colors group"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Lanzar mi primera campaña</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[9px] text-zinc-700 uppercase tracking-wider">Espacios limitados · Desde RD$3,000/mes</p>
              </div>
            </form>
          )}

          {/* ─── REGISTER VIEW ─── */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="text-center mb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Registrar Empresa</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Complete los datos para crear su cuenta</p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}
              {success && <SuccessBanner message={success} />}

              <InputField id="reg-company" label="Nombre de Empresa" type="text"
                value={companyName} onChange={setCompanyName} placeholder="Mi Empresa SRL" required
                icon={<Briefcase className="w-4 h-4" />}
              />
              <InputField id="reg-contact" label="Persona de Contacto" type="text"
                value={contactName} onChange={setContactName} placeholder="Juan Pérez" required
                icon={<Briefcase className="w-4 h-4" />}
              />
              <InputField id="reg-email" label="Correo Electrónico" type="email"
                value={email} onChange={setEmail} placeholder="correo@empresa.com" required
                icon={<Mail className="w-4 h-4" />}
              />
              <InputField id="reg-phone" label="Teléfono (opcional)" type="tel"
                value={phone} onChange={setPhone} placeholder="809-555-0001"
                icon={<Briefcase className="w-4 h-4" />}
              />
              <PasswordField id="reg-password" label="Contraseña (mín. 6 caracteres)" value={password}
                onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)}
              />

              <SubmitButton loading={loading} text="Crear Cuenta" loadingText="Registrando..." />

              <div className="text-center pt-4">
                <button type="button" onClick={() => switchView('login')}
                  className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                >
                  ← Ya tengo cuenta, iniciar sesión
                </button>
              </div>
            </form>
          )}

          {/* ─── FORGOT VIEW ─── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-tad-yellow/10 rounded-2xl mb-4">
                  <KeyRound className="w-8 h-8 text-tad-yellow" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Recuperar Contraseña</h2>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
                </p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              <InputField id="forgot-email" label="Correo Electrónico" type="email"
                value={email} onChange={setEmail} placeholder="correo@empresa.com" required
                icon={<Mail className="w-4 h-4" />}
              />

              <SubmitButton loading={loading} text="Enviar Instrucciones" loadingText="Enviando..." />

              <div className="text-center pt-4">
                <button type="button" onClick={() => switchView('login')}
                  className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}

          {/* ─── FORGOT SENT VIEW ─── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-6 space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">¡Correo Enviado!</h2>
                <p className="text-[12px] text-gray-400 leading-relaxed max-w-[300px] mx-auto">
                  Si existe una cuenta con <span className="text-white font-bold">{email}</span>, recibirás instrucciones para restablecer tu contraseña.
                </p>
              </div>
              <button onClick={() => switchView('login')}
                className="inline-flex items-center gap-2 text-[11px] font-bold text-tad-yellow uppercase tracking-wider hover:text-white transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em]">
            © 2026 TAD ADVERTISING SOLUTIONS
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ──

function InputField({ id, label, type, value, onChange, placeholder, icon, required = true }: any) {
  return (
    <div className="group">
      <label htmlFor={id} className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-tad-yellow transition-colors">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
          {icon}
        </div>
        <input id={id} type={type} value={value} required={required}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/40 focus:bg-black/60 transition-all"
        />
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, show, onToggle }: any) {
  return (
    <div className="group">
      <label htmlFor={id} className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-tad-yellow transition-colors">
        {label || 'Contraseña'}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
          <Shield className="w-4 h-4" />
        </div>
        <input id={id} type={show ? 'text' : 'password'} value={value} required
          onChange={(e) => onChange(e.target.value)} placeholder={show ? 'MiContraseña123' : '••••••••••••'}
          className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-14 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/40 focus:bg-black/60 transition-all"
        />
        <button type="button" onClick={onToggle} tabIndex={-1}
          className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-tad-yellow transition-colors"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ loading, text, loadingText }: any) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl hover:shadow-tad-yellow/20 flex items-center justify-center gap-3 disabled:opacity-50 group/btn overflow-hidden relative active:scale-[0.98]"
    >
      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
      {loading ? (
        <span className="flex items-center gap-3 relative z-10">
          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </span>
      ) : (
        <span className="flex items-center gap-3 relative z-10">
          <LogIn className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
          {text}
        </span>
      )}
    </button>
  );
}

function ErrorBanner({ message, onClose }: any) {
  return (
    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="text-[11px] font-bold uppercase tracking-wider flex-1">{message}</p>
      <button onClick={onClose} className="text-red-500/60 hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SuccessBanner({ message }: any) {
  return (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400">
      <CheckCircle className="w-5 h-5 flex-shrink-0" />
      <p className="text-[11px] font-bold uppercase tracking-wider">{message}</p>
    </div>
  );
}
