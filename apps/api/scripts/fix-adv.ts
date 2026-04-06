import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const secret = 'tad2026';
  const hashed = await bcrypt.hash(secret, 10);
  
  await prisma.advertiser.update({
    where: { email: 'admin@tad.do' },
    data: { password: hashed }
  });

  console.log('✅ Advertiser "admin@tad.do" password reset to: ' + secret);
}

main().finally(() => prisma.$disconnect());
