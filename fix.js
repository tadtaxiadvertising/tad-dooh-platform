const fs = require('fs');
const p = 'c:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/advertiser/components/MapView.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$\{/g, '${');
fs.writeFileSync(p, c);
console.log('Fixed MapView!');
