const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

code = code.replace(
  '<table className="w-full min-w-[800px] border-collapse text-sm">',
  '<table className="border-collapse text-[11px] w-auto">'
);

code = code.replace(/className="w-1\/4/g, 'className="min-w-[150px] max-w-[220px]');

// Adjust font size for headers
code = code.replace(/py-1 px-2 text-center/g, 'py-1 px-2 text-[10px] text-center whitespace-nowrap');
code = code.replace(/text-sm/g, 'text-xs');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
