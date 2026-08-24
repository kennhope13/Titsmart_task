const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

f = f.replace('flex flex-col gap-1.5 p-1.5 w-full text-left pl-3', 'flex flex-col gap-1.5 p-1.5 w-full items-center justify-center');
f = f.replace(/<div className="flex items-center gap-2">/g, '<div className="flex items-center justify-center gap-2">');

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
