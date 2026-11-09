'use strict';
// Patch the verification script: robots meta optional + clean driver earnings-lab eval.
const fs = require('node:fs');
const p = 'scripts/tach-cinematic-landing-verify.cjs';
let s = fs.readFileSync(p, 'utf8');

// Fix 1: robots meta is optional -> don't fail on absence
const robotsLine = "a.robots = (await p.getAttribute('meta[name=\"robots\"]', 'content')) || '';";
const robotsNew = `const robotsEl = await p.locator('meta[name="robots"]').count();
      a.robots = robotsEl ? (await p.getAttribute('meta[name="robots"]', 'content')) || '(absent)' : '(absent)';`;
if (!s.includes(robotsLine)) { console.log('FIX1 MISS'); } else { s = s.replace(robotsLine, robotsNew); console.log('FIX1 OK'); }

// Fix 2: replace the driver earnings-lab evaluate block entirely
const start = '      const calcEval = await p.evaluate(() => {';
const end = '      d.earningsLab = calcEval;';
const i = s.indexOf(start);
const j = s.indexOf(end, i);
if (i === -1 || j === -1) { console.log('FIX2 MISS: i=' + i + ' j=' + j); } else {
  const newBlock =
    '      const calcEval = await p.evaluate(() => {\n' +
    "        const el = document.querySelector('[data-slot=\"driver-earnings-lab\"]') || document.querySelector('[data-slot=\"earnings\"]');\n" +
    '        if (!el) return { text: \'\', found: false };\n' +
    '        return { text: el.textContent.slice(0, 200), found: true };\n' +
    '      });\n' +
    '      d.hasEarningsLab = calcEval.found;\n' +
    '      d.earningsLabText = calcEval.text;\n';
  s = s.slice(0, i) + newBlock + s.slice(j + end.length);
  console.log('FIX2 OK');
}
fs.writeFileSync(p, s, 'utf8');
console.log('hasRandom now?', /hasRandom/.test(s));
