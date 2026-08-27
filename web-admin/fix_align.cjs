const fs = require('fs');
const file = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change the flex wrapper to allow stretching and center it
code = code.replace(
  /<div className="flex gap-3 min-w-max items-start">/g,
  '<div className="flex gap-3 w-full items-start justify-center">'
);

// Change the 5 top cards from w-44 shrink-0 to flex-1 min-w-[140px]
code = code.replace(/<table className="border-collapse text-sm w-44 shrink-0 bg-white">/g, '<table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">');

fs.writeFileSync(file, code);
console.log('Fixed');
