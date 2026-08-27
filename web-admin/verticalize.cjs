const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

// The TRÌNH block:
// <table className="border-collapse text-[11px] flex-[1.2] bg-white">
//   <tbody>
//     <tr>
//       <td className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-1 text-[9px] text-center uppercase leading-tight w-1/2">TRÌNH</td>
//       <td className="border border-slate-300 text-center py-1 px-1 text-[11px] font-bold text-slate-800 w-1/2 relative">
code = code.replace(
  /<table className="border-collapse text-\[11px\] flex-\[1\.2\] bg-white">\s*<tbody>\s*<tr>\s*<td className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-1 text-\[9px\] text-center uppercase leading-tight w-1\/2">TRÌNH<\/td>\s*<td className="border border-slate-300 text-center py-1 px-1 text-\[11px\] font-bold text-slate-800 w-1\/2 relative">/g,
  `<table className="border-collapse text-[11px] flex-1 bg-white">
    <thead>
      <tr>
        <th className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-1 text-[9px] text-center uppercase leading-tight">TRÌNH</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="border border-slate-300 text-center py-1 px-1 text-[11px] font-bold text-slate-800 relative">`
);

// TỔNG CHI CÁ NHÂN
code = code.replace(
  /<table className="border-collapse text-\[11px\] flex-\[1\.2\] bg-white">\s*<tbody>\s*<tr>\s*<td className={`border border-slate-300 py-1 px-1 text-\[9px\] font-bold text-center uppercase leading-tight w-1\/2 \${colorClass}`}>/g,
  `<table className="border-collapse text-[11px] flex-1 bg-white">
    <thead>
      <tr>
        <th className={\`border border-slate-300 py-1 px-1 text-[9px] font-bold text-center uppercase leading-tight \${colorClass}\`}>`
);

// To fix the structure of the personal tables, I need a robust replacement
// Let's rewrite the TỪNG NGƯỜI map entirely
const replacementMap = `{spenderNames.map((name, idx) => {
            const ton = summary.bySpender[name].quy - summary.bySpender[name].chi;
            const colorClass = idx % 3 === 0 ? 'bg-red-100 text-red-800' : idx % 3 === 1 ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800';
            
            return (
              <React.Fragment key={name}>
                {/* TỔNG CHI CÁ NHÂN */}
                <table className="border-collapse text-[11px] flex-1 bg-white">
                  <thead>
                    <tr>
                      <th className={\`border border-slate-300 py-1 px-1 text-[9px] font-bold text-center uppercase leading-tight \${colorClass}\`}>
                        TỔNG CHI ({name})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 px-1 text-[11px] font-bold text-slate-800">
                        {money(summary.bySpender[name].chi)}
                        <div className="w-full h-1 bg-slate-100 mt-1">
                          <div className="h-full bg-rose-400" style={{ width: summary.bySpender[name].quy > 0 ? \`\${Math.min(100, (summary.bySpender[name].chi / summary.bySpender[name].quy) * 100)}%\` : '0%' }}></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* TỒN QUỸ CÁ NHÂN */}
                <table className="border-collapse text-[11px] flex-1 bg-white">
                  <thead>
                    <tr>
                      <th className={\`border border-slate-300 py-1 px-1 text-[9px] font-bold text-center uppercase leading-tight \${colorClass}\`}>
                        TỒN QUỸ ({name})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 px-1 text-[11px] font-bold text-slate-800">
                        {money(ton)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* TỔNG QUỸ CÁ NHÂN */}
                <table className="border-collapse text-[11px] flex-1 bg-white">
                  <thead>
                    <tr>
                      <th className={\`border border-slate-300 py-1 px-1 text-[9px] font-bold text-center uppercase leading-tight \${colorClass}\`}>
                        TỔNG QUỸ ({name})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td 
                        className="border border-slate-300 text-center py-1 px-1 text-[11px] font-bold text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          if (onAllocateFund) onAllocateFund(name);
                        }}
                      >
                        <div className="flex items-center justify-center gap-2 group">
                          <span>{money(summary.bySpender[name].quy)}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </React.Fragment>
            );
          })}`;

code = code.replace(/\{spenderNames\.map\(\(name, idx\) => \{[\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};\s*$/m, replacementMap + '\n        </div>\n      </div>\n    </div>\n  );\n};');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
