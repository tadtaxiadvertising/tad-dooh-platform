const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('campaign-videos', 'campaign-videos', true) 
      ON CONFLICT (id) DO NOTHING;
    `);

    try {
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "Public Access" 
        ON storage.objects FOR ALL 
        USING (bucket_id = 'campaign-videos') 
        WITH CHECK (bucket_id = 'campaign-videos');
      `);
    } catch(e) {
      console.log('Policy may already exist:', e.message);
    }

    console.log('Fixed Storage RLS');
  } catch (e) {
    console.error('Error applying RLS:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
