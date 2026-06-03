const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current users:', users.map(u => u.email));
  
  const hash = await bcrypt.hash('TadAdmin2026!', 10);
  
  if (users.length > 0) {
    const admin = users[0];
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hash }
    });
    console.log('Reset password for user:', admin.email, 'to TadAdmin2026!');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
  })
