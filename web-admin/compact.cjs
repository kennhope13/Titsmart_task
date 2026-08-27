const fs = require('fs');

let code = fs.readFileSync('src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

code = code.replace(/className="flex flex-col gap-1\.5 py-1"/g, 'className="flex flex-col gap-0.5 py-0.5"');
code = code.replace(/min-h-\[20px\]/g, 'min-h-[16px]');
code = code.replace(/px-1 py-0\.5/g, 'px-1 py-0');
code = code.replace(/mt-0\.5/g, 'mt-0');

fs.writeFileSync('src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
