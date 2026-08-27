const fs = require('fs');
const file = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/maxWidth="max-w-6xl"/g, 'size="xl"');
fs.writeFileSync(file, code);
console.log('Fixed');
