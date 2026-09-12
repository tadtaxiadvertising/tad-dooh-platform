const { Client } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function applyRemediation() {
  await client.connect();
  console.log('--- [DBA AGENTIC REMEDIATION PIPELINE] ---');

  // STEP 1: Reconnaissance
  console.log('\n[Paso 1: Auditoría de Estado (Reconnaissance)]');
  const auditRes = await client.query(`
    SELECT schemaname, tablename, tableowner, rowsecurity 
    FROM pg_tables 
    WHERE tablename = 'spatial_ref_sys';
  `);
  console.log('Tabla spatial_ref_sys info actual:', auditRes.rows[0]);

  // STEP 2: Corrección Estratégica (Execution)
  console.log('\n[Paso 2: Corrección Estratégica (Execution)]');
  
  // Try 1: Attempt ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
  try {
    console.log('Intentando transferir propiedad: ALTER TABLE public.spatial_ref_sys OWNER TO postgres...');
    await client.query('ALTER TABLE public.spatial_ref_sys OWNER TO postgres;');
    console.log('✅ Éxito: Propietario transferido directamente a postgres.');
  } catch (err) {
    console.log(`⚠️ Advertencia controlada al transferir OWNER directo (PostgreSQL 17+ / Supabase hardening): [${err.code}] ${err.message}`);
    console.log('Aplicando estrategia de privilegios completos y blindaje contra fallos 42501...');
    
    // Grant full permissions to postgres role
    await client.query('GRANT ALL ON TABLE public.spatial_ref_sys TO postgres;');
    console.log('✅ Éxito: GRANT ALL ON TABLE public.spatial_ref_sys TO postgres aplicado correctamente.');
  }

  // Verify grants
  const grantsRes = await client.query(`
    SELECT grantee, privilege_type 
    FROM information_schema.table_privileges 
    WHERE table_name = 'spatial_ref_sys';
  `);
  console.log('Privilegios actuales sobre spatial_ref_sys:', grantsRes.rows);

  // STEP 3: Verificación de Regresión (Testing)
  console.log('\n[Paso 3: Verificación de Regresión (Testing)]');
  const testTables = ['subscriptions', 'telemetry', 'analytics_events', 'devices'];
  for (const t of testTables) {
    try {
      console.log(`Verificando Toggle RLS en tabla de negocio: public.${t}...`);
      await client.query(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ Éxito: RLS activo y confirmado en public.${t}`);
    } catch (err) {
      console.error(`❌ Error en ${t}:`, err.message);
    }
  }

  // STEP 4: Reporte de Seguridad
  console.log('\n[Paso 4: Reporte de Seguridad de Tablas Principales]');
  const secReport = await client.query(`
    SELECT tablename, rowsecurity, tableowner
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN ('users', 'devices', 'payroll_payments', 'subscriptions', 'advertisers', 'campaigns', 'telemetry', 'spatial_ref_sys')
    ORDER BY tablename;
  `);
  console.table(secReport.rows);

  // Check RLS Policies on core business tables
  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd 
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log(`Total de políticas RLS definidas en public: ${polRes.rows.length}`);

  // Check taxi geolocation data count (restriction: NO eliminar datos de geolocalización)
  const locCount = await client.query('SELECT count(*) FROM public.driver_locations;');
  const telCount = await client.query('SELECT count(*) FROM public.telemetry;');
  console.log(`\n🛡️ Integridad de datos de geolocalización de la flota:`);
  console.log(`- driver_locations: ${locCount.rows[0].count} registros`);
  console.log(`- telemetry: ${telCount.rows[0].count} registros`);

  await client.end();
  console.log('\n--- [FIN DE PIPELINE] ---');
}

applyRemediation().catch(err => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
