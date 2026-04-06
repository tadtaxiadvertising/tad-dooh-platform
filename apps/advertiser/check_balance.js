const fs = require('fs');
const content = fs.readFileSync('c:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/admin-dashboard/pages/login.tsx', 'utf8');
let openCount = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') openCount++;
  if (content[i] === '}') openCount--;
}
console.log('Balance:', openCount);
