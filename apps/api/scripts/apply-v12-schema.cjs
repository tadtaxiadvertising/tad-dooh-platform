const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sqlFilePath = path.join(__dirname, '../v12_supabase_schema.sql');
const dbUrl = process.env.DATABASE_URL;

async function applySchema() {
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL no encontrada en el .env');
    process.exit(1);
  }

  console.log('🚀 Iniciando migración automática TAD v12 PRO (JS-Version)...');
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conexión establecida con Supabase.');

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`📄 Leyendo esquema v12 (${sql.length} bytes)...`);

    await client.query(sql);
    console.log('🎉 ¡Esquema v12 aplicado exitosamente!');

  } catch (err) {
    console.error('❌ Error fatal durante la migración:');
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
