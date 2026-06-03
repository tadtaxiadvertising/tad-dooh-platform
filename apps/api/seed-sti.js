const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando creación de 100 tablets y choferes STI para Santiago...');
  
  try {
    for (let i = 1; i <= 100; i++) {
        const code = `STI${String(i).padStart(4, '0')}`;
        
        // 1. Create or Update Driver
        const driver = await prisma.driver.upsert({
            where: { phone: `1809000${String(i).padStart(4, '0')}` },
            update: { fullName: `Simulated Driver ${i}` },
            create: {
                fullName: `Simulated Driver ${i}`,
                phone: `1809000${String(i).padStart(4, '0')}`,
                status: 'ACTIVE',
                onboardingStatus: 'COMPLETED'
            }
        });

        // 2. Create or Update Device linked to Driver
        await prisma.device.upsert({
            where: { deviceId: code },
            update: { 
                driverId: driver.id,
                isOnline: true,
                status: 'ACTIVE'
            },
            create: {
                deviceId: code,
                driverId: driver.id,
                name: `Tablet ${code}`,
                city: 'Santiago',
                status: 'ACTIVE',
                isOnline: true,
                taxiNumber: `TX-${String(i).padStart(4, '0')}`
            }
        });

        if (i % 20 === 0) console.log(`... ${i} devices prepared`);
    }
    
    console.log(`✅ ¡Éxito! 100 tablets STI configuradas y vinculadas en el sistema.`);

  } catch (error) {
    console.error('❌ Error en el seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
