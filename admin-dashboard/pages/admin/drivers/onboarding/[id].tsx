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
              <h3 className="text-white text-lg mb-4 font-sans">ACUERDO DE PRESTACIÓN DE SERVICIOS INDEPENDIENTES Y COMODATO</h3>
              <p className="mb-4">1. NATURALEZA DEL VÍNCULO<br/>El presente contrato es de naturaleza estrictamente CIVIL. El Conductor actúa como un proveedor de servicios independiente, sin subordinación, cumpliendo con la exhibición de pautas a través del hardware proporcionado.</p>
              
              <p className="mb-4">2. MEMBRESÍA DE ACTIVACIÓN Y ACCESO (PAGO PREVIO)<br/>Para acceder a la plataforma TAD y recibir el hardware en comodato, el Conductor acepta realizar un pago único anual de RD$6,000.00.<br/><strong>Condición Esencial:</strong> La entrega del equipo y la activación de la cuenta están sujetas a la confirmación de este pago. Este monto no es reembolsable y cubre el soporte técnico, licencia de software y gestión de datos.</p>

              <p className="mb-4">3. COMODATO DE EQUIPO (TABLET)<br/>TAD entrega una Tablet y accesorios en calidad de préstamo gratuito (Comodato).<br/><strong>Valoración:</strong> Las partes valoran el equipo en RD$6,000.00.<br/><strong>Responsabilidad:</strong> El Conductor reconoce que cualquier pérdida, robo o daño irreparable le obliga a indemnizar a TAD con el valor de reposición (RD$6,000.00), suma que TAD podrá compensar de los créditos acumulados por el conductor.</p>

              <p className="mb-4">4. ESQUEMA DE COMPENSACIÓN (REVENUE SHARE)<br/>El Conductor no recibe un sueldo, sino beneficios basados exclusivamente en:<br/><strong>Por Transmisión:</strong> El pago de RD$500.00 mensuales por cada anuncio comercial que sea efectivamente transmitido y validado por el software de auditoría de TAD en su unidad.<br/><strong>Por Referimiento de Anunciantes:</strong> El Conductor recibirá un bono único de RD$500.00 por cada nuevo anunciante que contrate los servicios de TAD bajo su referimiento directo, liquidable una vez el anunciante realice su primer pago.</p>
              
              <p className="mb-4">5. TECNOLOGÍA DE MONITOREO Y BLOQUEO<br/>El Conductor acepta que la Tablet cuenta con un sistema de bloqueo remoto (Kill-Switch) que se activará en caso de:<br/>- Incumplimiento de las normas de uso de software.<br/>- Falta de conexión reportada por más de 48 horas sin aviso previo.<br/>- Expiración de la membresía anual sin renovación.</p>
              
              <p className="mb-8">6. ACEPTACIÓN DIGITAL<br/>Al marcar la casilla "Acepto los Términos y Condiciones", el Conductor otorga su consentimiento electrónico con plena validez legal según la Ley 126-02.</p>

              <div className="border-t border-zinc-800 my-6"></div>

              <h3 className="text-white text-lg mb-4 font-sans">POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS (TAD)</h3>
              <p className="mb-4 text-zinc-500 italic">Última actualización: 3 de abril de 2026</p>
              
              <p className="mb-4">1. RESPONSABLE DEL TRATAMIENTO<br/>TADTaxi Advertising (en adelante, "TAD"), con domicilio en Santiago de los Caballeros, República Dominicana, es la entidad responsable del tratamiento de sus datos personales recolectados a través de nuestra aplicación y dispositivos de hardware.</p>

              <p className="mb-4">2. DATOS QUE RECOLECTAMOS<br/>Al utilizar nuestra plataforma, recolectamos:<br/>- Datos de Identidad: Nombre, cédula de identidad y contacto.<br/>- Datos del Vehículo: Placa, modelo y registros de seguro.<br/>- Datos de Ubicación (Geolocalización): Recolectamos la ubicación exacta de su unidad en tiempo real mediante GPS.<br/>- Datos de Telemetría: Estado de conexión del dispositivo, tiempo de encendido y registros de reproducción de anuncios.</p>
              
              <p className="mb-4">3. FINALIDAD DEL RASTREO DE UBICACIÓN<br/>La recolección de su ubicación es esencial para la ejecución del contrato de servicios y se utiliza exclusivamente para:<br/>- Validación de Pauta: Confirmar a los anunciantes que sus anuncios fueron reproducidos en las zonas geográficas contratadas.<br/>- Cálculo de Compensación: Generar los reportes de transmisión que permiten el pago de los RD$500.00 por anuncio activo y bonos de referidos.<br/>- Seguridad del Equipo: Monitorear la ubicación del hardware entregado en comodato para prevenir robos o usos no autorizados.<br/>- Mapas de Calor (Heatmaps): Optimizar la distribución de la publicidad en la ciudad.</p>
              
              <p className="mb-4">4. USO DE LA UBICACIÓN EN SEGUNDO PLANO<br/>La aplicación recolectará datos de ubicación incluso cuando la aplicación esté cerrada o no esté en uso, siempre que el dispositivo Tablet esté encendido y vinculado a su cuenta. Esto es necesario para garantizar que la pauta publicitaria se registre correctamente durante toda su jornada de operación.</p>
              
              <p className="mb-4">5. COMPARTICIÓN DE DATOS CON TERCEROS<br/>TAD no vende su información personal a terceros. Sin embargo, compartimos datos agregados y anonimizados con nuestros anunciantes (ejemplo: "Su anuncio se vio 100 veces en la Av. 27 de Febrero"). Su identidad personal nunca es revelada a los anunciantes sin su consentimiento expreso.</p>
              
              <p className="mb-4">6. SEGURIDAD Y ALMACENAMIENTO<br/>Sus datos se almacenan en servidores seguros con cifrado de grado industrial. Cumplimos con los estándares de seguridad física y digital para evitar el acceso no autorizado, la pérdida o alteración de su información, conforme a la Ley 172-13.</p>
              
              <p className="mb-4">7. DERECHOS DEL TITULAR (ARCO)<br/>Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos. No obstante, dado que el rastreo de ubicación es un requisito técnico indispensable para la plataforma, la revocación del consentimiento para la geolocalización resultará en la terminación inmediata del servicio y la obligación de devolver el equipo en comodato.</p>
              
              <p className="mb-12">8. CONSENTIMIENTO<br/>Al aceptar estas políticas en nuestra plataforma web o aplicación, usted otorga su consentimiento libre, expreso e informado para el tratamiento de sus datos personales y de ubicación bajo los términos aquí descritos.</p>
              
              <div className="text-center text-zinc-600 border-t border-zinc-800 pt-6">-- FIN DEL DOCUMENTO --</div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6">
              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${hasScrolledToBottom ? 'text-green-500' : 'text-zinc-600'}`} />
              <p className="text-sm">
                He leído y acepto el Acuerdo de Prestación de Servicios, el Comodato y la Política de Tratamiento de Datos.
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
