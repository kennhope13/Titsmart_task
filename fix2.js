const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');

code = code.replace(
  '<div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-1 shadow-xs border-x">',
  '<div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs border-x">'
);

code = code.replace(
  /className=\{\`flex items-center gap-2 py-3\.5 text-\[13px\] font-bold border-b-2/g,
  'className={`flex items-center gap-2 py-2.5 text-[13px] font-bold border-b-2'
);

fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', code);
console.log('Fixed ProjectCostPlanPage tabs');
