import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node promote-user.ts <email>');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash('tad12345', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      email,
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });

  console.log(`✅ User ${email} promoted/created as ADMIN in database.`);
}

main().finally(() => prisma.$disconnect());
