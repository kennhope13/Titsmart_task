const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// For Expense table
code = code.replace(
  /<th className="px-2 py-2\.5 min-w-\[120px\]">Nội dung \/ Diễn giải<\/th>/g,
  '<th className="px-2 py-2.5 w-full min-w-[200px]">Nội dung / Diễn giải</th>'
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
console.log('Done');
