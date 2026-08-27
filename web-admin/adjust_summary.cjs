const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

// Undo font size reduction
code = code.replace(/text-\[11px\]/g, 'text-sm');
code = code.replace(/text-\[10px\]/g, 'text-xs');

// Change back to w-full but bounded
code = code.replace('<table className="border-collapse text-sm w-max">', '<table className="border-collapse text-sm w-full max-w-5xl mx-auto">');

// Revert fixed widths to w-1/4
code = code.replace(/w-\[200px\]/g, 'w-1/4');

// Wrap it in a flex centered container
code = code.replace('<div className="overflow-x-auto">', '<div className="overflow-x-auto flex justify-center w-full">');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
