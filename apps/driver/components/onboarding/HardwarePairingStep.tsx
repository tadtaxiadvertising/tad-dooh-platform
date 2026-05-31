import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCcw, Smartphone } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export const HardwarePairingStep = ({ onNext, onBack }: Props) => {
  const [token, setToken] = useState('generating...');
  const [isError, setIsError] = useState(false);

  // Mock token generation (In reality, fetch from API)
  useEffect(() => {
    const fetchToken = async () => {
      // Mock API call to get 5-min JWT
      setTimeout(() => {
        setToken(`tad-pairing-${Math.random().toString(36).substring(7)}`);
      }, 1000);
    };
    fetchToken();
  }, []);

  const triggerError = () => {
    setIsError(true);
    // Haptic feedback (Vibration API)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    // Reset error state after animation
    setTimeout(() => {
      setIsError(false);
      // Regenerate token on error
      setToken(`tad-pairing-${Math.random().toString(36).substring(7)}`);
    }, 800);
  };

  return (
    <motion.div
      key="step2-driver"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Emparejar Tablet</h2>
        <p className="text-gray-400">Escanea este código QR con la app de TAD en la tablet del vehículo.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div 
          animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={`p-6 rounded-3xl bg-white flex items-center justify-center relative overflow-hidden ${isError ? 'ring-4 ring-red-500' : ''}`}
        >
          {token === 'generating...' ? (
            <div className="w-48 h-48 flex items-center justify-center">
              <RefreshCcw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="relative group">
              <QRCodeSVG 
                value={token} 
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#0f172a" // Slate 900
              />
              <motion.div 
                className="absolute inset-0 bg-emerald-500/10 pointer-events-none"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          )}
        </motion.div>
        
        <div className="mt-8 flex items-center space-x-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full">
          <Smartphone className="w-5 h-5" />
          <span className="text-sm font-medium">Token expira en 04:59</span>
        </div>

        {/* Development Helper Button */}
        <button 
          onClick={triggerError}
          className="mt-4 text-xs text-gray-500 underline"
        >
          Simular Error de Escaneo
        </button>
      </div>

      <div className="pt-8 mt-auto flex justify-between">
        <button 
          type="button"
          onClick={onBack}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
        >
          Atrás
        </button>
        <button 
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
        >
          Simular Éxito
        </button>
      </div>
    </motion.div>
  );
};
