const fs = require('fs');
const filePath = 'web-admin/src/pages/MaterialTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

data = data.replace(/addInventoryTransaction\([^,]+,\s*(exportTx|importTx)\)/g, "addInventoryTransaction($1)");
data = data.replace(/logActivity\(`([^`]+)`\)/g, "logActivity('Chuyển kho', targetProjectName)");

fs.writeFileSync(filePath, data);
console.log('Fixed TS errors 4');
