const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.ltdcdhqixvbpdcitthqf:Tad.avertising2026@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  console.log('Testing Prisma connection to Cloud...');
  try {
    await prisma.$connect();
    console.log('✅ PRISMA_SUCCESS');
    await prisma.$disconnect();
  } catch (e) {
    console.error('❌ PRISMA_FAILED:', e.message);
  }
}

main();
