const fs = require('fs');
const file = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will insert CT TT CÔNG NHẬT back right before TRÌNH
const ctCongNhat = `
          {/* CT TT CÔNG NHẬT */}
          <table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-1 px-2 text-[11px] font-bold text-center uppercase">CT TT CÔNG NHẬT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800">
                  {money(summary.totalLabor)}
                </td>
              </tr>
            </tbody>
          </table>
`;

if (!code.includes('CT TT CÔNG NHẬT')) {
  code = code.replace(
    /{[\s\*\/]*TRÌNH[\s\*\/]*}/,
    ctCongNhat.trim() + '\n\n          {/* TRÌNH */}'
  );
  fs.writeFileSync(file, code);
  console.log('Restored CT TT CÔNG NHẬT');
} else {
  console.log('Already exists');
}
