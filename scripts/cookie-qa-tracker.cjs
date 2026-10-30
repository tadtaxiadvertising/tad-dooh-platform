// Local-only Umami contract fixture. Never configure this URL in production.
const http = require('node:http');
const state = { loads: 0, events: [], invalidAutoTrack: false };
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url === '/status') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(state)); }
  if (req.url === '/script.js') {
    state.loads++;
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(`if (document.currentScript.dataset.autoTrack !== 'false') fetch('http://127.0.0.1:3199/invalid');
      window.umami = {track: function(input, data) {
        var base = {url: location.href, title: document.title, referrer: document.referrer};
        var payload = typeof input === 'function' ? input(base) : Object.assign(base, {name: input, data: data});
        return fetch('http://127.0.0.1:3199/collect', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload)});
      }};`);
  }
  if (req.url === '/invalid') state.invalidAutoTrack = true;
  if (req.url === '/collect') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    return req.on('end', () => { state.events.push(JSON.parse(body)); res.end('ok'); });
  }
  res.end('ok');
}).listen(3199, '127.0.0.1', () => console.log('Cookie QA tracker ready: http://127.0.0.1:3199/status'));
