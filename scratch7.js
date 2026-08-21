const fs = require('fs');

let c = fs.readFileSync('web-admin/src/pages/cost-plan/PurchasingTab.tsx', 'utf8');

c = c.replace('className={\w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors \\}', 'className={\w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors \\}');

fs.writeFileSync('web-admin/src/pages/cost-plan/PurchasingTab.tsx', c);
console.log('Fixed invoice style');
