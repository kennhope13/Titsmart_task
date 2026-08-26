const fs = require('fs');
const filePath = 'web-admin/src/pages/MaterialTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

data = data.replace(/materialId:\s*targetMaterialId,/g, "materialId: targetMaterialId as string,");

fs.writeFileSync(filePath, data);
console.log('Fixed TS error 5');
