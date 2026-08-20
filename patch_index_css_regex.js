const fs = require('fs');
const path = 'web-admin/src/index.css';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/font-family:\s*ui-sans-serif,\s*system-ui,\s*sans-serif\s*!important;/g, '');
content = content.replace(/font-weight:\s*800\s*!important;/g, 'font-weight: 700 !important;');

fs.writeFileSync(path, content, 'utf8');
console.log('Patched index.css with regex');
