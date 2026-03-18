import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Film, Users, Zap, CheckCircle2, AlertCircle, Target } from 'lucide-react';
import { getDrivers, uploadCampaignMedia, assignDriversToCampaign } from '../services/api';
import clsx from 'clsx';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
}

export const CampaignModal = React.memo(function CampaignModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  campaignName,
  onSuccess 
}: CampaignModalProps) {
  const [drivers, setDrivers] = useState<{ id: string; fullName: string; taxiPlate: string }[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [targetAll, setTargetAll] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Segmentation, 3: Success
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      getDrivers().then(setDrivers).catch(console.error);
      setStep(1);
      setFile(null);
      setPreviewUrl(null);
      setSelectedDrivers([]);
      setTargetAll(true);
      setError(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadCampaignMedia(campaignId, file);
      setStep(2); // Go to segmentation
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response: { data: { message: string } } }).response.data.message 
        : 'Error al procesar la solicitud';
      setError(errorMessage || 'Error al procesar la solicitud');
    } finally {
      setUploading(false);
    }
  };

  const handleFinalize = async () => {
    setUploading(true);
    try {
      await assignDriversToCampaign(campaignId, {
        driverIds: selectedDrivers,
        targetAll: targetAll
      });
      setStep(3); // Success
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error(err);
      setError('Error al asignar segmentación');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Zap className="w-6 h-6 text-tad-yellow" />
              Gestión de <span className="text-tad-yellow">Campaña</span>
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">{campaignName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400 hover:text-white"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 min-h-[400px]">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div 
                className={clsx(
                  "relative group aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden",
                  previewUrl ? "border-tad-yellow/40" : "border-white/10 hover:border-tad-yellow/40 bg-white/[0.02] hover:bg-tad-yellow/[0.02]"
                )}
              >
                {previewUrl ? (
                  <>
                    <video 
                      ref={videoRef}
                      src={previewUrl} 
                      className="w-full h-full object-cover"
                      controls
                    />
                    <button 
                      onClick={() => { setFile(null); setPreviewUrl(null); }}
                      className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur rounded-xl text-white hover:bg-red-500 transition-colors"
                      title="Eliminar archivo"
                      aria-label="Eliminar archivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-5 bg-tad-yellow/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                      <Film className="w-10 h-10 text-tad-yellow" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-lg">Suelta tu video aquí</p>
                      <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-black italic">MP4 o WEBM compatible (Máx 50MB)</p>
                    </div>
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      title="Seleccionar video de campaña"
                      aria-label="Seleccionar video de campaña"
                    />
                  </>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <button 
                disabled={!file || uploading}
                onClick={handleUpload}
                className="w-full py-5 bg-tad-yellow hover:bg-yellow-400 disabled:opacity-30 disabled:grayscale transition-all rounded-2xl text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(250,212,0,0.3)]"
              >
                {uploading ? (
                  <Zap className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {uploading ? 'Subiendo a Supabase...' : 'Subir Archivo'}
              </button>
            </div>
          )}

          {/* Step 2: Segmentation */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-4 p-6 bg-tad-yellow/5 border border-tad-yellow/20 rounded-3xl">
                <div className="p-3 bg-tad-yellow rounded-xl text-black">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tight italic">Segmentación de Distribución</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">¿Quién recibirá este contenido en su tablet?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div 
                  onClick={() => setTargetAll(true)}
                  className={clsx(
                    "p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                    targetAll ? "bg-tad-yellow/10 border-tad-yellow/40" : "bg-white/5 border-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", targetAll ? "bg-tad-yellow text-black" : "bg-zinc-900 text-zinc-500")}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold uppercase text-sm">Transmisión Global</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Todos los taxis activos de la red</p>
                    </div>
                  </div>
                  <div className={clsx("w-6 h-6 rounded-full border-2", targetAll ? "bg-tad-yellow border-tad-yellow" : "border-white/20")} />
                </div>

                <div 
                  onClick={() => setTargetAll(false)}
                  className={clsx(
                    "p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                    !targetAll ? "bg-tad-yellow/10 border-tad-yellow/40" : "bg-white/5 border-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", !targetAll ? "bg-tad-yellow text-black" : "bg-zinc-900 text-zinc-500")}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold uppercase text-sm">Selección Exclusiva</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Solo conductores seleccionados manualmente</p>
                    </div>
                  </div>
                  <div className={clsx("w-6 h-6 rounded-full border-2", !targetAll ? "bg-tad-yellow border-tad-yellow" : "border-white/20")} />
                </div>
              </div>

              {!targetAll && (
                <div className="space-y-3 max-height-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  <label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest pl-2">Lista de Conductores</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {drivers.map(driver => (
                      <div 
                        key={driver.id}
                        onClick={() => {
                          if (selectedDrivers.includes(driver.id)) {
                            setSelectedDrivers(selectedDrivers.filter(id => id !== driver.id));
                          } else {
                            setSelectedDrivers([...selectedDrivers, driver.id]);
                          }
                        }}
                        className={clsx(
                          "p-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-3",
                          selectedDrivers.includes(driver.id) ? "bg-white/10 border-tad-yellow/50 text-white" : "bg-white/5 border-white/5 text-zinc-500"
                        )}
                      >
                        <div className={clsx("w-4 h-4 rounded-md border shrink-0", selectedDrivers.includes(driver.id) ? "bg-tad-yellow border-tad-yellow" : "border-white/20")} />
                        <span className="truncate">{driver.fullName}</span>
                        <span className="text-[9px] opacity-70 ml-auto font-mono">{driver.taxiPlate || 'S/P'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                disabled={uploading || (!targetAll && selectedDrivers.length === 0)}
                onClick={handleFinalize}
                className="w-full py-5 bg-white text-black hover:bg-tad-yellow transition-all rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3"
              >
                {uploading ? <Zap className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Finalizar Despliegue
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-tad-yellow rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(250,212,0,0.5)]">
                <CheckCircle2 className="w-12 h-12 text-black" />
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tight">¡Misión Cumplida!</h3>
                <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px] max-w-sm">
                  El contenido ha sido procesado y asignado. Las tablets recibirán la señal en su próximo ciclo de sincronización.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="px-10 py-4 bg-zinc-900 hover:bg-tad-yellow text-zinc-500 hover:text-black transition-all rounded-2xl font-black uppercase tracking-widest text-xs border border-white/5 shadow-xl"
              >
                Cerrar Panel
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(250, 212, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(250, 212, 0, 0.4);
        }
      `}</style>
    </div>
  );
});
