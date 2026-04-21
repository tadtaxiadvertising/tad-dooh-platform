const fs = require('fs');
try {
  const sharp = require('sharp');
  sharp('admin-dashboard/public/tad-logo-dark-mode.svg')
    .resize(1000)
    .png()
    .toFile('admin-dashboard/public/tad-logo-dark-mode.png')
    .then(() => console.log('Dark mode PNG generated'))
    .catch(console.error);
    
  sharp('admin-dashboard/public/tad-logo-light-mode.svg')
    .resize(1000)
    .png()
    .toFile('admin-dashboard/public/tad-logo-light-mode.png')
    .then(() => console.log('Light mode PNG generated'))
    .catch(console.error);
} catch (e) {
  console.log('sharp not found, try installing it or using puppeteer');
}
