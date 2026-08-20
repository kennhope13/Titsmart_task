const fs = require('fs');
const path = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all ${',
  'className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all ${'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched CostPlan tabs');
