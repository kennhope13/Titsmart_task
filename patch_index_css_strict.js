const fs = require('fs');
const path = 'web-admin/src/index.css';
let content = fs.readFileSync(path, 'utf8');

const newContent = content.replace(
  /\.app-tab-button\s*\{[\s\S]*?\}/g,
  `.app-tab-button {
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}`
);

fs.writeFileSync(path, newContent, 'utf8');
console.log('Patched index.css with strict regex');
