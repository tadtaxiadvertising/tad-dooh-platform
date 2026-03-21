const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔔 Generando notificaciones de sistema...');

  await prisma.notification.createMany({
    data: [
      {
        title: 'Nueva Flota de Santiago Activa',
        message: 'Se han integrado 100 nuevas unidades STI al monitoreo master.',
        type: 'SUCCESS',
        category: 'FLEET',
        createdAt: new Date()
      },
      {
        title: 'Sincronización Total Completada',
        message: 'Todos lo choferes han sido enlazados con sus respectivos dispositivos de telemetría.',
        type: 'INFO',
        category: 'SYSTEM',
        createdAt: new Date()
      }
    ]
  });

  console.log('✅ Notificaciones creadas.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
