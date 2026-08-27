const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

// Change w-full min-w-[800px] to w-max
code = code.replace('<table className="w-full min-w-[800px] border-collapse text-sm">', '<table className="border-collapse text-sm w-max">');

// Change w-1/4 to w-60 (240px)
code = code.replace(/className="w-1\/4/g, 'className="w-[200px]');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
