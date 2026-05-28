import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const countDrivers = await prisma.driver.count();
  const countDevices = await prisma.device.count();
  const driversWithDevices = await prisma.driver.findMany({ include: { devices: true } });
  console.log(`Reporte de Registro (Benchmark 10x10):`);
  console.log(`----------------------------------------`);
  console.log(`Total Conductores: ${countDrivers}`);
  console.log(`Total Pantallas: ${countDevices}`);
  driversWithDevices.forEach(d => {
    console.log(`Driver: ${d.fullName} | Pantallas: ${d.devices.map(dev => dev.deviceId).join(', ')}`);
  });
}
main().finally(() => prisma.$disconnect());
