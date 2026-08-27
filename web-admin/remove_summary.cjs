const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// 1. Remove TỔNG HỢP QUỸ block
const summaryBlockRegex = /\s*\{\/\* 1\. TỔNG HỢP QUỸ \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*(?=\{\/\* 2\. CHI TIẾT PHIẾU CHI \*\/)/;
code = code.replace(summaryBlockRegex, '\n');

// 2. Make CHI TIẾT PHIẾU CHI stretch
code = code.replace(
  /\{\/\* 2\. CHI TIẾT PHIẾU CHI \*\/}\s*<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col">/g,
  `{/* CHI TIẾT PHIẾU CHI */}\n            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">`
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
