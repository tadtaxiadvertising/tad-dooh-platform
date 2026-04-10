import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar el .env de la api
dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });

const prisma = new PrismaClient();

async function main() {
  const email = 'ads@brugal.com';
  const newPassword = 'Tad2026!';
  
  console.log(`Buscando anunciante: ${email}`);
  const advertiser = await prisma.advertiser.findUnique({
    where: { email }
  });

  if (!advertiser) {
    console.error('Anunciante no encontrado');
    return;
  }

  console.log('Generando hash de la contraseña...');
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log('Actualizando base de datos...');
  await prisma.advertiser.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log('✅ Contraseña actualizada exitosamente. Ya puedes iniciar sesión.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
