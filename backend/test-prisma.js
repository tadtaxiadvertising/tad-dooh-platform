const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    console.log('Available Models in PrismaClient:', models.join(', '));
    
    if (prisma.financialTransaction) {
        console.log('✅ financialTransaction exists');
    } else {
        console.log('❌ financialTransaction DOES NOT exist');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
