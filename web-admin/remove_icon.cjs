const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');
pageCode = pageCode.replace(
  /<span className="material-symbols-outlined text-primary text-\[18px\]">receipt_long<\/span>/g,
  ''
);
fs.writeFileSync(pageFile, pageCode);

console.log('Removed icon');
