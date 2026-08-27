const fs = require('fs');
const file = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let code = fs.readFileSync(file, 'utf8');

// The orange progress bar code:
// <div className="w-full h-1 bg-slate-100 mt-1">
//   <div className="h-full bg-orange-400" style={{ width: summary.totalProjectFund > 0 ? `${Math.min(100, (summary.totalProjectExpense / summary.totalProjectFund) * 100)}%` : '0%' }}></div>
// </div>
code = code.replace(
  /<div className="w-full h-1 bg-slate-100 mt-1">\s*<div className="h-full bg-orange-400"[\s\S]*?<\/div>\s*<\/div>/g,
  ''
);

// The rose progress bar code
code = code.replace(
  /<div className="w-full h-1 bg-slate-100 mt-1">\s*<div className="h-full bg-rose-400"[\s\S]*?<\/div>\s*<\/div>/g,
  ''
);

fs.writeFileSync(file, code);
console.log('Removed');
