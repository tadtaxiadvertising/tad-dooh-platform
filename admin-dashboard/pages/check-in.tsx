import { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function CheckIn() {
  const [status, setStatus] = useState('Iniciando jornada...');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<'info' | 'success' | 'error' | 'warning'>('info');

  useEffect(() => {
    // Obtener deviceId de la URL (escaneado del QR de la tablet)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('deviceId');

    if (!id) {
      setStatus('Error: QR inválido. Escanea el código directamente de la tablet de TAD.');
      setErrorType('error');
      setIsLoading(false);
      return;
    }

    setDeviceId(id);
    setIsLoading(false);

    // Función para enviar GPS
    const sendLocation = () => {
      if (!navigator.geolocation) {
        setStatus('❌ Tu navegador no soporta GPS.');
        setErrorType('error');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axios.post('https://tad-api.vercel.app/api/analytics/external-gps', {
              deviceId: id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            setStatus('📍 Jornada Activa - Ubicación sincronizada');
            setErrorType('success');
          } catch (e) {
            setStatus('⚠️ Error de conexión con los servidores de TAD');
            setErrorType('warning');
          }
        },
        (err) => {
          console.error(err);
          setStatus('❌ Activa el GPS y permite el acceso para poder trabajar');
          setErrorType('error');
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Enviar inmediatamente y luego cada 60 segundos
    sendLocation();
    const interval = setInterval(sendLocation, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 bg-dotted-spacing-6 bg-dotted-zinc-900">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
        {/* Glow Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#fad400]/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10 text-center">
          <div className="inline-block p-4 bg-zinc-900 rounded-3xl border border-white/5 mb-8 mb-6">
            <h1 className="text-4xl font-black italic tracking-tighter text-white">
              TAD<span className="text-[#fad400]">CHOFER</span>
            </h1>
          </div>

          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border transition-all duration-500 flex flex-col items-center gap-4 ${
              errorType === 'success' ? 'bg-green-500/5 border-green-500/20' :
              errorType === 'error' ? 'bg-red-500/5 border-red-500/20' :
              errorType === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
              'bg-zinc-900/50 border-white/5'
            }`}>
              {isLoading ? (
                <Loader2 className="w-12 h-12 text-zinc-500 animate-spin" />
              ) : errorType === 'success' ? (
                <CheckCircle2 className="w-12 h-12 text-green-400 animate-in zoom-in duration-300" />
              ) : errorType === 'error' ? (
                <AlertCircle className="w-12 h-12 text-red-400" />
              ) : (
                <MapPin className="w-12 h-12 text-[#fad400] animate-bounce" />
              )}
              
              <p className={`font-bold text-lg leading-tight ${
                errorType === 'success' ? 'text-green-400' :
                errorType === 'error' ? 'text-red-400' :
                'text-white'
              }`}>
                {status}
              </p>
            </div>

            {deviceId && errorType === 'success' && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Taxi Vinculado</p>
                <p className="font-mono text-zinc-300 text-sm">{deviceId}</p>
              </div>
            )}

            <div className="pt-4">
              <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                Para garantizar el registro de tu jornada, mantén esta pestaña abierta en tu celular mientras estés trabajando.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.2em]">
            © 2026 TAD Advertising Systems
          </p>
        </div>
      </div>
    </div>
  );
}
