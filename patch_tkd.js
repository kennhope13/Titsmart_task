const fs = require('fs');

// Patch MaterialAndPurchasingTab.tsx
let codeMat = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');
codeMat = codeMat.replace(/>Tem KĐ<\/span>/g, '>TKD</span>');
codeMat = codeMat.replace(/> Tem kiểm định<\/button>/g, '> TKD</button>');
fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', codeMat);

// Patch FastDocModal.tsx
let codeFast = fs.readFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', 'utf8');
codeFast = codeFast.replace(/setText\('Tem KĐ: '\);/g, "setText('TKD: ');");
fs.writeFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', codeFast);
console.log('Renamed Tem KĐ to TKD successfully');
