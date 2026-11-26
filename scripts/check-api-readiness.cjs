#!/usr/bin/env node
'use strict';

function validateOrigin(raw) {
  if (!raw) throw new Error('MISSING_ORIGIN');
  let url;
  try { url = new URL(raw); } catch { throw new Error('INVALID_ORIGIN'); }
  const isLocalHttp = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalHttp) throw new Error('INVALID_ORIGIN');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('INVALID_ORIGIN');
  }
  return url.origin;
}

async function checkApiReadiness(origin, fetcher = globalThis.fetch) {
  const root = validateOrigin(origin);
  if (typeof fetcher !== 'function') throw new Error('NO_FETCH');
  const read = async (path) => {
    const response = await fetcher(root + path, {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('HTTP_FAILURE');
    return response.json();
  };
  const live = await read('/health');
  if (live?.status !== 'up') throw new Error('LIVENESS_FAILURE');
  const orchestrator = await read('/health/ready');
  if (orchestrator?.status !== 'up') throw new Error('ORCHESTRATOR_READINESS_FAILURE');
  const ready = await read('/health/full');
  if (ready?.status !== 'up' || ready?.db?.connected !== true || ready?.db?.masterSyncViewReady !== true) {
    throw new Error('READINESS_FAILURE');
  }
  return { liveness: true, dbConnected: true, masterSyncReady: true };
}

if (require.main === module) {
  checkApiReadiness(process.argv[2]).then(() => {
    console.log('TAD API readiness OK: process, orchestrator, database, master sync view');
  }).catch((error) => {
    const safeCodes = new Set(['MISSING_ORIGIN','INVALID_ORIGIN','NO_FETCH','HTTP_FAILURE','LIVENESS_FAILURE','ORCHESTRATOR_READINESS_FAILURE','READINESS_FAILURE']);
    const code = safeCodes.has(error?.message) ? error.message : 'NETWORK_OR_RESPONSE_FAILURE';
    console.error('TAD API readiness FAILED: ' + code);
    process.exitCode = 1;
  });
}

module.exports = { validateOrigin, checkApiReadiness };
