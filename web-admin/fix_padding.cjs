const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// Reduce horizontal padding of the tab container from p-4 to py-4 px-1
code = code.replace(
  /<div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-100 p-4 flex flex-col gap-6" id="expense-unified-view">/g,
  '<div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-100 py-4 px-1 md:px-2 flex flex-col gap-6" id="expense-unified-view">'
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
console.log('Done padding');
