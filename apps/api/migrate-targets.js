const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateLegacyAssignments() {
  console.log('🔄 INICIANDO MIGRACIÓN LEGACY (PlaylistItem -> DeviceCampaign)...');

  // Obtener todas las asginaciones legacy en PlaylistItem
  const legacyPls = await prisma.playlistItem.findMany({
    include: { device: true } // device relates on deviceId string (hardware ID)
  });

  if (legacyPls.length === 0) {
    console.log('✅ No hay asignaciones Legacy en PlaylistItem pendientes por migrar.');
    return;
  }

  console.log(`⏱ Encontradas ${legacyPls.length} asignaciones legacy.`);

  let migratedCount = 0;
  for (const pl of legacyPls) {
    if (pl.device && pl.device.id) {
      try {
        await prisma.deviceCampaign.upsert({
          where: {
            device_id_campaign_id: {
              device_id: pl.device.id,
              campaign_id: pl.campaignId
            }
          },
          update: {},
          create: {
            device_id: pl.device.id,
            campaign_id: pl.campaignId
          }
        });
        migratedCount++;
      } catch (err) {
        console.error(`Error migrando hw_id ${pl.deviceId}: ${err.message}`);
      }
    }
  }

  console.log(`✅ ¡Éxito! ${migratedCount}/${legacyPls.length} relaciones migradas a DeviceCampaign.`);

  try {
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;`);
    console.log('✅ Vista materializada de sincronización actualizada.');
  } catch (e) {
    console.error('Error refrescando MV:', e.message);
  }
}

migrateLegacyAssignments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
