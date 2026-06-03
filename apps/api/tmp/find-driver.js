
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const driver = await prisma.driver.findFirst({ select: { id: true, fullName: true, deviceId: true } });
    console.log(JSON.stringify(driver));
    await prisma.$disconnect();
}

main();
