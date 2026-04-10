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

          .container {
            width: 100%;
            max-width: 900px;
            animation: fadeIn 0.8s ease-out;
          }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
          }

          .logo-group h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -1px;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .status-badge {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
            padding: 8px 16px;
            border-radius: 99px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(16, 185, 129, 0.2);
          }

          .dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse 2s infinite; }
          @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }

          @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }

          .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 32px;
            backdrop-filter: blur(20px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }

          .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 24px;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .stats-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid var(--border);
          }
          .stats-row span:first-child { color: var(--text-dim); font-size: 14px; }
          .stats-row span:last-child { font-weight: 500; font-size: 14px; color: #fff; }

          .form-group { margin-bottom: 16px; }
          .form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px; }
          .form-group input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            padding: 12px 16px;
            border-radius: 12px;
            color: white;
            font-family: inherit;
            transition: all 0.3s;
          }
          .form-group input:focus { border-color: var(--accent); outline: none; background: rgba(255, 255, 255, 0.08); }

          .btn {
            width: 100%;
            background: var(--accent);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 10px 20px var(--accent-glow);
            margin-top: 8px;
          }
          .btn:hover { transform: translateY(-2px); box-shadow: 0 15px 30px var(--accent-glow); filter: brightness(1.1); }
          .btn:active { transform: translateY(0); }
          .btn:disabled { background: #334155; box-shadow: none; cursor: not-allowed; opacity: 0.5; }

          #renderResult {
            margin-top: 24px;
            padding: 16px;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.3);
            display: none;
            text-align: center;
          }

          .loader {
            display: none;
            width: 20px; height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
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
              <div class="stats-row">
                <span>Versión Engine</span>
                <span>v1.0.0 (Remotion 4.0)</span>
              </div>
              <div class="stats-row">
                <span>Runtime</span>
                <span>Node.js ${process.version}</span>
              </div>
              <div class="stats-row">
                <span>Cores Virtuales</span>
                <span>${os.cpus().length} vCPUs</span>
              </div>
              <div class="stats-row">
                <span>Puerto Servicio</span>
                <span>${process.env.PORT || 8000}</span>
              </div>
              <div class="stats-row">
                <span>Environment</span>
                <span>${process.env.NODE_ENV || 'development'}</span>
              </div>

              <div style="margin-top: 32px;">
                <p style="color: var(--text-dim); font-size: 13px; line-height: 1.6;">
                  Este microservicio se encarga de la generación bajo demanda de creatividades en video para la flota TAD. 
                  Optimizado para renderizado en contenedores Bullseye.
                </p>
              </div>
            </div>

            <div class="card">
              <div class="card-title">🎬 Render Tester</div>
              <form id="renderForm">
                <div class="form-group">
                  <label>ID de Campaña</label>
                  <input type="text" id="campaignId" value="TEST-SERVICE" required>
                </div>
                <div class="form-group">
                  <label>Mensaje Principal</label>
                  <input type="text" id="primaryText" placeholder="Ej: Pizza Hut Oferta" required>
                </div>
                <div class="form-group">
                  <label>Color de Marca</label>
                  <input type="color" id="brandColor" value="#e51636" style="height: 45px; cursor: pointer; padding: 4px;">
                </div>
                <div class="form-group">
                  <label>Logo URL (Opcional)</label>
                  <input type="url" id="logoUrl" placeholder="https://..." value="https://tadtaxi.com/logo.png">
                </div>

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
                brandColor: document.getElementById('brandColor').value,
                primaryText: document.getElementById('primaryText').value,
                secondaryText: 'Generado desde Control Center'
              }
            };

            try {
              const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (!response.ok) throw new Error('Render fallido');

              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              
              result.style.display = 'block';
              result.style.border = '1px solid var(--success)';
              resultMsg.innerHTML = '<span style="color: var(--success)">✅ Renderizado Exitoso</span>';
              
              downloadContainer.innerHTML = \`
                <a href="\${url}" download="ad-\${payload.campaignId}.mp4" class="btn" style="display: block; text-decoration: none; margin-top: 10px; background: #334155; box-shadow: none;">
                  DESCARGAR RESULTADO
                </a>
              \`;
              
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
