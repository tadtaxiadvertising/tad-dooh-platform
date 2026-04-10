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

// Log environment state on boot
console.log('--- Startup Config ---');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port Configured: ${PORT}`);
console.log(`CPUs available: ${os.cpus().length}`);
console.log('----------------------');


app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>TAD Remotion | Video Generator</title>
        <style>
          body { 
            font-family: 'Inter', system-ui, sans-serif; 
            background: #0a0a0b; 
            color: white; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 24px;
            text-align: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          }
          .status {
            color: #10b981;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 10px;
          }
          .dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
          h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
          p { color: #8e8e93; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="status"><div class="dot"></div> ONLINE</div>
          <h1>TAD Remotion Engine</h1>
          <p>Worker v1.0.0 is ready for rendering.</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.post('/api/render', async (req, res) => {
  try {
    const { campaignId, props } = req.body;

    if (!campaignId || !props) {
      return res.status(400).json({ error: 'campaignId and props are required' });
    }

    console.log(`🎬 Comenzando renderizado para campaña: ${campaignId}`);

    // Intentar encontrar el template en src (desarrollo) o en dist/src (si tsc movió la estructura) o relativo al dist
    let entryPoint = path.resolve(__dirname, 'templates', 'index.js');
    
    // Si estamos en dist, buscamos el archivo compilado o el original en src
    if (!fs.existsSync(entryPoint)) {
      entryPoint = path.resolve(__dirname, '..', 'src', 'templates', 'index.tsx');
    }

    console.log(`🔍 Usando entrypoint: ${entryPoint}`);
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
