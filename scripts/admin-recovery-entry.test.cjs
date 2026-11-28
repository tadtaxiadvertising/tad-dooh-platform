const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

// Execute the real React component. Only framework/providers are replaced;
// state initialization, view selection and form rendering remain production code.
function load(relative, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const services = { PORTAL_CONFIGS: { ADMIN: config } };
  const stubs = {
    react: React, 'next/head': ({children})=>React.createElement(React.Fragment,null,children),
    'next/router': {useRouter:()=>({pathname:'/admin/forgot-password',query:{}})},
    'lucide-react': new Proxy({}, {get:()=>()=>React.createElement('svg')}),
    clsx: (...args)=>args.filter(x=>typeof x==='string').join(' '), sonner:{toast:{}},
    '@tad/services':services, '@tad/services/cookie-consent':{}, '@tad/services/session-cookies':{},
    './GoogleSignInButton':{GoogleSignInButton:()=>null}, ...extra,
  };
  vm.runInNewContext(code,{exports,require:name=>name in stubs?stubs[name]:require(name),console,process,URL},{filename:relative});
  return exports;
}
const config={role:'ADMIN',name:'TAD Admin',loginPath:'/admin/login',callbackPath:'/admin/auth/callback',updatePasswordPath:'/admin/update-password'};
test('Admin recovery link resolves to its public recovery route',()=>{
  const {default:Login}=load('apps/admin/pages/admin/login.tsx',{'@tad/ui':{GoogleSignInButton:()=>null}});
  const html=renderToStaticMarkup(React.createElement(Login));
  assert.match(html, /href="\/admin\/forgot-password"[^>]*>¿Olvidaste tu contraseña\?/);
});
test('shared auth opens the recovery form when explicitly requested',()=>{
  const {PortalAuth}=load('packages/ui/components/PortalAuth.tsx');
  const html=renderToStaticMarkup(React.createElement(PortalAuth,{config,initialView:'forgot'}));
  assert.match(html,/Recuperar acceso/);
  assert.doesNotMatch(html,/id="login-password"/);
});
test('shared auth keeps the existing default login form',()=>{
  const {PortalAuth}=load('packages/ui/components/PortalAuth.tsx');
  assert.match(renderToStaticMarkup(React.createElement(PortalAuth,{config})),/id="login-password"/);
});
test('standalone recovery returns to the configured Admin login',()=>{
  const pushed=[];
  const {PortalAuth}=load('packages/ui/components/PortalAuth.tsx',{
    react:{...React,useState:value=>[value,()=>{}],useEffect:()=>{}},
    'next/router':{useRouter:()=>({push:value=>pushed.push(value)})},
  });
  function findBack(node){
    if(Array.isArray(node))return node.map(findBack).find(Boolean);
    if(!React.isValidElement(node))return null;
    if(node.type==='button'&&String(node.props.children).includes('← Volver'))return node;
    return findBack(node.props.children);
  }
  const back=findBack(PortalAuth({config,initialView:'forgot'}));
  assert.ok(back,'recovery back control exists');
  back.props.onClick();
  assert.deepEqual(pushed,['/admin/login']);
});
test('Admin recovery page renders the shared recovery entry',()=>{
  const {PortalAuth}=load('packages/ui/components/PortalAuth.tsx');
  const {default:Recovery}=load('apps/admin/pages/admin/forgot-password.tsx',{'@tad/ui':{PortalAuth}});
  assert.match(renderToStaticMarkup(React.createElement(Recovery)),/Recuperar acceso/);
});
test('anonymous recovery is public while the Admin dashboard stays protected',async()=>{
  const {middleware}=load('apps/admin/middleware.ts',{
    '@tad/services/session-cookies':{readAccessTokenCookie:()=>null},
    '@tad/services/cookie-consent':{isPublicLegalPath:()=>false},
    'next/server':{NextResponse:{next:()=>({kind:'next'}),redirect:url=>({kind:'redirect',url:String(url)})}},
    '@supabase/ssr':{createServerClient:()=>{throw new Error('anonymous recovery must not call auth provider')}},
  });
  const request=pathname=>({nextUrl:{pathname},url:'https://admin.example.test'+pathname,cookies:{getAll:()=>[]}});
  assert.equal((await middleware(request('/admin/forgot-password'))).kind,'next');
  assert.equal((await middleware(request('/admin/dashboard'))).kind,'redirect');
});
test('client session restoration does not redirect anonymous recovery to login',()=>{
  const source=fs.readFileSync(path.join(root,'packages/ui/components/AuthProvider.tsx'),'utf8');
  const match=source.match(/const PUBLIC_PATHS = (\[[\s\S]*?\]);/);
  assert.ok(match,'client public path list must be located');
  const paths=vm.runInNewContext(match[1]);
  assert.ok(paths.includes('/admin/forgot-password'));
  assert.ok(!paths.includes('/admin/dashboard'));
});
test('Admin recovery renders without the private dashboard layout',()=>{
  const Fragment=({children})=>React.createElement(React.Fragment,null,children);
  const {default:App}=load('apps/admin/pages/_app.tsx',{
    '../styles/globals.css':{},'next/dynamic':()=>()=>null,
    '@tanstack/react-query':{QueryClient:class {},QueryClientProvider:Fragment},
    '@tad/logging':{logger:null},sonner:{Toaster:()=>null},
    '@tad/ui':{AuthProvider:Fragment,Layout:({children})=>React.createElement('div',{'data-private-layout':'true'},children),PaymentLockOverlay:()=>null,CookieBanner:()=>null,ConsentAnalytics:()=>null},
  });
  const html=renderToStaticMarkup(React.createElement(App,{Component:()=>React.createElement('main',null,'recovery-content'),pageProps:{},router:{pathname:'/admin/forgot-password'}}));
  assert.match(html,/recovery-content/);
  assert.doesNotMatch(html,/data-private-layout/);
});
