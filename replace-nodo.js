const fs = require('fs');
const path = require('path');

const directory = './admin-dashboard';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(directory);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  // Replace Nodos -> Pantallas, Nodo -> Pantalla
  // case sensitive replacements
  content = content.replace(/\bNodos\b/g, 'Pantallas');
  content = content.replace(/\bnodos\b/g, 'pantallas');
  content = content.replace(/\bNODOS\b/g, 'PANTALLAS');
  
  content = content.replace(/\bNodo\b/g, 'Pantalla');
  content = content.replace(/\bnodo\b/g, 'pantalla');
  content = content.replace(/\bNODO\b/g, 'PANTALLA');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Replaced in ${file}`);
  }
});
console.log('Done.');
