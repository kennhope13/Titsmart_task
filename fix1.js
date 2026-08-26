const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');

const regex = /<div className="flex items-center gap-4 border-b border-slate-200 px-4 pt-1 bg-white shrink-0">([\s\S]*?)className=\{\`app-tab-button flex items-center gap-2\.5 px-3 py-3 border-b-2/g;

if (regex.test(code)) {
  code = code.replace(
    /<div className="flex items-center gap-4 border-b border-slate-200 px-4 pt-1 bg-white shrink-0">/g, 
    '<div className="flex items-center gap-4 border-b border-slate-200 px-4 bg-white shrink-0">'
  );
  code = code.replace(
    /className=\{\`app-tab-button flex items-center gap-2\.5 px-3 py-3 border-b-2/g,
    'className={`app-tab-button flex items-center gap-2.5 px-3 py-2 border-b-2'
  );
  fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', code);
  console.log('Fixed ProjectCostPlanPage.tsx');
} else {
  console.log('Not found in ProjectCostPlanPage.tsx');
}
