const fs = require('fs');
const filePath = 'web-admin/src/pages/MaterialTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

data = data.replace(/triggerToast\(([^,]+),\s*'error'\)/g, "triggerToast($1, 'warning')");
data = data.replace(/logActivity\('Chuyển kho',\s*([^)]+)\)/g, "logActivity($1)");

fs.writeFileSync(filePath, data);
console.log('Fixed TS errors');
