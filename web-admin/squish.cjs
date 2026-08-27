const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

// Change the outer flex container from overflowing to a hugging flex container
// from: <div className="overflow-x-auto pb-2 w-full custom-scrollbar">
//        <div className="flex gap-4 min-w-max items-center">
// to:   <div className="w-full">
//        <div className="flex gap-2 w-full items-center">
code = code.replace(/<div className="overflow-x-auto pb-2 w-full custom-scrollbar">\s*<div className="flex gap-4 min-w-max items-center">/,
                    '<div className="w-full">\n<div className="flex gap-1.5 w-full items-start justify-between">');

// Remove shrink-0 and fixed widths (w-48, w-64, w-72) and change to flex-1 or just small text classes
code = code.replace(/className="border-collapse text-sm w-48 shrink-0 bg-white"/g, 'className="border-collapse text-[11px] flex-1 bg-white"');
code = code.replace(/className="border-collapse text-sm w-64 shrink-0 bg-white"/g, 'className="border-collapse text-[11px] flex-[1.2] bg-white"');
code = code.replace(/className="border-collapse text-sm w-72 shrink-0 bg-white"/g, 'className="border-collapse text-[11px] flex-[1.2] bg-white"');

// Reduce header font sizes to fit
code = code.replace(/py-1 px-2 text-center/g, 'py-1 px-1 text-[9px] text-center uppercase leading-tight');
code = code.replace(/py-1 px-2 font-bold text-center w-1\/2/g, 'py-1 px-1 text-[9px] font-bold text-center uppercase leading-tight w-1/2');

// Reduce data cell paddings and font size
code = code.replace(/py-1 px-2 font-semibold/g, 'py-1 px-1 text-[11px] font-bold');
code = code.replace(/py-1 font-semibold text-slate-800/g, 'py-1 px-1 text-[11px] font-bold text-slate-800');
code = code.replace(/text-sm/g, 'text-[11px]');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
