const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');
code = code.replace(/list="(spender-names|expense-content-types)"[\s\S]*?className="(.*?)"/g, (match, p1, p2) => {
  if (!p2.includes('cursor-pointer')) {
    return match.replace(p2, p2 + ' cursor-pointer');
  }
  return match;
});
fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
