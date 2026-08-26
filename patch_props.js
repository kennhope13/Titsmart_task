const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

f = f.replace("interface MaterialAndPurchasingTabProps {", "interface MaterialAndPurchasingTabProps {\n  activeSubTab?: 'TECH' | 'ORDER' | 'DOCS' | 'FINANCE';");

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f);
