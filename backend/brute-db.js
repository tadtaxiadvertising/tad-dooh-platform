const { Client } = require('pg');

async function test(user, pass, host, port) {
    const c = new Client({ user, host, database: 'postgres', password: pass, port, ssl: { rejectUnauthorized: false } });
    try {
        await c.connect();
        console.log(`✅ SUCCESS: user=${user}, pass=${pass}, host=${host}, port=${port}`);
        await c.end();
        return true;
    } catch (e) {
        console.log(`❌ FAIL: user=${user}, pass=${pass}, host=${host}, port=${port} -> ${e.message}`);
        return false;
    }
}

async function run() {
    const ref = 'ltdcdhqixvbpdcitthqf';
    const hosts = ['aws-0-us-west-2.pooler.supabase.com', 'db.ltdcdhqixvbpdcitthqf.supabase.co'];
    const users = [`postgres.${ref}`, 'postgres'];
    const passes = ['Tad.avertising2026', 'Tad.advertising2026'];
    const ports = [6543, 5432];

    for (const host of hosts) {
        for (const user of users) {
            for (const pass of passes) {
                for (const port of ports) {
                    if (await test(user, pass, host, port)) process.exit(0);
                }
            }
        }
    }
    console.log('--- ALL ATTEMPTS FAILED ---');
    process.exit(1);
}

run();
