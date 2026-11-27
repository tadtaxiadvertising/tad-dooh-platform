const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.AUDIT_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../docs/audits/computer-use/2026-11-26');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROMIUM_PATH});
  const results=[];
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.goto('https://tad.adm.ibusiness.com.do/admin/login',{waitUntil:'networkidle',timeout:25000});
    const reject=page.getByRole('button',{name:'Rechazar opcionales',exact:true});
    if(await reject.count())await reject.click();
    const link=page.getByRole('link',{name:'¿Olvidaste tu contraseña?',exact:true});
    const href=await link.getAttribute('href');
    await page.screenshot({path:path.join(root,'evidence/screenshots/admin-recovery-before.png')});
    await link.click();
    results.push({id:'production-admin-recovery',status:href==='#'?'FAIL':'PENDING_VERIFICATION',href,finalUrl:page.url(),recoveryVisible:await page.getByRole('heading',{name:'Recuperar acceso',exact:true}).count()===1});
    await context.close();

    const local=await browser.newContext({viewport:{width:390,height:844}});
    let recoveryRequest=null;
    await local.route('**/*',route=>{
      const u=new URL(route.request().url());
      if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return route.continue();
      if(u.hostname==='audit.invalid'&&u.pathname==='/auth/v1/recover'){
        const headers={'access-control-allow-origin':'http://127.0.0.1:3108','access-control-allow-headers':'*'};
        if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
        const body=route.request().postDataJSON();
        recoveryRequest={email:body.email,redirectTo:u.searchParams.get('redirect_to')};
        return route.fulfill({status:200,contentType:'application/json',headers,body:'{}'});
      }
      return route.abort();
    });
    const fixed=await local.newPage();
    try {
      await fixed.goto('http://127.0.0.1:3108/admin/forgot-password',{waitUntil:'networkidle',timeout:30000});
      assert.equal(await fixed.getByRole('heading',{name:'Recuperar acceso',exact:true}).count(),1);
      results.push({id:'local-recovery-route-visible',status:'PASS',url:fixed.url()});
      const localReject=fixed.getByRole('button',{name:'Rechazar opcionales',exact:true});
      if(await localReject.count())await localReject.click();
      await fixed.screenshot({path:path.join(root,'evidence/screenshots/admin-recovery-after.png')});
      await fixed.getByLabel('Correo',{exact:true}).fill('audit-user@example.test');
      await fixed.getByRole('button',{name:'Enviar instrucciones',exact:true}).click();
      await fixed.waitForFunction(()=>!document.querySelector('#forgot-email'),{timeout:10000});
      assert.equal(recoveryRequest?.email,'audit-user@example.test');
      assert.equal(recoveryRequest.redirectTo,'http://127.0.0.1:3108/admin/auth/callback?next=%2Fadmin%2Fupdate-password');
      results.push({id:'local-recovery-request-with-synthetic-provider',status:'PASS',request:recoveryRequest,text:(await fixed.locator('body').innerText()).slice(0,1000),realEmailSent:false});
    }catch(e){results.push({id:'local-recovery-flow',status:'BLOCKED',error:e.message});process.exitCode=1;}
    await local.close();
  }finally{
    await browser.close();
    fs.writeFileSync(path.join(root,'admin-recovery-browser-results.json'),JSON.stringify({timestamp:new Date().toISOString(),method:'Playwright; production click only; localhost form with all external traffic intercepted',results},null,2));
    console.log(JSON.stringify(results,null,2));
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
