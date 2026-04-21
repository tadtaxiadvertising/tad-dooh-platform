
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const simulatorPath = path.join(__dirname, 'apps/tad-simulator');
const apiEnvPath = path.join(__dirname, 'apps/api/.env');

// Auto-inject DATABASE_URL if missing
if (fs.existsSync(apiEnvPath) && !process.env.DATABASE_URL) {
    const envContent = fs.readFileSync(apiEnvPath, 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=["']?(.+?)["']?\s*$/m);
    if (dbUrlMatch) {
        process.env.DATABASE_URL = dbUrlMatch[1];
        console.log('🔗 Database link inherited from API.');
    }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧹 TAD SIMULATOR - DEEP CLEAN & REBOOT SCRIPT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
    // 1. Clean Cache
    console.log('➡️ [1/3] Purging build artifacts (.next)...');
    const nextDir = path.join(simulatorPath, '.next');
    if (fs.existsSync(nextDir)) {
        fs.rmSync(nextDir, { recursive: true, force: true });
        console.log('✅ Cache cleared.');
    } else {
        console.log('ℹ️ No cache found. Skipping.');
    }

    // 2. Rebuild
    console.log('\n➡️ [2/3] Rebuilding with fresh DNS Fallback logic...');
    console.log('   (This may take ~30-60 seconds)');
    execSync('npm run build', { 
        cwd: simulatorPath, 
        stdio: 'inherit',
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
    });
    console.log('✅ Build complete.');

    // 3. Launch
    console.log('\n➡️ [3/3] Launching Professional Simulation Engine...');
    console.log('🚀 SYSTEM ONLINE at http://localhost:80 (or your configured port)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    execSync('node .next/standalone/apps/tad-simulator/server.js', { 
        cwd: simulatorPath, 
        stdio: 'inherit' 
    });

} catch (error) {
    console.error('\n❌ SCRIPT FAILED:', error.message);
    process.exit(1);
}
