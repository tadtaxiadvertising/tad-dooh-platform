import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const columns =
      await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'portal_requests'`;
    console.log("Columns in portal_requests:", columns);
  } catch (e) {
    console.error("Error fetching columns:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
