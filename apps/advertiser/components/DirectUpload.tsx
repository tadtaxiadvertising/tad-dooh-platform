import React, { useRef } from 'react';
import { CloudUpload } from 'lucide-react';

interface DirectUploadProps {
  onSuccess?: (url: string, filename: string) => void;
}

export function DirectUpload({ onSuccess }: DirectUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Placeholder: in production this would upload to Supabase Storage
    const fakeUrl = `https://storage.supabase.co/tad-media/${file.name}`;
    if (onSuccess) {
      onSuccess(fakeUrl, file.name);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#fad400]/30 transition-all group"
    >
      <CloudUpload className="w-8 h-8 text-zinc-500 group-hover:text-[#fad400] transition-colors mb-4" />
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
        Upload Content
      </p>
      <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1">
        Direct upload module pending full implementation
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}