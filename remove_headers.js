const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex1 = /[ \t]*<th[^>]*>ĐVT<\/th>\n?/g;
const regex2 = /[ \t]*<th[^>]*>KL HĐ<\/th>\n?/g;
const regex3 = /[ \t]*<th[^>]*>MÃ HIỆU<\/th>\n?/g;
const regex4 = /[ \t]*<th[^>]*>XUẤT XỨ<\/th>\n?/g;

content = content.replace(regex1, '');
content = content.replace(regex2, '');
content = content.replace(regex3, '');
content = content.replace(regex4, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Removed 4 headers from MaterialAndPurchasingTab.tsx');
