import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('TadAdvertiser2026!', 10);
  const adminPassword = await bcrypt.hash('TadAdmin2026!', 10);
  const driverPassword = await bcrypt.hash('TadDriver2026!', 10);

  console.log('🌱 Synchronizing test users from TEST_CREDENTIALS.md...');

  // 1. Advertiser
  await prisma.advertiser.upsert({
    where: { email: 'advertiser@tad.do' },
    update: { password: hashedPassword },
    create: {
      email: 'advertiser@tad.do',
      companyName: 'TAD Advertiser Test',
      contactName: 'Advertiser Test',
      phone: '809-555-9999',
      status: 'ACTIVE',
      password: hashedPassword,
      category: 'Tecnología'
    }
  });
  console.log('✅ Advertiser advertiser@tad.do created/updated.');

  // 2. Admin
  await prisma.user.upsert({
    where: { email: 'admin@tad.do' },
    update: { password: adminPassword },
    create: {
      email: 'admin@tad.do',
      password: adminPassword,
      name: 'TAD Admin',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin admin@tad.do created/updated.');

  // 3. Driver
  await prisma.driver.upsert({
    where: { phone: '18090000000' },
    update: { 
      password: driverPassword,
      fullName: 'TAD Driver Test'
    },
    create: {
      phone: '18090000000',
      fullName: 'TAD Driver Test',
      password: driverPassword,
      status: 'OPERATIVO',
      onboardingStatus: 'COMPLETED',
      subscriptionPaid: true,
      cedula: '001-0000000-0'
    }
  });
  console.log('✅ Driver with phone 18090000000 created/updated.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
