// Read-only production smoke audit. No credentials, submissions or TLS bypass.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.AUDIT_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../docs/audits/computer-use/2026-11-26');
const shots = path.join(root, 'evidence/screenshots');
fs.mkdirSync(shots, { recursive: true });
const results = [];
const viewports = [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[360,640]];
const targets = {
  driver: 'https://tad.driver.ibusiness.com.do',
  advertiser: 'https://tad.anunciante.ibusiness.com.do',
  admin: 'https://tad.adm.ibusiness.com.do',
  player: 'https://tad.player.ibusiness.com.do',
};
function save() {
  fs.writeFileSync(path.join(root, 'public-runtime-results.json'), JSON.stringify({
    runId: 'TAD-CUA-20261126-01', method: 'Playwright Chromium; fresh context per case; strict TLS',
    sourceCommit: '01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a',
    deployedCommit: 'UNKNOWN', results,
  }, null, 2));
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.AUDIT_CHROMIUM_PATH });
  try {
    for (const [role, origin] of Object.entries(targets)) {
      for (const [width, height] of viewports) {
        const context = await browser.newContext({ viewport: {width,height}, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const entry = { id: `${role}-${width}x${height}`, role, viewport: {width,height}, startedAt: new Date().toISOString(), url: origin, status: 'IN_PROGRESS', pageErrors: [], failedRequests: [], httpErrors: [] };
        page.on('pageerror', e => entry.pageErrors.push(e.message.slice(0,500)));
        // Store only origin/path, never query, headers, body or credentials.
        const safeUrl = value => {try {const u = new URL(value); return u.origin + u.pathname;} catch {return 'invalid-url';}};
        page.on('requestfailed', r => entry.failedRequests.push({url:safeUrl(r.url()),error:r.failure()?.errorText}));
        page.on('response', r => {if(r.status()>=400) entry.httpErrors.push({url:safeUrl(r.url()),status:r.status()});});
        try {
          const before = Date.now();
          const response = await page.goto(origin, {waitUntil:'networkidle',timeout:25000});
          entry.loadMs = Date.now()-before;
          entry.httpStatus = response?.status();
          entry.finalUrl = safeUrl(page.url());
          entry.title = await page.title();
          entry.layout = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,unloadedImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>({path:new URL(i.src,location.href).pathname,lazy:i.loading==='lazy'}))}));
          entry.textSample = (await page.locator('body').innerText()).slice(0,1500);
          entry.links = await page.locator('a[href]').evaluateAll(links=>links.map(a=>({text:a.textContent.trim().slice(0,80),href:a.getAttribute('href')})).filter(a=>!a.href.includes('?')&&!a.href.includes('#access_token')));
          entry.screenshot = `evidence/screenshots/${entry.id}.png`;
          await page.screenshot({path:path.join(root,entry.screenshot),fullPage:true});
          entry.status = entry.httpStatus===200 && !entry.pageErrors.length && entry.layout.scrollWidth<=width ? 'PASS' : 'FAIL';
          if(role==='driver' && width===390){
            const reject = page.getByRole('button',{name:'Rechazar opcionales',exact:true});
            if(await reject.count()) await reject.click();
            const sales = page.getByRole('button',{name:'02 Ventas',exact:true});
            if(await sales.count()) {await sales.click();entry.salesInteraction=await page.locator('#driver-channel-summary').innerText();}
            const calculator = page.locator('#driver-lab-ads');
            if(await calculator.count()) {await calculator.fill('15');entry.calculatorValue=await calculator.inputValue();}
          }
        } catch(e) {entry.status='BLOCKED';entry.error=e.message.slice(0,1000);}
        finally {results.push(entry);save();console.log(entry.id,entry.status,entry.httpStatus||'',entry.error?.split('\n')[0]||'');await context.close();}
      }
    }
    for(const [role,route] of [['driver','/driver/dashboard'],['advertiser','/dashboard'],['admin','/dashboard']]){
      const context=await browser.newContext(); const page=await context.newPage();
      const entry={id:`${role}-anonymous-private-route`,role,url:targets[role]+route,startedAt:new Date().toISOString()};
      try {const response=await page.goto(entry.url,{waitUntil:'networkidle',timeout:25000});entry.httpStatus=response.status();entry.finalUrl=page.url();entry.textSample=(await page.locator('body').innerText()).slice(0,1500);const loginPath={driver:'/driver/login',advertiser:'/advertiser/login',admin:'/admin/login'}[role];entry.status=new URL(entry.finalUrl).pathname===loginPath?'PASS':'FAIL';entry.claim='anonymous private-route navigation redirects to the role login; does not prove server-side RBAC';}
      catch(e){entry.status='BLOCKED';entry.error=e.message.slice(0,500);}
      finally{results.push(entry);save();await context.close();}
    }
  } finally {await browser.close();save();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
