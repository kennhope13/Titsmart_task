const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// replace all py-2.5 with py-1.5 to ensure table is fully compact
pageCode = pageCode.replace(/py-2\.5/g, 'py-1.5');

fs.writeFileSync(pageFile, pageCode);
console.log('Fully reduced padding');
