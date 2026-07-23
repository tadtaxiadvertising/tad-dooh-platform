import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { runPipeline } from './skill/pipeline/orchestrator';

// Load .env from the app directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// --- AI Architect Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8000', 10);

app.use(cors());
app.use(express.json());

let cachedBundleUrl: string | null = null;

// Log environment state on boot
console.log('--- Startup Config ---');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port Configured: ${PORT}`);
console.log(`CPUs available: ${os.cpus().length}`);
console.log('----------------------');

// --- Periodic Cleanup Task ---
// Clean tmp video folder every 30 minutes to save VPS disk space
setInterval(() => {
  const tmpDir = path.join(os.tmpdir(), 'tad-videos');
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    const now = Date.now();
    files.forEach((file) => {
      const filePath = path.join(tmpDir, file);
      const stats = fs.statSync(filePath);
      // Delete if older than 10 minutes
      if (now - stats.mtimeMs > 10 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });
  }
}, 30 * 60 * 1000);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TAD Remotion | Control Center</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg: #030303;
            --card-bg: rgba(20, 20, 22, 0.7);
            --border: rgba(255, 255, 255, 0.08);
            --accent: #e51636;
            --accent-glow: rgba(229, 22, 54, 0.3);
            --success: #10b981;
            --text-main: #fcfcfc;
            --text-dim: #94a3b8;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg);
            background-image:
              radial-gradient(circle at 20% 20%, rgba(229, 22, 54, 0.05) 0%, transparent 40%),
              radial-gradient(circle at 80% 80%, rgba(229, 22, 54, 0.05) 0%, transparent 40%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
          }
          .container { width: 100%; max-width: 900px; animation: fadeIn 0.8s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
          .logo-group h1 {
            font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -1px;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          }
          .status-badge {
            background: rgba(16, 185, 129, 0.1); color: var(--success);
            padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 600;
            display: flex; align-items: center; gap: 8px; border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse 2s infinite; }
          @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
          .card {
            background: var(--card-bg); border: 1px solid var(--border);
            border-radius: 24px; padding: 32px;
            backdrop-filter: blur(20px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .card-title { font-size: 18px; font-weight: 600; margin-bottom: 24px; color: var(--text-main); display: flex; align-items: center; gap: 12px; }
          .stats-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
          .stats-row span:first-child { color: var(--text-dim); font-size: 14px; }
          .stats-row span:last-child { font-weight: 500; font-size: 14px; color: #fff; }
          .form-group { margin-bottom: 16px; }
          .form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px; }
          .form-group input { width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); padding: 12px 16px; border-radius: 12px; color: white; font-family: inherit; transition: all 0.3s; }
          .form-group input:focus { border-color: var(--accent); outline: none; background: rgba(255, 255, 255, 0.08); }
          .btn { width: 100%; background: var(--accent); color: white; border: none; padding: 16px; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 20px var(--accent-glow); margin-top: 8px; }
          .btn:hover { transform: translateY(-2px); box-shadow: 0 15px 30px var(--accent-glow); filter: brightness(1.1); }
          .btn:active { transform: translateY(0); }
          .btn:disabled { background: #334155; box-shadow: none; cursor: not-allowed; opacity: 0.5; }
          #renderResult { margin-top: 24px; padding: 16px; border-radius: 12px; background: rgba(0, 0, 0, 0.3); display: none; text-align: center; }
          .loader { display: none; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-group">
              <h1>TAD Remotion Engine</h1>
            </div>
            <div class="status-badge">
              <div class="dot"></div>
              SYSTEM ONLINE
            </div>
          </div>
          <div class="grid">
            <div class="card">
              <div class="card-title">🚀 Sistema & Recursos</div>
              <div class="stats-row"><span>Versión Engine</span><span>v1.0.0 (Remotion 4.0)</span></div>
              <div class="stats-row"><span>Runtime</span><span>Node.js ${process.version}</span></div>
              <div class="stats-row"><span>Cores Virtuales</span><span>${os.cpus().length} vCPUs</span></div>
              <div class="stats-row"><span>Puerto Servicio</span><span>${process.env.PORT || 8000}</span></div>
              <div class="stats-row"><span>Environment</span><span>${process.env.NODE_ENV || 'development'}</span></div>
              <div style="margin-top: 32px;">
                <p style="color: var(--text-dim); font-size: 13px; line-height: 1.6;">
                  Este microservicio se encarga de la generación bajo demanda de creatividades en video para la flota TAD.
                  Optimizado para renderizado en contenedores Bullseye.
                </p>
              </div>
            </div>
            <div class="card">
              <div class="card-title">🎬 Render Tester</div>
              <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                <h3 style="color: #a78bfa; margin-top: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">✨ AI MAGIC ARCHITECT</h3>
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">Escribe lo que quieres y la IA diseñará el anuncio por ti.</p>
                <div class="form-group" style="margin-bottom: 10px;">
                  <textarea id="aiPrompt" placeholder="Ej: Un anuncio elegante para una joyería con colores dorados..." style="width: 100%; min-height: 80px; background: rgba(0,0,0,0.3); border: 1px solid #334155; border-radius: 8px; color: white; padding: 10px; font-family: inherit;"></textarea>
                </div>
                <button type="button" id="aiBtn" class="btn" style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); width: auto; padding: 10px 20px; font-size: 13px;">
                  <span id="aiBtnText">DISEÑAR CON IA</span>
                  <div class="loader" id="aiLoader" style="width: 15px; height: 15px; border-width: 2px;"></div>
                </button>
              </div>
              <form id="renderForm">
                <div class="form-group"><label>ID de Campaña</label><input type="text" id="campaignId" value="TEST-SERVICE" required></div>
                <div class="form-group"><label>Mensaje Principal</label><input type="text" id="primaryText" placeholder="Ej: Pizza Hut Oferta" required></div>
                <div class="form-group"><label>Color de Marca</label><input type="color" id="brandColor" value="#e51636" style="height: 45px; cursor: pointer; padding: 4px;"></div>
                <div class="form-group"><label>Background Video URL (Opcional - MP4)</label><input type="url" id="bgUrl" placeholder="https://dominio.com/video.mp4"></div>
                <div class="form-group"><label>Logo URL (Opcional)</label><input type="url" id="logoUrl" placeholder="https://sudominio.com/logo.png"></div>
                <button type="submit" class="btn" id="submitBtn">
                  <span id="btnText">GENERAR VIDEO TEST</span>
                  <div class="loader" id="loader"></div>
                </button>
              </form>
              <div id="renderResult">
                <p id="resultMsg" style="font-size: 14px; margin-bottom: 8px;"></p>
                <div id="downloadContainer"></div>
              </div>
            </div>
          </div>
        </div>
        <script>
          const form = document.getElementById('renderForm');
          const btn = document.getElementById('submitBtn');
          const btnText = document.getElementById('btnText');
          const loader = document.getElementById('loader');
          const result = document.getElementById('renderResult');
          const resultMsg = document.getElementById('resultMsg');
          const downloadContainer = document.getElementById('downloadContainer');
          const aiBtn = document.getElementById('aiBtn');
          const aiPrompt = document.getElementById('aiPrompt');
          const aiBtnText = document.getElementById('aiBtnText');
          const aiLoader = document.getElementById('aiLoader');

          aiBtn.onclick = async () => {
            const prompt = aiPrompt.value;
            if (!prompt) return alert('Por favor, escribe un prompt para la IA');
            aiBtn.disabled = true;
            aiBtnText.style.display = 'none';
            aiLoader.style.display = 'block';
            try {
              const res = await fetch('/api/ai-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
              const data = await res.json();
              if (data.error) throw new Error(data.error);
              document.getElementById('primaryText').value = data.primaryText;
              document.getElementById('brandColor').value = data.brandColor;
              if (data.bgUrl) document.getElementById('bgUrl').value = data.bgUrl;
              alert('✨ ¡Diseño generado por IA! Revisa los campos y presiona GENERAR VIDEO.');
            } catch (err) {
              alert('Error IA: ' + err.message);
            } finally {
              aiBtn.disabled = false;
              aiBtnText.style.display = 'block';
              aiLoader.style.display = 'none';
            }
          };

          form.onsubmit = async (e) => {
            e.preventDefault();
            btn.disabled = true;
            btnText.style.display = 'none';
            loader.style.display = 'block';
            result.style.display = 'none';
            const payload = {
              campaignId: document.getElementById('campaignId').value,
              props: {
                logoUrl: document.getElementById('logoUrl').value,
                bgUrl: document.getElementById('bgUrl').value,
                brandColor: document.getElementById('brandColor').value,
                primaryText: document.getElementById('primaryText').value,
                secondaryText: 'Generado desde Control Center'
              }
            };
            try {
              const response = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!response.ok) throw new Error('Render fallido');
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              result.style.display = 'block';
              result.style.border = '1px solid var(--success)';
              resultMsg.innerHTML = '<span style="color: var(--success)">✅ Renderizado Exitoso</span>';
              downloadContainer.innerHTML = \`<a href="\${url}" download="ad-\${payload.campaignId}.mp4" class="btn" style="display: block; text-decoration: none; margin-top: 10px; background: #334155; box-shadow: none;">DESCARGAR RESULTADO</a>\`;
            } catch (err) {
              result.style.display = 'block';
              result.style.border = '1px solid var(--accent)';
              resultMsg.innerHTML = '<span style="color: var(--accent)">❌ Error en el servidor</span>';
            } finally {
              btn.disabled = false;
              btnText.style.display = 'block';
              loader.style.display = 'none';
            }
          };
        </script>
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

    // Find entry point for Remotion composition
    let entryPoint = path.resolve(__dirname, 'templates', 'index.js');
    if (!fs.existsSync(entryPoint)) {
      entryPoint = path.resolve(__dirname, '..', 'src', 'templates', 'index.tsx');
    }

    console.log(`🔍 Usando entrypoint: ${entryPoint}`);

    const outputDir = path.join(os.tmpdir(), 'tad-videos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputLocation = path.join(outputDir, `ad-${campaignId}-${Date.now()}.mp4`);

    // 1. Bundle the composition only once
    if (!cachedBundleUrl) {
      console.log('📦 Compilando template de Remotion (esto ocurre solo una vez)...');
      cachedBundleUrl = await bundle(entryPoint);
    }
    const bundled = cachedBundleUrl;

    // 2. Select the composition
    const composition = await selectComposition({
      serveUrl: bundled,
      id: 'DynamicAd',
      inputProps: props,
    });

    // 3. Render the media
    const startTime = Date.now();
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation,
      inputProps: props,
      videoBitrate: '1500k',
      pixelFormat: 'yuv420p',
      concurrency: parseInt(process.env.REMOTION_CONCURRENCY || '1'),
      imageFormat: 'jpeg',
      jpegQuality: 80,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Renderizado completado en ${duration}s: ${outputLocation}. Enviando archivo...`);

    // 4. Send the file back
    res.download(outputLocation, `ad-${campaignId}.mp4`, (err) => {
      if (err) {
        console.error('Error enviando el archivo:', err);
      }
      if (fs.existsSync(outputLocation)) {
        fs.unlinkSync(outputLocation);
      }
    });
  } catch (err: any) {
    console.error('❌ Fallo en generación de video:', err);
    res.status(500).json({ error: 'Render failed', details: err.message });
  }
});

app.post('/api/ai-generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
    }

    const systemPrompt = `Eres un arquitecto creativo de anuncios DOOH (Digital Out Of Home) para TAD.
Tu tarea es recibir un prompt de un usuario y generar la configuración JSON para un anuncio de 10 segundos.
Debe ser visualmente impactante y profesional.

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "primaryText": "Texto principal del anuncio (máx 30 caracteres)",
  "brandColor": "Color hexadecimal principal para la marca (formato #RRGGBB)",
  "secondaryText": "Texto secundario opcional",
  "bgUrl": "URL de video de fondo o null si no aplica"
}

NO incluyas markdown, ni explicaciones, solo el JSON.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: prompt },
    ]);
    const response = result.response;
    let text = response.text();

    // Strip markdown code fences if present
    text = text.replace(/\\`\\`\\`json?\\n?/gi, '').replace(/\\`\\`\\`\\n?/g, '').trim();

    const config = JSON.parse(text);
    res.json(config);
  } catch (err: any) {
    console.error('❌ Error en AI Architect:', err);
    res.status(500).json({ error: 'AI generation failed', details: err.message });
  }
});

// ─── Pipeline endpoint: generate video from theme ──────────────────────────

app.post('/api/pipeline', async (req, res) => {
  try {
    const { theme, platform, durationSec, tone, brand } = req.body;

    console.log(`🎬 Pipeline solicitado: theme=${theme || 'why-diesel'}, platform=${platform || 'tiktok'}`);

    // Run the full pipeline
    const project = await runPipeline({
      theme: theme || 'why-diesel',
      platform: platform || 'tiktok',
      durationSec: durationSec || 30,
      tone: tone || 'persuasive',
      brand,
    });

    console.log(`✅ Pipeline completado: ${project.scenes.length} escenas, ${project.totalDurationSec}s`);

    res.json({
      success: true,
      projectId: project.projectId,
      headline: project.headline,
      scenes: project.scenes.map((s: any) => ({
        id: s.id,
        narrativeFunction: s.narrativeFunction,
        durationSec: s.durationSec,
        component: s.motionProfile?.component,
        onScreenText: s.onScreenText,
      })),
      citations: project.citations,
      qaReport: project.qaReport,
    });
  } catch (err: any) {
    console.error('❌ Pipeline error:', err);
    res.status(500).json({ error: 'Pipeline failed', details: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🎬 TAD Remotion Engine corriendo en puerto ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Red:     http://${getLocalIP()}:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
});

/** Get the local network IP for display */
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        return info.address;
      }
    }
  }
  return '0.0.0.0';
}

export { app };