const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// Remove the H2 containing "CHI TIẾT PHIẾU CHI"
pageCode = pageCode.replace(
  /<h2 className="text-\[14px\] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">\s*CHI TIẾT PHIẾU CHI\s*<\/h2>/g,
  ''
);

// Change justify-between to justify-end so the filters stay aligned to the right
pageCode = pageCode.replace(
  /className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3 sticky top-0 z-20 items-center justify-between/g,
  'className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3 sticky top-0 z-20 items-center justify-end'
);

fs.writeFileSync(pageFile, pageCode);
console.log('Done');
