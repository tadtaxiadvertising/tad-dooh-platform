const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.NEW_ADMIN_PASSWORD;

  if (!email || !password || password.length < 16) {
    throw new Error(
      'Set ADMIN_EMAIL and a NEW_ADMIN_PASSWORD of at least 16 characters in the environment; never pass credentials as source code.',
    );
  }

  const admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    throw new Error('No matching admin user found; no account was modified.');
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: admin.id },
    data: { password: hash },
  });

  console.log('Admin password updated for the explicitly selected account.');
}

main()
  .catch((error) => {
    console.error('Admin password reset failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
