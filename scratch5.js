const fs = require('fs');
let c = fs.readFileSync('web-admin/src/pages/TaskManagementPage.tsx', 'utf8');

const s1 = 'className="w-full min-w-0 rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[10px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white">{PURCHASE_STATUS_OPTIONS.map';
const r1 = 'className={w-full min-w-0 rounded border px-1 py-0.5 text-[10px] font-bold focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white transition-colors ' + '' + '}>{PURCHASE_STATUS_OPTIONS.map';

const s2 = 'className="w-full min-w-0 rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[10px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white">{CONSTRUCTION_STATUS_OPTIONS.map';
const r2 = 'className={w-full min-w-0 rounded border px-1 py-0.5 text-[10px] font-bold focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white transition-colors ' + '' + '}>{CONSTRUCTION_STATUS_OPTIONS.map';

c = c.replace(s1, r1);
c = c.replace(s2, r2);

fs.writeFileSync('web-admin/src/pages/TaskManagementPage.tsx', c);
console.log('Replaced custom selects in TaskManagementPage');
