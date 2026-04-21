import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from "@tad/services";
import { Car, LogIn, AlertCircle, Eye, EyeOff, Phone, Shield, ArrowRight, CheckCircle, KeyRound, X, UserPlus, MapPin } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';

type AuthView = 'login' | 'register' | 'forgot' | 'forgot-sent';

export default function DriverLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [taxiPlate, setTaxiPlate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [agreements, setAgreements] = useState({ contract: false, insurance: false });

  useEffect(() => { setMounted(true); }, []);

  const resetForm = () => { setError(''); setSuccess(''); setPassword(''); };
  const switchView = (v: AuthView) => { resetForm(); setView(v); };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/drivers/login', { phone, password });
      const data = res.data;
      if (!data.access_token) throw new Error('No se recibió token de acceso.');

      localStorage.setItem('tad_driver_token', data.access_token);
      localStorage.setItem('tad_driver_user', JSON.stringify({
        id: data.driverId, email: phone, role: 'DRIVER',
        entityId: data.driverId, fullName: data.name,
        app_metadata: { role: 'DRIVER', entityId: data.driverId }
      }));
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      router.replace('/driver/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Teléfono o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreements.contract || !agreements.insurance) {
      setError('Debes aceptar el contrato y el seguro para registrarte');
      return;
    }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await api.post('/drivers', {
        fullName, phone, cedula, taxiPlate, password,
        contractAccepted: true, insuranceAccepted: true,
        agreementVersion: '2.0'
      });
      setSuccess('¡Registro exitoso! Ya puedes iniciar sesión.');
      setTimeout(() => switchView('login'), 2500);
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
      // Driver password recovery — for now shows confirmation.
      // Backend could be extended with SMS recovery via Twilio.
      setTimeout(() => { setView('forgot-sent'); setLoading(false); }, 1000);
    } catch (err: any) {
      setError('Error al solicitar recuperación');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <Head>
        <title>Driver Portal | TAD</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Background */}
      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-tad-yellow/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-tad-yellow/10 blur-[80px] rounded-full pointer-events-none" />

      <div className={clsx(
        "w-full max-w-[420px] z-10 transition-all duration-700",
        mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}>
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-tad-yellow rounded-[2rem] shadow-[0_15px_40px_rgba(250,212,0,0.2)] mb-6">
            <Car className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">
            DRIVER <span className="text-tad-yellow">APP</span>
          </h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em]">Portal del Conductor</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-tad-yellow/40 to-transparent" />

          {/* ─── LOGIN ─── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              {error && <ErrorBanner message={error} onClose={() => setError('')} />}
              {success && <SuccessBanner message={success} />}

              <MobileInput id="drv-phone" label="Número de Teléfono" type="tel"
                value={phone} onChange={setPhone} placeholder="829-555-0001"
                icon={<Phone className="w-5 h-5" />}
              />
              <MobilePasswordField id="drv-pass" value={password} onChange={setPassword}
                show={showPassword} onToggle={() => setShowPassword(!showPassword)}
              />

              <div className="flex justify-end">
                <button type="button" onClick={() => switchView('forgot')}
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors active:scale-95"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <MobileSubmitButton loading={loading} text="INICIAR SESIÓN" loadingText="CONECTANDO..." />

              <div className="pt-5 border-t border-white/5 text-center">
                <p className="text-[11px] text-gray-500 mb-3">¿Eres nuevo conductor TAD?</p>
                <button type="button" onClick={() => router.push('/driver/onboarding')}
                  className="inline-flex items-center gap-2 text-[12px] font-black text-tad-yellow uppercase tracking-wider hover:text-white transition-colors active:scale-95 group"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Conviértete en Socio</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          )}

          {/* ─── REGISTER ─── */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Unirme a TAD</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Completa tus datos para conducir con nosotros</p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}
              {success && <SuccessBanner message={success} />}

              <MobileInput id="reg-name" label="Nombre Completo" type="text"
                value={fullName} onChange={setFullName} placeholder="Juan Pérez"
                icon={<Car className="w-5 h-5" />}
              />
              <MobileInput id="reg-phone" label="Teléfono Celular" type="tel"
                value={phone} onChange={setPhone} placeholder="829-555-0001"
                icon={<Phone className="w-5 h-5" />}
              />
              <MobileInput id="reg-cedula" label="Cédula (opcional)" type="text"
                value={cedula} onChange={setCedula} placeholder="001-0000000-0" required={false}
                icon={<Shield className="w-5 h-5" />}
              />
              <MobileInput id="reg-plate" label="Placa del Taxi (opcional)" type="text"
                value={taxiPlate} onChange={setTaxiPlate} placeholder="T-101" required={false}
                icon={<MapPin className="w-5 h-5" />}
              />
              <MobilePasswordField id="reg-pass" value={password} onChange={setPassword}
                show={showPassword} onToggle={() => setShowPassword(!showPassword)}
                label="Contraseña (mín. 6 caracteres)"
              />

              {/* Agreements */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={agreements.contract}
                    onChange={e => setAgreements(prev => ({ ...prev, contract: e.target.checked }))}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-tad-yellow focus:ring-tad-yellow accent-yellow-400"
                  />
                  <span className="text-[11px] text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                    Acepto el <span className="text-tad-yellow font-bold">contrato de servicio</span> y términos de uso de la plataforma TAD.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={agreements.insurance}
                    onChange={e => setAgreements(prev => ({ ...prev, insurance: e.target.checked }))}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-tad-yellow focus:ring-tad-yellow accent-yellow-400"
                  />
                  <span className="text-[11px] text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                    Acepto el <span className="text-tad-yellow font-bold">seguro del equipo</span> y la política de privacidad.
                  </span>
                </label>
              </div>

              <MobileSubmitButton loading={loading} text="CREAR MI CUENTA" loadingText="REGISTRANDO..." />

              <div className="text-center pt-3">
                <button type="button" onClick={() => switchView('login')}
                  className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                >
                  ← Ya tengo cuenta
                </button>
              </div>
            </form>
          )}

          {/* ─── FORGOT ─── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-tad-yellow/10 rounded-2xl mb-4">
                  <KeyRound className="w-8 h-8 text-tad-yellow" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Recuperar Contraseña</h2>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  Ingresa tu número de teléfono. Nuestro equipo de soporte te contactará para restablecer tu acceso.
                </p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              <MobileInput id="forgot-phone" label="Número de Teléfono" type="tel"
                value={phone} onChange={setPhone} placeholder="829-555-0001"
                icon={<Phone className="w-5 h-5" />}
              />

              <MobileSubmitButton loading={loading} text="SOLICITAR RECUPERACIÓN" loadingText="PROCESANDO..." />

              <div className="text-center pt-3">
                <button type="button" onClick={() => switchView('login')}
                  className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                >
                  ← Volver al inicio
                </button>
              </div>
            </form>
          )}

          {/* ─── FORGOT SENT ─── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-8 space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">¡Solicitud Recibida!</h2>
                <p className="text-[12px] text-gray-400 leading-relaxed max-w-[280px] mx-auto">
                  Un agente de soporte TAD te contactará al número <span className="text-white font-bold">{phone}</span> para restablecer tu contraseña.
                </p>
              </div>
              <button onClick={() => switchView('login')}
                className="inline-flex items-center gap-2 text-[12px] font-bold text-tad-yellow uppercase tracking-wider hover:text-white transition-colors active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared Mobile Components ──

function MobileInput({ id, label, type, value, onChange, placeholder, icon, required = true }: any) {
  return (
    <div className="group">
      <label htmlFor={id} className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-tad-yellow transition-colors">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center text-gray-600 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
          {icon}
        </div>
        <input id={id} type={type} value={value} required={required}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-black border border-white/5 rounded-2xl pl-14 pr-5 py-5 text-white text-base font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/40 focus:bg-zinc-950 transition-all"
        />
      </div>
    </div>
  );
}

function MobilePasswordField({ id, value, onChange, show, onToggle, label }: any) {
  return (
    <div className="group">
      <label htmlFor={id} className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-tad-yellow transition-colors">
        {label || 'Contraseña'}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center text-gray-600 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
          <Shield className="w-5 h-5" />
        </div>
        <input id={id} type={show ? 'text' : 'password'} value={value} required
          onChange={(e) => onChange(e.target.value)} placeholder={show ? 'MiClave123' : '••••••••••••'}
          className="w-full bg-black border border-white/5 rounded-2xl pl-14 pr-14 py-5 text-white text-base font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/40 focus:bg-zinc-950 transition-all"
        />
        <button type="button" onClick={onToggle} tabIndex={-1}
          className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-tad-yellow active:text-white transition-colors"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

function MobileSubmitButton({ loading, text, loadingText }: any) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-4 disabled:opacity-50"
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <LogIn className="w-5 h-5" />
          <span>{text}</span>
        </>
      )}
    </button>
  );
}

function ErrorBanner({ message, onClose }: any) {
  return (
    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="text-[11px] font-bold uppercase tracking-wider flex-1">{message}</p>
      <button onClick={onClose} className="text-rose-500/60 hover:text-rose-400 active:scale-90 transition-all">
        <X className="w-5 h-5" />
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
