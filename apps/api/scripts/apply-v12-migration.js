/**
 * TAD v12 Migration Script
 * Applies the v12_supabase_schema.sql to the database.
 * Usage: node apply-v12-migration.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const sqlPath = path.join(__dirname, '../v12_supabase_schema.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('❌ SQL file not found at:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL or DIRECT_URL not found in .env');
        process.exit(1);
    }

    console.log('🚀 Starting TAD v12 Migration...');
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to database.');

        // Split SQL by some delimiter if needed, or just run as a block
        // PostgreSQL handles multiple statements in one query call for the most part
        await client.query(sql);
        
        console.log('🎉 Migration successful! TAD v12 Schema & Seed data applied.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
    } finally {
        await client.end();
    }
}

migrate();
