const fs = require('fs');
const path = require('path');

const pnpmDir = '/c/tad-dooh-platform/node_modules/.pnpm';
console.log('pnpm exists:', fs.existsSync(pnpmDir));

if (fs.existsSync(pnpmDir)) {
  const entries = fs.readdirSync(pnpmDir);
  console.log('postgres entries:', entries.filter(n => n.startsWith('postgres-')));
  
  // Try to find postgres-array
  const match = entries.find(name => name.startsWith('postgres-array@'));
  console.log('postgres-array match:', match);
  
  if (match) {
    const fullPath = path.join(pnpmDir, match, 'node_modules', 'postgres-array');
    console.log('full path:', fullPath);
    console.log('exists:', fs.existsSync(fullPath));
  }
}
