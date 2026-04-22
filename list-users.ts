import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
const prisma = new PrismaClient();

async function main() {
  let output = '';
  output += '--- ADMIN USERS ---\n';
  const users = await prisma.user.findMany();
  users.forEach(u => output += `Email: ${u.email}, Role: ${u.role}\n`);

  output += '\n--- ADVERTISERS ---\n';
  const advertisers = await prisma.advertiser.findMany();
  advertisers.forEach(a => output += `Email: ${a.email}, ID: ${a.id}\n`);

  output += '\n--- DRIVERS ---\n';
  const drivers = await prisma.driver.findMany();
  drivers.forEach(d => output += `Phone: ${d.phone}, Name: ${d.fullName}, HasPass: ${!!d.password}\n`);

  fs.writeFileSync('users_list.txt', output, 'utf8');
  console.log('✅ Users list saved to users_list.txt');
}

main().catch(console.error).finally(() => prisma.$disconnect());
