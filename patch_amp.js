const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('Chứng từ &amp; giao hàng', 'Chứng từ & giao hàng');
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed ampersand');
