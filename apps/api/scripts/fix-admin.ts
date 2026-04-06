import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const secret = 'tad2026admin';
  const hashed = await bcrypt.hash(secret, 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@tad.do' },
    update: { 
      password: hashed,
      role: 'ADMIN',
      name: 'TAD Admin'
    },
    create: {
      email: 'admin@tad.do',
      password: hashed,
      role: 'ADMIN',
      name: 'TAD Admin'
    }
  });

  console.log('✅ Admin user "admin@tad.do" is now active with password: ' + secret);
}

main().finally(() => prisma.$disconnect());
