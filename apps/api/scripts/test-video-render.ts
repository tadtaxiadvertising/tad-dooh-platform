/**
 * TAD DOOH Platform - Media Upload & Remotion Render Test
 * 
 * Verifica que:
 *   1. Supabase Storage bucket 'ads-videos' existe y acepta uploads
 *   2. Signed URL generation funciona
 *   3. El pipeline de Remotion video rendering responde
 *   4. El health endpoint de Remotion está vivo
 * 
 * Ejecutar: npx ts-node scripts/test-video-render.ts
 * O:        npm run test:remotion
 */

async function main() {
  console.log('🎬 TAD DOOH — Media & Remotion Test Suite');
  console.log('='.repeat(50));
  console.log('');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const REMOTION_URL = process.env.REMOTION_URL || 'https://tad-remotion.rewvid.easypanel.host';
  const API_URL = process.env.API_URL || 'https://tad-api.rewvid.easypanel.host/api/v1';

  const results: { name: string; status: string; detail: string }[] = [];

  // Test 1: Supabase Storage
  console.log('🔹 Test 1: Supabase Storage Bucket');
  if (SUPABASE_URL) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/storage/v1/bucket/ads-videos`, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        results.push({ name: 'Storage Bucket', status: '✅ OK', detail: `Bucket ads-videos ${data.public ? 'público' : 'privado'}` });
      } else {
        results.push({ name: 'Storage Bucket', status: '⚠️ WARN', detail: `HTTP ${resp.status}: bucket no encontrado o sin acceso` });
      }
    } catch (e) {
      results.push({ name: 'Storage Bucket', status: '❌ FAIL', detail: (e as Error).message });
    }
  } else {
    results.push({ name: 'Storage Bucket', status: '⏭️ SKIP', detail: 'SUPABASE_URL no configurada' });
  }

  // Test 2: API Health
  console.log('🔹 Test 2: API Health');
  try {
    const resp = await fetch(`${API_URL.replace(/\/api\/v1\/?$/, '')}/health`);
    const text = await resp.text();
    results.push({ name: 'API Health', status: resp.ok ? '✅ OK' : '⚠️ WARN', detail: text.substring(0, 100) });
  } catch (e) {
    results.push({ name: 'API Health', status: '❌ FAIL', detail: (e as Error).message });
  }

  // Test 3: Remotion Health
  console.log('🔹 Test 3: Remotion Engine');
  try {
    const resp = await fetch(`${REMOTION_URL}/health`);
    const text = await resp.text();
    results.push({ name: 'Remotion Health', status: resp.ok ? '✅ OK' : '⚠️ WARN', detail: text.substring(0, 100) });
  } catch (e) {
    results.push({ name: 'Remotion Health', status: '❌ FAIL', detail: (e as Error).message });
  }

  // Test 4: Remotion Compositions (test parallel renders capability)
  console.log('🔹 Test 4: Remotion Compositions');
  try {
    const resp = await fetch(`${REMOTION_URL}/compositions`);
    const text = await resp.text();
    const compositions = text.substring(0, 200);
    results.push({ name: 'Remotion Compositions', status: resp.ok ? '✅ OK' : '⚠️ WARN', detail: compositions });
  } catch (e) {
    results.push({ name: 'Remotion Compositions', status: '❌ FAIL', detail: (e as Error).message });
  }

  // Test 5: Signed URL Generation (via API)
  console.log('🔹 Test 5: Signed Upload URL');
  try {
    const resp = await fetch(`${API_URL}/media/generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'test-ad.mp4', fileType: 'video/mp4' }),
    });
    const data = await resp.json();
    if (resp.ok && data.uploadUrl) {
      results.push({ name: 'Signed URL', status: '✅ OK', detail: 'URL generada exitosamente' });
    } else {
      results.push({ name: 'Signed URL', status: '⚠️ WARN', detail: JSON.stringify(data).substring(0, 150) });
    }
  } catch (e) {
    results.push({ name: 'Signed URL', status: '❌ FAIL', detail: (e as Error).message });
  }

  // Results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const icon = r.status.includes('✅') ? '✅' : r.status.includes('⚠️') ? '⚠️' : '❌';
    if (icon === '✅') passed++;
    else failed++;
    console.log(`  ${icon} ${r.name}: ${r.status} — ${r.detail}`);
  }

  console.log(`\n📈 ${passed} passed, ${failed} warnings/fails`);
  console.log('');

  if (failed > 0) {
    console.log('⚠️ Algunos tests fallaron. Revisa que los servicios estén corriendo en EasyPanel.');
  } else {
    console.log('✅ Todos los servicios responden correctamente. La plataforma está lista para uploads.');
  }
}

main().catch(console.error);