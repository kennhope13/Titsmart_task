const fs = require('fs');

// 1. ProjectCostPlanPage.tsx
const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');
pageCode = pageCode.replace(
  /<div className="bg-white border-t border-slate-200 overflow-hidden flex-1 flex flex-col mt-4">/g,
  '<div className="bg-white border-t border-slate-200 overflow-hidden flex-1 flex flex-col">'
);
fs.writeFileSync(pageFile, pageCode);

// 2. CostPlanSummaryTable.tsx
const tableFile = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let tableCode = fs.readFileSync(tableFile, 'utf8');
tableCode = tableCode.replace(
  /<div className="w-full mb-4">/g,
  '<div className="w-full">'
);
// Also reduce the pb-2 on the overflow-x-auto if any
tableCode = tableCode.replace(
  /<div className="w-full overflow-x-auto pb-2 custom-scrollbar">/g,
  '<div className="w-full overflow-x-auto custom-scrollbar">'
);
fs.writeFileSync(tableFile, tableCode);

console.log('Fixed gaps');
