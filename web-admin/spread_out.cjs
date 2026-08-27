const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

// 1. Change the wrapper back to overflow-x-auto
code = code.replace(/<div className="w-full">\s*<div className="flex gap-1\.5 w-full items-start justify-between">/,
                    '<div className="w-full overflow-x-auto pb-2 custom-scrollbar">\n<div className="flex gap-3 min-w-max items-start">');

// 2. Change flex-1 to fixed widths w-40 shrink-0
code = code.replace(/className="border-collapse text-\[11px\] flex-1 bg-white"/g, 'className="border-collapse text-sm w-44 shrink-0 bg-white"');

// 3. Restore font sizes for headers
code = code.replace(/py-1 px-1 text-\[9px\]/g, 'py-1 px-2 text-[10px]');
code = code.replace(/uppercase leading-tight/g, ''); // we can remove uppercase leading-tight, or keep it. Let's keep it but make it text-[10px]

// Wait, the regex might be tricky. Let's do simple text replacement.
code = code.replace(/py-1 px-1 text-\[9px\] text-center uppercase leading-tight/g, 'py-1 px-2 text-[11px] text-center uppercase font-bold');
code = code.replace(/py-1 px-1 text-\[9px\] font-bold text-center uppercase leading-tight/g, 'py-1 px-2 text-[11px] font-bold text-center uppercase');

// 4. Restore font sizes for values
code = code.replace(/py-1 px-1 text-\[11px\]/g, 'py-1.5 px-2 text-sm');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
console.log("Done spreading out.");
