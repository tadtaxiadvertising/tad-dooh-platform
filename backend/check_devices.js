
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    select: {
      deviceId: true,
      taxiNumber: true,
      city: true,
      status: true
    }
  });
  console.log(JSON.stringify(devices, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
