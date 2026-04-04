const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function igniteSantiagoPilot() {
  console.log('🚀 INICIANDO IGNICIÓN DEL PILOTO DE SANTIAGO...');
  
  // 1. Encontrar todos los dispositivos STI
  const stiDevices = await prisma.device.findMany({
    where: { deviceId: { startsWith: 'STI' } }
  });

  if (stiDevices.length === 0) {
    console.error('❌ No se encontraron dispositivos STI.');
    return;
  }
  
  console.log(`✅ Encontrados ${stiDevices.length} dispositivos STI.`);

  // 2. Buscar Campaña Institucional (TAD Institucional) o Global Active
  let globalCampaign = await prisma.campaign.findFirst({
    where: { 
      isGlobal: true, 
      active: true, 
      status: 'ACTIVE' 
    },
    orderBy: { priority: 'desc' },
    include: { advertiserRef: true }
  });

  // Si no hay campaña, creamos una de prueba institucional
  if (!globalCampaign) {
    console.log('⚠️ No hay campañas globales activas. Buscando cualquier campaña activa...');
    globalCampaign = await prisma.campaign.findFirst({
      where: { active: true, status: 'ACTIVE' },
      include: { advertiserRef: true }
    });
  }

  if (!globalCampaign) {
    console.error('❌ No se encontró NINGUNA campaña activa en la Base de Datos para hacer la asignación.');
    return;
  }

  console.log(`🎯 Campaña seleccionada para ignición: "${globalCampaign.name}" (ID: ${globalCampaign.id}, Anunciante: ${globalCampaign.advertiserRef?.companyName || 'N/A'})`);

  // 3. Crear el vínculo en "DeviceCampaign" (El nuevo standard de facto)
  console.log('🔗 Enlazando Campaña <-> Pantallas...');
  
  let successCount = 0;
  for (const device of stiDevices) {
    try {
      await prisma.deviceCampaign.upsert({
        where: {
          device_id_campaign_id: {
            device_id: device.id,
            campaign_id: globalCampaign.id
          }
        },
        update: { assigned_at: new Date() },
        create: {
          device_id: device.id,
          campaign_id: globalCampaign.id
        }
      });
      successCount++;
    } catch (e) {
      console.error(`Error al vincular dispositivo ${device.deviceId}:`, e.message);
    }
  }

  console.log(`✅ ¡Misión Cumplida! ${successCount} dispositivos STI enlazados explícitamente a "${globalCampaign.name}".`);
  console.log(`💡 Para que el motor BI lo lea adecuadamente mañana, la tabla relacional se ha actualizado.`);

  // Refrescar la vista materializada para que SyncService lo vea inmediatamente
  try {
    console.log('🔄 Refrescando vista materializada mv_active_campaigns...');
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;`);
    console.log('✅ Vista materializada actualizada.');
  } catch (e) {
    console.error('Error al refrescar vista materializada:', e.message);
  }
}

igniteSantiagoPilot()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
