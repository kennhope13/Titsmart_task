const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// 1. Remove reverse from currentProjExpenses
pageCode = pageCode.replace(
  /return computed\.reverse\(\);\s*\}, \[expenses, selectedProject\]\);/g,
  `return computed;
  }, [expenses, selectedProject]);`
);

// 2. Remove reverse from combinedCashFlow
pageCode = pageCode.replace(
  /return computed\.reverse\(\);\s*\}, \[filteredProjExpenses, filteredProjLabor\]\);/g,
  `return computed;
  }, [filteredProjExpenses, filteredProjLabor]);`
);

fs.writeFileSync(pageFile, pageCode);
console.log('Removed reverse() from sort');
