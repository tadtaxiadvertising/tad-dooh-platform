import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function testRender() {
  const entryPoint = path.resolve(__dirname, '..', 'src', 'modules', 'campaign', 'templates', 'index.tsx');
  const outputLocation = path.join(os.tmpdir(), `test-ad-${Date.now()}.mp4`);

  const props = {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Pizza_Hut_logo.svg',
    brandColor: '#e51636',
    primaryText: 'TEST ADVERTISING TAD',
    secondaryText: 'SANTIAGO - PILOTO v4.5',
  };

  console.log('🚀 Starting Test Render...');
  console.log(`📍 Entry Point: ${entryPoint}`);
  
  try {
    const bundled = await bundle(entryPoint);
    console.log('📦 Bundle complete.');

    const composition = await selectComposition({
      serveUrl: bundled,
      id: 'DynamicAd',
      inputProps: props,
    });
    console.log('🎬 Composition selected.');

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation,
      inputProps: props,
      videoBitrate: '2000k',
      pixelFormat: 'yuv420p',
    });

    console.log(`✅ Success! Video rendered at: ${outputLocation}`);
    console.log(`📏 File size: ${(fs.statSync(outputLocation).size / 1024 / 1024).toFixed(2)} MB`);
  } catch (e) {
    console.error('❌ Render failed:', e);
  }
}

testRender();
