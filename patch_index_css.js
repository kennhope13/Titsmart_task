const fs = require('fs');
const path = 'web-admin/src/index.css';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `.app-tab-button {
  font-family: ui-sans-serif, system-ui, sans-serif !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
}`;

const replacementStr = `.app-tab-button {
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(path, content, 'utf8');
console.log('Patched index.css');
