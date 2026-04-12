const fs = require('fs');
const p = 'apps/advertiser/next.config.ts';
let content = fs.readFileSync(p, 'utf8');
content = content.replace(
  /experimental: \{\s*\n(\s*\/\/.*?)*\s*webpackBuildWorker: true,\s*\n\s*outputFileTracingRoot: require\('path'\)\.join\(process\.cwd\(\), '\.\.\/\.\.\/'\),\s*\n/m, 
  "outputFileTracingRoot: require('path').join(process.cwd(), '../../'),\n  experimental: {\n    // Reduce el uso de RAM sacando el build de webpack a un proceso separado\n    webpackBuildWorker: true,\n"
);
fs.writeFileSync(p, content);
console.log('Fixed next.config.ts');
