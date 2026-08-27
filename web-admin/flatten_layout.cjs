const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// 1. Change the wrapper of the EXPENSE tab to be flat white with no padding
code = code.replace(
  /<div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-100 py-4 px-1 md:px-2 flex flex-col gap-6" id="expense-unified-view">/g,
  '<div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-white flex flex-col" id="expense-unified-view">'
);

// 2. Remove the rounded card around CHI TIẾT PHIẾU CHI
code = code.replace(
  /<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">/g,
  '<div className="bg-white border-t border-slate-200 overflow-hidden flex-1 flex flex-col mt-4">'
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
console.log('Done flattening layout');
