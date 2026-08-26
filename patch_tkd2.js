const fs = require('fs');

let codeMat = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');
codeMat = codeMat.replace(/hasFileFor\(\['tem', 'kiểm định', 'stamp'\]\)/g, "hasFileFor(['tem', 'kiểm định', 'stamp', 'tkd'])");
fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', codeMat);

let codeFast = fs.readFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', 'utf8');
codeFast = codeFast.replace(/lowerText\.includes\('tem'\) \|\| lowerText\.includes\('kiểm định'\) \|\| lowerText\.includes\('stamp'\)/g, "lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp') || lowerText.includes('tkd')");
fs.writeFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', codeFast);
console.log('Added tkd keyword successfully');
