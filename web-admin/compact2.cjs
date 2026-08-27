const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

code = code.replace(/className="flex flex-col gap-1\.5 w-full text-xs"/g, 'className="flex flex-col gap-0.5 w-full text-xs py-0.5"');
fs.writeFileSync('src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
