#!/usr/bin/env node
// ============================================================================
//  verify-deployment.js — Verificación programática (Node.js v18+)
//  Uso: node verify-deployment.js
// ============================================================================

import https from 'https';

const CONFIG = {
  API_URL: 'https://tad.api.ibusiness.com.do',
  API_HEALTH: 'https://tad.api.ibusiness.com.do/api/v1/health',
  DRIVER_URL: 'https://tad.driver.ibusiness.com.do',
  DRIVER_LOGIN: 'https://tad.driver.ibusiness.com.do/driver/login',
  PLAYER_URL: 'https://tad.player.ibusiness.com.do',
  PLAYER_HEALTH: 'https://tad.player.ibusiness.com.do/health',
  ADMIN_URL: 'https://tad.adm.ibusiness.com.do',
  ADMIN_LOGIN: 'https://tad.adm.ibusiness.com.do/admin/login',
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
};

const runCheck = async (name, url, expectedStatus, options = {}) => {
  const { timeout = 10000, expectedBody = null } = options;
  return new Promise((resolve) => {
    const req = https.get(url, { timeout, headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const ok = res.statusCode === expectedStatus;
        const bodyOk = expectedBody ? data.includes(expectedBody) : true;
        resolve({
          name,
          ok: ok && bodyOk,
          statusCode: res.statusCode,
          body: data,
          error: null,
        });
      });
    }).on('timeout', () => {
      resolve({ name, ok: false, error: 'timeout' });
    }).on('error', (err) => {
      resolve({ name, ok: false, error: err.message });
    });
  });
};

const runAllChecks = async () => {
  const checks = [
    { name: 'API Health', url: CONFIG.API_HEALTH, status: 200, expectedBody: 'OK' },
    { name: 'Driver Login', url: CONFIG.DRIVER_LOGIN, status: 200 },
    { name: 'Player Health', url: CONFIG.PLAYER_HEALTH, status: 200, expectedBody: 'OK' },
    { name: 'Admin Login', url: CONFIG.ADMIN_LOGIN, status: 200 },
    { name: 'Driver Dashboard', url: CONFIG.DRIVER_URL, status: 302 },
    { name: 'Admin Dashboard', url: CONFIG.ADMIN_URL, status: 302 },
  ];

  console.log('\n🔍 Verificando servicios...\n');

  for (const check of checks) {
    const result = await runCheck(check.name, check.url, check.status);
    results.total++;
    if (result.ok) {
      results.passed++;
      console.log(`  ✅ ${check.name}`);
    } else {
      results.failed++;
      const error = result.error || `HTTP ${result.statusCode}`;
      console.error(`  ❌ ${check.name} — ${error}`);
    }
  }
};

runAllChecks().then(() => {
  console.log(`\n📊 Resultado: ${results.passed}/${results.total} OK`);
  if (results.failed > 0) {
    console.error(`\n❌ ${results.failed} verificación(es) fallida(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 Todos los servicios están respondiendo correctamente.');
  }
});
