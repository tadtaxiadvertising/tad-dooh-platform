import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const devices = await prisma.device.findMany({
    where: { deviceId: { in: ["STI10001", "STI10002"] } },
    include: { driver: true },
  });
  console.log(JSON.stringify(devices, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
