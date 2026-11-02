const fs = require('fs');
const path = require('path');

const depsToCopy = ['postgres-array', 'postgres-bytea', 'postgres-date', 'postgres-interval'];

// Use the current working directory of the script
const projectRoot = __dirname;
const pnpmDir = path.join(projectRoot, 'node_modules', '.pnpm');

let success = 0;
let total = 0;

for (const dep of depsToCopy) {
  total++;
  if (!fs.existsSync(pnpmDir)) {
    console.log(`Not found: ${dep}`);
    continue;
  }

  const entries = fs.readdirSync(pnpmDir);
  const match = entries.find(name => name.startsWith(dep + '@'));
  if (!match) {
    console.log(`Not found: ${dep}`);
    continue;
  }

  const src = path.join(pnpmDir, match, 'node_modules', dep);
  const dest = path.join(projectRoot, 'node_modules', dep);

  try {
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true, overwrite: true });
      console.log(`Copied ${dep} from ${match}`);
      success++;
    } else {
      console.log(`Source not found: ${dep}`);
    }
  } catch (err) {
    console.error(`Failed to copy ${dep}:`, err.message);
  }
}

console.log(`\nDone: ${success}/${total} copied`);
