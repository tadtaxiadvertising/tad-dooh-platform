import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
const prisma = new PrismaClient();

async function main() {
  console.log('Generando hash de la contraseña...');
  const newPassword = 'TadDriver2026!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const phoneToUpdate = '8295550000';
  
  console.log(`Actualizando contraseña para el conductor con teléfono: ${phoneToUpdate}...`);
  
  const driver = await prisma.driver.findFirst({
    where: { phone: phoneToUpdate }
  });

  if (driver) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { password: hashedPassword }
    });
    console.log(`✅ Contraseña actualizada exitosamente para el conductor ${driver.fullName} (${phoneToUpdate}). Nueva contraseña: ${newPassword}`);
  } else {
    console.log(`❌ Conductor con teléfono ${phoneToUpdate} no encontrado.`);
  }

  // Also verify other users
  console.log('\n--- VERIFICANDO ADMINS ---');
  const admins = await prisma.user.findMany({ take: 2 });
  admins.forEach(a => console.log(`Admin: ${a.email}`));
  
  console.log('\n--- VERIFICANDO ANUNCIANTES ---');
  const advertisers = await prisma.advertiser.findMany({ take: 2 });
  advertisers.forEach(a => console.log(`Advertiser: ${a.email}`));

}

main().catch(console.error).finally(() => prisma.$disconnect());
