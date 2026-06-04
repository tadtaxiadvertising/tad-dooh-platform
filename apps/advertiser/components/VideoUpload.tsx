import React, { useRef } from 'react';
import { CloudUpload } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete?: (media: any) => void;
}

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Placeholder: in production this would upload to Supabase Storage
    const fakeMedia = {
      id: `mock-${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      url: `https://storage.supabase.co/tad-media/${file.name}`,
    };

    if (onUploadComplete) {
      onUploadComplete(fakeMedia);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#fad400]/30 transition-all group min-h-[200px]"
    >
      <CloudUpload className="w-10 h-10 text-zinc-500 group-hover:text-[#fad400] transition-colors mb-4" />
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
        Drag & Drop or Click to Upload
      </p>
      <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-2">
        MP4, JPG, PNG — Max 50MB
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