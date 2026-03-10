
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.driver.findMany({
    select: { id: true, fullName: true, status: true, deviceId: true }
  });
  console.log(JSON.stringify(drivers, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
