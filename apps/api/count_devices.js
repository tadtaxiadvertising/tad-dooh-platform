
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allDevices = await prisma.device.count();
  const pilotDevices = await prisma.device.count({
    where: { deviceId: { startsWith: 'STI' } }
  });
  const others = allDevices - pilotDevices;
  
  console.log(`Total: ${allDevices}`);
  console.log(`STI Pilot: ${pilotDevices}`);
  console.log(`Others to clean: ${others}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
