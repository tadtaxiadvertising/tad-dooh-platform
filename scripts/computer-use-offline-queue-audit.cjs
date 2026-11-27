// Browser integration of the real Player queue against a synthetic local ACK server.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { chromium } = require(process.env.AUDIT_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const results = [];
const accepted = new Set();
let mode = 'reject';
let requests = 0;
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/telemetry/playback-batch') {
    requests++;
    let body = ''; for await (const chunk of req) body += chunk;
    const events = JSON.parse(body);
    if (mode === 'reject') {res.writeHead(401, {'Content-Type':'application/json'});res.end(JSON.stringify({success:false}));return;}
    for (const event of events) accepted.add(JSON.stringify(event));
    if (mode === 'lost-ack') {req.socket.destroy();return;}
    res.writeHead(201, {'Content-Type':'application/json'});
    res.end(JSON.stringify({success:true,processed:events.length,rejected:0}));return;
  }
  if (req.url === '/sw.js') {
    res.setHeader('Content-Type','application/javascript');
    res.end("const paths=['/','/playback-queue.js','/playback-queue-storage.js','/playback-event-type.js','/network-listeners.js','/config.js']; self.addEventListener('install',e=>e.waitUntil(caches.open('audit-shell').then(c=>c.addAll(paths)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(!e.request.url.includes('/api/'))e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});");return;
  }
  if (req.url === '/config.js') {
    res.setHeader('Content-Type','application/javascript');
    res.end("export default {API_URL:location.origin+'/api',PLAYBACK_QUEUE_MAX_SIZE:50,PLAYBACK_FLUSH_INTERVAL_MS:300000}");return;
  }
  const name = req.url.slice(1).replace(/\.js$/, '');
  if (['playback-queue','playback-queue-storage','playback-event-type','network-listeners'].includes(name)) {
    const source=fs.readFileSync(path.join(root,'apps/player/src',name+'.ts'),'utf8');
    const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from "\.\/([\w-]+)"/g,'from "./$1.js"');
    res.setHeader('Content-Type','application/javascript');res.end(js);return;
  }
  res.setHeader('Content-Type','text/html');
  res.end('<!doctype html><title>TAD isolated queue audit</title><body>Synthetic local queue fixture<script type="module">import {PlaybackQueue} from "/playback-queue.js"; window.queue=new PlaybackQueue();queue.init("AUDIT-DEVICE");window.ready=true;</script>');
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROMIUM_PATH});
  const context=await browser.newContext();
  try {
    const page=await context.newPage();
    await page.goto(origin);await page.waitForFunction(()=>window.ready===true);
    await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
    await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    const read=()=>page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('tad_playback_queue',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error)})});
    const add=timestamp=>page.evaluate(timestamp=>queue.saveToQueue({device_id:'AUDIT-DEVICE',video_id:'AUDIT-VIDEO',event_type:'play_confirm',timestamp}),timestamp);
    await add(1732100000001);assert.equal((await read()).length,1);
    results.push({id:'online-durable-enqueue',status:'PASS'});
    await context.setOffline(true);await add(1732100000002);assert.equal((await read()).length,2);
    results.push({id:'offline-durable-enqueue',status:'PASS'});
    const offline=await page.evaluate(()=>queue.flushQueue());assert.equal(offline.sent,0);assert.equal((await read()).length,2);
    results.push({id:'offline-delivery-failure-retains-two-proofs',status:'PASS'});
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ready===true);assert.equal((await read()).length,2);
    results.push({id:'offline-page-restart-retains-two-proofs',status:'PASS'});
    await context.setOffline(false);
    await page.evaluate(()=>queue.flushQueue());assert.equal((await read()).length,2);
    results.push({id:'reconnect-http-401-retains-two-proofs',status:'PASS'});
    mode='lost-ack';await page.evaluate(()=>queue.flushQueue());assert.equal((await read()).length,2);assert.equal(accepted.size,2);
    results.push({id:'lost-ack-retains-queue-after-server-acceptance',status:'PASS'});
    mode='accept';const ack=await page.evaluate(()=>queue.flushQueue());assert.equal(ack.sent,2);assert.equal((await read()).length,0);assert.equal(accepted.size,2);
    results.push({id:'retry-full-ack-drains-queue-synthetic-server-deduplicates',status:'PASS'});
    await page.evaluate(()=>queue.destroy());
  } catch(e){results.push({id:'queue-scenario',status:'FAIL',error:e.message});process.exitCode=1;}
  finally {
    await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(root,'docs/audits/computer-use/2026-11-26/offline-browser-results.json'),JSON.stringify({runId:'TAD-CUA-20261126-01',sourceCommit:'01fb2e0f',method:'Real browser IndexedDB and Player queue source; local synthetic ACK server; page restart, not OS restart',productionApiTested:false,financialReconciliationTested:false,requests,syntheticUniqueEvents:accepted.size,results},null,2));
    console.log(JSON.stringify({results,requests,syntheticUniqueEvents:accepted.size},null,2));
  }
})().catch(e=>{console.error(e.message);server.close();process.exitCode=1;});
