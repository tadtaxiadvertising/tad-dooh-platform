const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/advertiser/components/MapView.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Check for common escape sequences that would cause syntax errors
const lines = content.split('\n');
const issues = [];

lines.forEach((line, idx) => {
  // Check for escaped backticks that shouldn't be escaped (outside of template literals)
  if (line.includes('\\`')) {
    issues.push({ line: idx + 1, col: line.indexOf('\\`'), text: line.trim(), issue: 'escaped backtick' });
  }
  // Check for escaped dollar signs that shouldn't be
  if (line.includes('\\${')) {
    issues.push({ line: idx + 1, col: line.indexOf('\\${'), text: line.trim(), issue: 'escaped template var' });
  }
});

if (issues.length > 0) {
  console.log('Found issues:');
  issues.slice(0, 20).forEach(i => {
    console.log(`  Line ${i.line}: [${i.issue}] ${i.text.substring(0, 100)}`);
  });
} else {
  console.log('No obvious escape issues found. Checking JS-level syntax...');
}

// Also count template literal backticks to check for imbalance
let depth = 0;
let maxDepth = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '`' && (i === 0 || content[i-1] !== '\\')) {
    if (depth === 0) depth++;
    else depth--;
    maxDepth = Math.max(maxDepth, depth);
  }
}
console.log(`Template literal nesting - final depth: ${depth} (should be 0), max depth: ${maxDepth}`);
