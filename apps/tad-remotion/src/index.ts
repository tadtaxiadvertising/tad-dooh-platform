import express from 'express';
import cors from 'cors';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.post('/api/render', async (req, res) => {
  try {
    const { campaignId, props } = req.body;

    if (!campaignId || !props) {
      return res.status(400).json({ error: 'campaignId and props are required' });
    }

    console.log(`🎬 Comenzando renderizado para campaña: ${campaignId}`);

    const entryPoint = path.resolve(__dirname, 'templates', 'index.tsx');
    const outputDir = path.join(os.tmpdir(), 'tad-videos');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputLocation = path.join(outputDir, `ad-${campaignId}-${Date.now()}.mp4`);

    // 1. Bundle the composition
    const bundled = await bundle(entryPoint);

    // 2. Select the composition
    const composition = await selectComposition({
      serveUrl: bundled,
      id: 'DynamicAd',
      inputProps: props,
    });

    // 3. Render the media
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation,
      inputProps: props,
      videoBitrate: '2000k',
      pixelFormat: 'yuv420p',
      concurrency: os.cpus().length, // Usar todos los cores
    });

    console.log(`✅ Renderizado completado: ${outputLocation}. Enviando archivo...`);

    // 4. Send the file back to the requestor
    res.download(outputLocation, `ad-${campaignId}.mp4`, (err) => {
      if (err) {
        console.error('Error enviando el archivo:', err);
      }
      
      // Cleanup
      if (fs.existsSync(outputLocation)) {
        fs.unlinkSync(outputLocation);
      }
    });

  } catch (err: any) {
    console.error(`❌ Fallo en generación de video:`, err);
    res.status(500).json({ error: 'Render failed', details: err.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`🚀 TAD Remotion Service escuchando en el puerto ${PORT}`);
});
