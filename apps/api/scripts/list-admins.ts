import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("--- ADMIN USERS ---");
  const admins = await prisma.user.findMany();
  console.table(
    admins.map((v) => ({ email: v.email, role: v.role, name: v.name })),
  );
}

main().finally(() => prisma.$disconnect());
