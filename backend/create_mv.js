const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSQL() {
  const sql = fs.readFileSync('prisma/views.sql', 'utf8');
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  
  for (let s of statements) {
    if (!s.trim().startsWith('--')) {
      console.log(`Ejecutando: \n${s.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(s);
    }
  }
  console.log('Vista materializada e indice creados con éxito.');
}

runSQL()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
