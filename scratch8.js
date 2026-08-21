const fs = require('fs');

let c = fs.readFileSync('web-admin/src/pages/TaskManagementPage.tsx', 'utf8');

const targetStr = 'className="w-full min-w-0 rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[10px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white">{';

const purchaseRepl = 'className={w-full min-w-0 rounded border px-1 py-0.5 text-[10px] font-bold focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white transition-colors }>{';

const constrRepl = 'className={w-full min-w-0 rounded border px-1 py-0.5 text-[10px] font-bold focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white transition-colors }>{';

const parts = c.split(targetStr);
if (parts.length >= 3) {
  c = parts[0] + purchaseRepl + parts[1] + constrRepl + parts.slice(2).join(targetStr);
} else {
  console.log('Parts count:', parts.length);
}

fs.writeFileSync('web-admin/src/pages/TaskManagementPage.tsx', c);
