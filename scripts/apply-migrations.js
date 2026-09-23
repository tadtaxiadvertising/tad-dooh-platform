// Idempotent migration applier for TAD DOOH production (Supabase).
// Splits SQL respecting $$ blocks, single quotes, comments. Autocommit per statement
// (required for CREATE INDEX CONCURRENTLY). Tolerates "already exists" skips.
const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

const CFG = {
  host: 'aws-0-us-west-2.pooler.supabase.com', port: 5432,
  user: 'postgres.ltdcdhqixvbpdcitthqf', password: process.env.DB_PASSWORD || '',
  database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
};
const DIR = '/opt/data/tad-dooh-platform/apps/api/prisma/migrations';
const MIGRATIONS = [
  '20260916_gin_indexes',
  '20260916_wallet_unification',
  '20260917_add_currency_to_financial_transactions',
  '20260917_campaign_targeting_jsonb',
  '20260921_add_human_review_task',
  '20260921_phase6_commissions_qr_conversation_metrics',
];

function splitSQL(sql) {
  const stmts = []; let buf = '', i = 0;
  let inLine = false, inBlock = false, inDollar = false, inSQuote = false;
  while (i < sql.length) {
    const ch = sql[i], next = sql[i + 1] || '';
    if (inLine) { buf += ch; if (ch === '\n') inLine = false; i++; continue; }
    if (inBlock) { buf += ch; if (ch === '*' && next === '/') { buf += next; i += 2; inBlock = false; continue; } i++; continue; }
    if (inDollar) { buf += ch; if (ch === '$' && next === '$') { buf += next; i += 2; inDollar = false; continue; } i++; continue; }
    if (inSQuote) { buf += ch; if (ch === "'") { if (next === "'") { buf += next; i += 2; continue; } inSQuote = false; } i++; continue; }
    if (ch === '-' && next === '-') { inLine = true; buf += ch; i++; continue; }
    if (ch === '/' && next === '*') { inBlock = true; buf += ch; i++; continue; }
    if (ch === '$' && next === '$') { inDollar = true; buf += '$$'; i += 2; continue; }
    if (ch === "'") { inSQuote = true; buf += ch; i++; continue; }
    if (ch === ';') { if (buf.trim()) stmts.push(buf.trim()); buf = ''; i++; continue; }
    buf += ch; i++;
  }
  if (buf.trim()) stmts.push(buf.trim());
  return stmts;
}

function classify(err) {
  const m = err.message || '';
  if (/already exists|duplicate_object|does not exist, skipping/i.test(m)) return 'SKIP';
  if (/operator class|access method "gin"|data type .* has no default operator class/i.test(m)) return 'WARN';
  return 'FAIL';
}

async function main() {
  const client = new Client(CFG);
  await client.connect();

  // Skip migrations already recorded
  const done = new Set((await client.query('SELECT migration_name FROM _prisma_migrations')).rows.map(r => r.migration_name));

  let totals = { applied: 0, skipped: 0, warns: 0, fails: 0 };
  for (const name of MIGRATIONS) {
    if (done.has(name)) { console.log(`\n=== ${name}: ya registrada, omitida ===`); continue; }
    console.log(`\n=== ${name} ===`);
    const sql = fs.readFileSync(`${DIR}/${name}/migration.sql`, 'utf8');
    const stmts = splitSQL(sql);
    let counts = { applied: 0, skipped: 0, warns: 0, fails: 0 };
    for (const s of stmts) {
      const head = s.replace(/\s+/g, ' ').slice(0, 90);
      try {
        await client.query(s);
        counts.applied++;
        console.log(`  ✅ ${head}`);
      } catch (e) {
        const cls = classify(e);
        if (cls === 'SKIP') { counts.skipped++; console.log(`  ⏭️  SKIP(ya existe): ${head}`); }
        else if (cls === 'WARN') { counts.warns++; console.log(`  ⚠️  WARN: ${head} → ${e.message.slice(0, 100)}`); }
        else { counts.fails++; console.log(`  ❌ FAIL: ${head} → ${e.message.slice(0, 200)}`); }
      }
    }
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    try {
      await client.query(
        `INSERT INTO _prisma_migrations (id, checksum, migration_name, logs, started_at, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), $5) ON CONFLICT (id) DO NOTHING`,
        [crypto.randomUUID(), checksum, name, `manual idempotent apply: ${counts.applied} ok / ${counts.skipped} skip / ${counts.warns} warn / ${counts.fails} fail`, counts.applied]
      );
      console.log(`  📝 Registrada en _prisma_migrations → ok:${counts.applied} skip:${counts.skipped} warn:${counts.warns} fail:${counts.fails}`);
    } catch (e) {
      console.log(`  ⚠️ No se pudo registrar en _prisma_migrations: ${e.message}`);
    }
    totals.applied += counts.applied; totals.skipped += counts.skipped;
    totals.warns += counts.warns; totals.fails += counts.fails;
  }

  // Final verification: expected tables
  console.log('\n=== VERIFICACIÓN FINAL ===');
  const expected = ['settlement_batches', 'qr_scans', 'conversations', 'conversation_messages',
    'leads', 'referral_attributions', 'payment_intents', 'payment_evidence', 'payment_verifications',
    'commission_ledger', 'conversion_events', 'human_review_tasks'];
  const tables = new Set((await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)).rows.map(r => r.table_name));
  let missing = 0;
  for (const t of expected) {
    const ok = tables.has(t);
    if (!ok) missing++;
    console.log(`  ${ok ? '✅' : '❌'} ${t}`);
  }
  const wal = await client.query(`SELECT COUNT(*) n FROM wallets`);
  const drv = await client.query(`SELECT COUNT(*) n FROM drivers d LEFT JOIN wallets w ON w.driver_id=d.id WHERE w.id IS NULL`);
  const cur = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='currency'`);
  console.log(`  💰 wallets=${wal.rows[0].n}, drivers sin wallet=${drv.rows[0].n}, fin_tx.currency=${cur.rows.length ? '✅' : '❌'}`);
  const tc = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='campaigns' AND column_name IN ('target_cities','target_fleets')`);
  tc.rows.forEach(r => console.log(`  🎯 campaigns.${r.column_name}: ${r.data_type}`));

  console.log(`\n=== TOTALES: ok:${totals.applied} skip:${totals.skipped} warn:${totals.warns} fail:${totals.fails} | tablas faltantes:${missing} ===`);
  await client.end();
  process.exit(totals.fails > 0 || missing > 0 ? 2 : 0);
}
main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
