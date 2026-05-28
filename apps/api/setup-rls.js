
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando configuración de políticas RLS en Supabase...');
  
  try {
    // 1. Habilitar RLS
    console.log('1. Habilitando RLS en driver_locations...');
    await prisma.$executeRawUnsafe(`ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;`);

    // 2. Limpiar políticas viejas
    console.log('2. Limpiando políticas existentes...');
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Permitir inserción anónima de telemetría" ON public.driver_locations;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Solo admins ven ubicaciones" ON public.driver_locations;`);

    // 3. Crear política de inserción para ANON
    console.log('3. Creando política de inserción para el rol "anon"...');
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Permitir inserción anónima de telemetría" 
      ON public.driver_locations 
      FOR INSERT 
      TO anon 
      WITH CHECK (true);
    `);

    // 4. Crear política de lectura para usuarios autenticados
    console.log('4. Creando política de lectura para usuarios autenticados...');
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Solo admins ven ubicaciones" 
      ON public.driver_locations 
      FOR SELECT 
      TO authenticated 
      USING (true);
    `);

    console.log('✅ Configuración completada con éxito.');
  } catch (error) {
    console.error('❌ Error configurando RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
