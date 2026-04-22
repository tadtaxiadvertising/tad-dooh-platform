import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
const prisma = new PrismaClient();

async function main() {
  const hashAdmin = await bcrypt.hash('TadAdmin2026!', 10);
  const hashAdv = await bcrypt.hash('Tad2026!', 10);

  // Update Admin
  await prisma.user.updateMany({
    where: { email: 'admin@tadtaxi.do' },
    data: { password: hashAdmin }
  });

  // Update Advertiser
  await prisma.advertiser.updateMany({
    where: { email: 'marketing1@brand.do' },
    data: { password: hashAdv }
  });

  console.log('✅ Credenciales restablecidas correctamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
