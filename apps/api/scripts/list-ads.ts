import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("--- ADVERTISERS LIST ---");
  const ads = await prisma.advertiser.findMany({
    select: { email: true, companyName: true, password: true },
  });
  console.table(
    ads.map((v) => ({
      email: v.email,
      name: v.companyName,
      hasPass: !!v.password,
    })),
  );
}

main().finally(() => prisma.$disconnect());
