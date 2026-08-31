import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // SEC: la password se lee de env (nunca hardcodeada ni logueada).
  const secret = process.env.RESET_PASSWORD;
  if (!secret || secret.length < 8) {
    console.error('❌ Define RESET_PASSWORD (mín. 8 caracteres) para usar este script.');
    process.exit(1);
  }
  const adminEmail = process.env.RESET_EMAIL || 'admin@tad.do';
  const hashed = await bcrypt.hash(secret, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashed,
      role: 'ADMIN',
      name: 'TAD Admin'
    },
    create: {
      email: adminEmail,
      password: hashed,
      role: 'ADMIN',
      name: 'TAD Admin'
    }
  });

  console.log(`✅ Admin user "${adminEmail}" actualizado (password desde RESET_PASSWORD).`);
}

main().finally(() => prisma.$disconnect());