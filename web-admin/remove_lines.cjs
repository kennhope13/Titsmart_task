const fs = require('fs');
const file = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove the orange progress bar from TRÌNH
code = code.replace(
  /<div className="w-full h-1 bg-slate-100 mt-1">\s*<div className="h-full bg-orange-400" style={{ width: [^}]+ }}><\/div>\s*<\/div>/g,
  ''
);

// Also remove the rose progress bar from TỔNG CHI CÁ NHÂN in the modal just to be consistent, if they want lines removed.
// Actually, let's just remove all progress bars in CostPlanSummaryTable since they seem to dislike them.
code = code.replace(
  /<div className="w-full h-1 bg-slate-100 mt-1">\s*<div className="h-full bg-rose-400"[^>]+><\/div>\s*<\/div>/g,
  ''
);

fs.writeFileSync(file, code);
console.log('Removed lines');
