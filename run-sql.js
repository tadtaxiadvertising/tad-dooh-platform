const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function runMigrations() {
  try {
    await client.connect();
    
    const sql = fs.readFileSync('C:/tad-dooh-platform/00_driver_locations_structure.sql', 'utf8');
    
    // Split by ; but respect dollar-quoted strings ($$)
    const statements = [];
    let current = '';
    let inDollarQuote = false;
    let quoteChar = '';
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      
      if (sql.substring(i, i + 2) === '$$') {
        if (!inDollarQuote) {
          inDollarQuote = true;
          quoteChar = '$';
          current += '$$';
          i++; // skip next $
        } else {
          inDollarQuote = false;
          quoteChar = '';
          current += '$$';
          i++; // skip next $
        }
      } else if (char === ';' && !inDollarQuote) {
        statements.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      statements.push(current);
    }
    
    console.log(`Running ${statements.length} statements...`);
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      try {
        await client.query(trimmed);
        console.log('✓ Executed ' + trimmed.substring(0, 70).trim());
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('unique') || err.message.includes('trigger')) {
          console.log('~ OK (skip): ' + err.message.substring(0, 80));
        } else {
          console.error('✗ Error: ' + err.message);
          throw err;
        }
      }
    }
    
    await client.end();
    console.log('Done!');
  } catch (err) {
    console.error('Fatal:', err.message);
    process.exit(1);
  }
}

runMigrations();
