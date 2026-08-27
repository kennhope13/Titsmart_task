const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

const regexTrinh = /<table className="border-collapse text-\[11px\] flex-\[1\.2\] bg-white">\s*<tbody>\s*<tr>\s*<td className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-1 text-\[9px\] text-center uppercase leading-tight w-1\/2">TRÌNH<\/td>\s*<td className="border border-slate-300 text-center py-1 px-1 text-\[11px\] font-bold text-slate-800 w-1\/2 relative">/;

code = code.replace(regexTrinh, `<table className="border-collapse text-[11px] flex-1 bg-white">
    <thead>
      <tr>
        <th className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-1 text-[9px] text-center uppercase leading-tight">TRÌNH</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="border border-slate-300 text-center py-1 px-1 text-[11px] font-bold text-slate-800 relative">`);

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
console.log('Done');
