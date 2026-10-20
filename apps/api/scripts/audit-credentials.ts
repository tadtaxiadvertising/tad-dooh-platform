import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("--- AUDITORÍA DE CREDENCIALES ---");

  const admins = await prisma.user.findMany({
    select: { email: true, role: true },
  });
  console.log("ADMINS:", JSON.stringify(admins, null, 2));

  const ads = await prisma.advertiser.findMany({
    select: { id: true, email: true, companyName: true, password: true },
  });
  console.log(
    "ADVERTISERS:",
    JSON.stringify(
      ads.map((v) => ({
        id: v.id,
        email: v.email,
        name: v.companyName,
        hasPass: !!v.password,
      })),
      null,
      2,
    ),
  );

  const drivers = await prisma.driver.findMany({
    select: { id: true, phone: true, fullName: true, password: true },
  });
  console.log(
    "DRIVERS:",
    JSON.stringify(
      drivers.map((v) => ({
        id: v.id,
        phone: v.phone,
        name: v.fullName,
        hasPass: !!v.password,
      })),
      null,
      2,
    ),
  );
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
