const fs = require('fs');
const sharp = require('sharp');
sharp('public/tad-logo-dark-mode.svg')
  .resize(1200)
  .png()
  .toFile('public/tad-logo-dark-mode.png')
  .then(() => console.log('Dark mode PNG generated'))
  .catch(console.error);
  
sharp('public/tad-logo-light-mode.svg')
  .resize(1200)
  .png()
  .toFile('public/tad-logo-light-mode.png')
  .then(() => console.log('Light mode PNG generated'))
  .catch(console.error);
