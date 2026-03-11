import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    select: {
      deviceId: true,
      taxiNumber: true,
      status: true
    },
    take: 10
  });
  console.log('EXISTING DEVICES:');
  console.log(JSON.stringify(devices, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
