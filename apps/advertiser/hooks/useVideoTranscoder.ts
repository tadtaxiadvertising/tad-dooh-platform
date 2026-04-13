import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type TranscoderState = 'idle' | 'loading_library' | 'ready' | 'transcoding' | 'error' | 'success';

interface UseVideoTranscoderReturn {
  state: TranscoderState;
  progress: number;
  transcode: (file: File) => Promise<Blob>;
  errorMessage: string | null;
}

export function useVideoTranscoder(): UseVideoTranscoderReturn {
  const [state, setState] = useState<TranscoderState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg>(null);

  const load = useCallback(async () => {
    setState('loading_library');
    
    if (ffmpegRef.current === null) {
      // @ts-ignore
      ffmpegRef.current = new FFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    
    // Evitar cargar si ya está cargado
    if (ffmpeg.loaded) {
      setState('ready');
      return;
    }

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setState('ready');
    } catch (err) {
      console.error('Error cargando FFmpeg:', err);
      setErrorMessage('No se pudo cargar el motor de procesamiento de video. Asegúrate de usar un navegador compatible con WebAssembly.');
      setState('error');
    }
  }, []);

  const transcode = useCallback(async (file: File): Promise<Blob> => {
    if (state !== 'ready') {
      await load(); // Intentar cargar si no estaba listo
      if (ffmpegRef.current?.loaded === false) {
        throw new Error('FFmpeg no pudo cargarse.');
      }
    }
    
    const ffmpeg = ffmpegRef.current!;
    setState('transcoding');
    setProgress(0);
    setErrorMessage(null);

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    try {
      const inputName = `input_${file.name.replace(/\s+/g, '_')}`;
      const outputName = `output_${Date.now()}.mp4`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Optimizaciones Inteligentes:
      // - vcodec libx264: Compatibilidad universal
      // - crf 28: Constant Rate Factor (0-51). 28 es el punto dulce para mantener calidad visual bajando el peso drásticamente en lugar de forzar un bitrate fijo alto.
      // - vf scale='min(1920,iw)':-2 : Solo reduce si el ancho original es mayor a 1920, pero NO lo estira si es más pequeño. Mantiene relación de aspecto válida (múltiplo de 2).
      // - preset superfast: Gran velocidad de transcodificación (Ideal de nuevo para WebAssembly)
      // - movflags +faststart: Reorganiza metadata para que inicie la reproducción del video en web sin descargarse por completo.
      await ffmpeg.exec([
        '-i', inputName,
        '-vcodec', 'libx264',
        '-crf', '28',
        '-vf', "scale='min(1920,iw)':-2",
        '-preset', 'superfast',
        '-movflags', '+faststart',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });

      // Limpieza de memoria (importante para evitar OOM en cliente)
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      // Removemos el listener de progreso
      ffmpeg.off('progress', () => {});

      setState('success');
      setProgress(100);
      return blob;
    } catch (err) {
      console.error('Error en transcode:', err);
      setState('error');
      setErrorMessage('Ocurrió un error al procesar el video. Revisa el formato o tamaño.');
      throw err;
    }
  }, [state, load]);

  return { state, progress, transcode, errorMessage };
}
