const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

const targetStr = `      docCo,
      docCq,
      docFireInspection,
    };`;

const replacement = `      docCo,
      docCq,
      docFireInspection,
      docStamp,
    };`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
console.log('Fixed payload');
