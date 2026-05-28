const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const devices = await prisma.device.findMany({
      include: { driver: true }
    });
    console.log('Devices in DB:', JSON.stringify(devices, null, 2));
    
    const driver = await prisma.driver.findFirst();
    console.log('Sample Driver:', JSON.stringify(driver, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
