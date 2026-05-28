import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Enabling RLS on spatial_ref_sys...');
    await prisma.$executeRawUnsafe('ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;');
    console.log('RLS enabled successfully on spatial_ref_sys!');
  } catch (error) {
    console.error('Error enabling RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
