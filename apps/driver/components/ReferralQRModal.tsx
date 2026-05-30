import React from 'react';
// Assuming qrcode.react isn't guaranteed, we can use a simpler approach or the user will need to install it. 
// We will use an img tag pointing to a QR code generator API as fallback to ensure it works, but usually a package is preferred.
// Let's use a public API for zero dependencies.

interface ReferralQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralUrl: string;
}

export const ReferralQRModal: React.FC<ReferralQRModalProps> = ({ isOpen, onClose, referralUrl }) => {
  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Invita a un Anunciante</h2>
        
        <div className="bg-white p-4 rounded-lg mb-6">
          <img src={qrImageUrl} alt="Referral QR Code" width={200} height={200} className="w-[200px] h-[200px]" />
        </div>
        
        <p className="text-zinc-400 text-center mb-6 text-sm">
          Muestra este código para que el anunciante se registre al instante.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
