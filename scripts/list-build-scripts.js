const fs = require('fs');
const dirs = ['apps', 'packages'];
for (const d of dirs) {
  let entries;
  try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { continue; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = `./${d}/${e.name}/package.json`;
    try {
      const pj = JSON.parse(fs.readFileSync(p, 'utf8'));
      const b = pj.scripts && pj.scripts.build;
      console.log((pj.name || '?').padEnd(34), '| build:', b || '<none>');
    } catch (e) { /* skip */ }
  }
}
