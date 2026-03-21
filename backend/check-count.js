const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function count() {
  const c = await prisma.device.count();
  const sti = await prisma.device.count({ where: { deviceId: { startsWith: 'STI' } } });
  console.log(`Total: ${c}, STI: ${sti}`);
  await prisma.$disconnect();
}
count();
