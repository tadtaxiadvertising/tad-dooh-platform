
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();
const SUPABASE_URL = process.env.SUPABASE_URL;
const CDN_URL_PREFIX = process.env.CDN_URL_PREFIX;

async function migrate() {
  console.log('🚀 Iniciando Migración de Contenidos a CDN...');
  
  if (!SUPABASE_URL || !CDN_URL_PREFIX) {
    console.error('❌ Error: SUPABASE_URL y CDN_URL_PREFIX son obligatorios en .env');
    process.exit(1);
  }

  if (SUPABASE_URL === CDN_URL_PREFIX) {
    console.warn('⚠️ Nota: SUPABASE_URL y CDN_URL_PREFIX son idénticos. No hay cambios reales que aplicar en las URLs, pero sincronizaremos los campos cdn_url.');
  }

  console.log(`🔗 Usando CDN Prefix: ${CDN_URL_PREFIX}`);

  // 1. Migrar Tabla Media
  const mediaItems = await prisma.media.findMany();
  let mediaUpdated = 0;

  for (const item of mediaItems) {
    const currentUrl = item.url || '';
    let targetCdnUrl = item.cdnUrl || currentUrl;

    // Si la URL actual es de Supabase y queremos cambiarla al CDN
    if (currentUrl.includes(SUPABASE_URL)) {
      targetCdnUrl = currentUrl.replace(SUPABASE_URL, CDN_URL_PREFIX);
    }

    if (targetCdnUrl !== item.cdnUrl) {
      await prisma.media.update({
        where: { id: item.id },
        data: { cdnUrl: targetCdnUrl }
      });
      mediaUpdated++;
    }
  }

  console.log(`✅ Tabla Media: ${mediaUpdated} registros actualizados.`);

  // 2. Migrar Tabla MediaAsset
  const assets = await prisma.mediaAsset.findMany();
  let assetsUpdated = 0;

  for (const asset of assets) {
    if (asset.url.includes(SUPABASE_URL)) {
      const newUrl = asset.url.replace(SUPABASE_URL, CDN_URL_PREFIX);
      
      // En MediaAsset, la columna es 'url' directamente (según Prisma schema)
      // Aunque el modelo tiene 'url', no tiene un campo 'cdnUrl' separado como 'Media'
      // Así que actualizamos 'url' a la versión CDN.
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { url: newUrl }
      });
      assetsUpdated++;
    }
  }

  console.log(`✅ Tabla MediaAsset: ${assetsUpdated} registros actualizados.`);

  // 3. Migrar Tabla Video (Hub)
  const videos = await prisma.video.findMany();
  let videosUpdated = 0;

  for (const video of videos) {
    if (video.url.includes(SUPABASE_URL)) {
      const newUrl = video.url.replace(SUPABASE_URL, CDN_URL_PREFIX);
      await prisma.video.update({
        where: { id: video.id },
        data: { url: newUrl }
      });
      videosUpdated++;
    }
  }

  console.log(`✅ Tabla Video: ${videosUpdated} registros actualizados.`);

  console.log('\n✨ Migración completada con éxito.');
}

migrate()
  .catch((e) => {
    console.error('❌ Error fatal en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
