const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Change text-emerald-700 to text-slate-700 for KL HĐ cell
f = f.replace(/align-middle text-emerald-700/g, 'align-middle text-slate-700');
f = f.replace(/text-emerald-700 font-semibold focus:outline-primary/g, 'text-slate-700 font-semibold focus:outline-primary');

// 2. Change plan.model to plan.techSpecModel and plan.origin to plan.techSpecOrigin
// In the recent injection:
f = f.replace(/plan\.model/g, 'plan.techSpecModel');
f = f.replace(/'model'/g, "'techSpecModel'");

f = f.replace(/plan\.origin/g, 'plan.techSpecOrigin');
f = f.replace(/'origin'/g, "'techSpecOrigin'");


fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
