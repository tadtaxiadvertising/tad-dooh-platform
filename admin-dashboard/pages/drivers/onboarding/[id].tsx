import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Shield, FileText, CheckCircle, CreditCard, ExternalLink, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

// Reusable mock components just in case any doesn't exist, though user implied AntigravityButton exists
const AntigravityButton = ({ children, isLoading, onClick, disabled, className = '', variant = 'primary' }: any) => {
  const baseClasses = "relative group overflow-hidden rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#FFD400] text-black hover:bg-[#e6bf00] px-6 py-3 shadow-[0_0_20px_rgba(255,212,0,0.3)] hover:shadow-[0_0_30px_rgba(255,212,0,0.5)]",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 px-6 py-3 border border-zinc-700",
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || isLoading} 
      className={`${baseClasses} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Procesando...
        </span>
      ) : children}
    </button>
  );
};

export default function DriverOnboarding() {
  const router = useRouter();
  const { id } = router.query;
  const [step, setStep] = useState<number>(1);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch driver status
  useEffect(() => {
    if (!id) return;
    
    // Simulating proxy fetch
    fetch(`/api/proxy/drivers/${id}`)
      .then(res => res.json())
      .then(data => {
        setDriver(data);
        if (data.onboardingStatus === 'PENDING_PAYMENT' || data.contractAccepted) {
          setStep(2);
        }
        if (data.onboardingStatus === 'ACTIVE' || data.status === 'ACTIVE') {
          router.push(`/driver-hub/${id}`);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error('Error al cargar datos del chofer');
        setLoading(false);
      });
  }, [id]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Check if scrolled to bottom with 10px threshold
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
      setHasScrolledToBottom(true);
    }
  };

  const signContract = async () => {
    try {
      setAccepting(true);
      const res = await fetch(`/api/proxy/drivers/${id}/accept-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: '1.0' })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al firmar acuerdo');
      }
      
      toast.success('Acuerdo legal firmado electrónicamente');
      setStep(2);
      
    } catch (err: any) {
      toast.error(err.message || 'Fallo de conexión');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#FFD400] border-t-transparent animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-[#FFD400] selection:text-black">
      <Head>
        <title>Onboarding & Acuerdo | TAD</title>
      </Head>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-[#FFD400]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenido a TAD Platform</h1>
          <p className="text-zinc-400">Pocas cosas te separan de recibir tu equipo.</p>
          
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#FFD400]' : 'text-zinc-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-[#FFD400] text-black' : 'bg-zinc-800'}`}>1</div>
              <span className="font-medium hidden sm:block">Firma Legal</span>
            </div>
            <div className="w-16 h-px bg-zinc-800">
              <div className={`h-full bg-[#FFD400] transition-all duration-500`} style={{ width: step > 1 ? '100%' : '0%' }}></div>
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#FFD400]' : 'text-zinc-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-[#FFD400] text-black' : 'bg-zinc-800'}`}>2</div>
              <span className="font-medium hidden sm:block">Pago de Equipo</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Clickwrap Agreement */}
        {step === 1 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <ScrollText className="text-[#FFD400] w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Contrato de Afiliación & Responsabilidad</h2>
            </div>
            
            <p className="text-sm text-zinc-400 mb-4">
              Por favor revisa cuidadosamente los términos del servicio. Debes leer hasta el final para poder aceptar.
            </p>

            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="bg-black/50 border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 h-[40vh] overflow-y-auto font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed custom-scrollbar"
            >
              <h3 className="text-white text-lg mb-4 font-sans">TÉRMINOS Y CONDICIONES - TAXI ADVERTISING LLC</h3>
              <p className="mb-4">1. DECLARACIÓN DEL SERVICIO<br/>Al aceptar este contrato, el Chofer ("Afiliado") acuerda instalar una tableta Android inteligente proporcionada por TAD ("El Equipo") en la parte trasera del apoyacabezas del asiento del copiloto de su vehículo, para transmitir publicidad digital en movimiento a sus pasajeros.</p>
              
              <p className="mb-4">2. DEPÓSITO Y MEMBRESÍA<br/>El Afiliado se compromete a abonar la suma anual no reembolsable de RD$ 6,000.00 DOP ("Membresía") para la cobertura de seguro contra robo/rotura, conectividad celular LTE ininterrumpida y licenciamiento logístico de la flota. <strong>Bajo ningún concepto se entregará hardware sin este pago validado.</strong></p>

              <p className="mb-4">3. RESPONSABILIDAD DEL EQUIPO<br/>El Afiliado es responsable solidario de velar por el cuidado de la Tablet. En caso de vandalismo por terceros, el seguro de la membresía cubre 1(un) reemplazo anual, requiriendo acta policial obligatoria.</p>

              <p className="mb-4">4. MONITOREO GEOSPATIAL<br/>El Afiliado acepta que el dispositivo cuenta con capacidades GPS de alta precisión y Telemetría las 24 horas del día. La plataforma recopilará coordenadas anonimizadas para la validación de impresiones publicitarias ante marcas globales.</p>
              
              <p className="mb-4">5. PAGOS POR DESEMPEÑO<br/>La compensación salarial neta ("Nómina") es de cincuenta pesos dominicanos (RD$ 50.00) netos semanales por cada anunciante activo ("Campaña Aprobada"). TAD consolidará el balance los días 15 y 30/31 de cada mes mediante transferencia interbancaria (ACH), supeditado a un uptime (conectividad) mayor al 75% dictaminado por los analíticos del equipo.</p>
              
              <p className="mb-12">6. JURISDICCIÓN COMPETENTE<br/>Cualquier disconformidad legal será resuelta mediante la jurisdicción e instancias de la República Dominicana o en los tribunales del Estado de Delaware, Estados Unidos de América.</p>
              
              <div className="text-center text-zinc-600 border-t border-zinc-800 pt-6">-- FIN DEL DOCUMENTO --</div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6">
              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${hasScrolledToBottom ? 'text-green-500' : 'text-zinc-600'}`} />
              <p className="text-sm">
                He leído y comprendido todo el contrato de afiliación y responsabilidad por posesión de Hardware.
              </p>
            </div>

            <AntigravityButton 
              className="w-full text-lg flex items-center justify-center gap-2"
              onClick={signContract}
              disabled={!hasScrolledToBottom}
              isLoading={accepting}
            >
              <FileText className="w-5 h-5" />
              Aceptar y Firmar Electrónicamente
            </AntigravityButton>
          </div>
        )}

        {/* STEP 2: Pending Payment */}
        {step === 2 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl text-center">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Firma Completada Exitosamente!</h2>
            <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
              Tu contrato ha sido sellado criptográficamente y registrado en nuestros servidores. Para completar el alta y reclamar tu Tablet Publicitaria, necesitas abonar la membresía de flota.
            </p>

            <div className="bg-[#FFD400]/10 border border-[#FFD400]/20 rounded-2xl p-6 max-w-md mx-auto mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield className="w-24 h-24 text-[#FFD400]" />
              </div>
              <div className="relative z-10 text-left">
                <span className="text-xs font-bold text-[#FFD400] uppercase tracking-wider">Concepto de Pago</span>
                <h3 className="text-xl text-white font-bold mb-1 mt-1">Membresía TAD Anual</h3>
                <p className="text-sm text-zinc-400 mb-4">Seguro de equipo + Licenciamiento LTE.</p>
                <div className="text-4xl font-black text-white">RD$6,000<span className="text-sm font-medium text-zinc-500 ml-1">/año</span></div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <AntigravityButton className="w-full flex items-center justify-center gap-2" onClick={() => toast.info('Integración de Azul Checkout pendiente.')}>
                <CreditCard className="w-5 h-5" />
                Pagar con Tarjeta
              </AntigravityButton>
              <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all border border-zinc-700 flex items-center justify-center gap-2" onClick={() => toast.info('Mostrando datos de ACH...')}>
                <ExternalLink className="w-5 h-5" />
                Transferencia Bancaria
              </button>
            </div>
            
            <p className="text-xs text-zinc-500 mt-8">
              Si realizas transferencia bancaria, el equipo de TAD confirmará la transacción antes de autorizar la entrega de tu equipo físico.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
