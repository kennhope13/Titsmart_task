const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

f = f.replace(/userRole\s*\n\}\) => \{/, "userRole,\n  activeSubTab\n}) => {");

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f);
