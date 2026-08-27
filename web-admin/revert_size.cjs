const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// The thead was:
// <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
// We'll keep the tight width columns, but increase text to text-xs
code = code.replace(
    /<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-\[10px\] font-bold text-slate-500 uppercase tracking-tight">/,
    '<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-tight">'
);

// The tbody was:
// <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 leading-tight">
code = code.replace(
    /<tbody className="divide-y divide-slate-100 text-\[11px\] text-slate-700 leading-tight">/,
    '<tbody className="divide-y divide-slate-100 text-[12px] text-slate-700 leading-tight">'
);

// We should also loosen the padding slightly from px-1.5 py-2 to px-2 py-2.5
code = code.replace(/px-1\.5 py-2/g, 'px-2 py-2.5');

// Let's also remove text-[9px] and change to text-[10px] or text-[11px]
code = code.replace(/text-\[9px\]/g, 'text-[10px]');
code = code.replace(/text-\[8px\]/g, 'text-[10px]');

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
