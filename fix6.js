const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');

code = code.replace(
  /className=\{\`flex items-center gap-2 py-2\.5 text-\[13px\] font-bold border-b-2/g,
  'className={`flex items-center gap-2 py-1.5 text-[12px] font-bold border-b-2'
);

code = code.replace(
  /<span className="material-symbols-outlined text-lg">\{tab\.icon\}<\/span>/g,
  '<span className="material-symbols-outlined text-[16px]">{tab.icon}</span>'
);

fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', code);
console.log('Fixed ProjectCostPlanPage');
