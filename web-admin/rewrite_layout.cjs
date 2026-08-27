const fs = require('fs');

let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

const newLayout = `
    <div className="w-full mb-4">
      <div className="overflow-x-auto pb-2 w-full custom-scrollbar">
        <div className="flex gap-4 min-w-max items-center">
          
          {/* QUỸ CÔNG TRÌNH */}
          <table className="border-collapse text-sm w-48 shrink-0 bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">QUỸ CÔNG TRÌNH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td 
                  className="border border-slate-300 text-center py-1 font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    if (!editingProjectFund) {
                      setProjectFundInput(summary.totalProjectFund.toString());
                      setEditingProjectFund(true);
                    }
                  }}
                >
                  {editingProjectFund ? (
                    <input
                      autoFocus
                      type="number"
                      className="w-full text-center border-2 border-primary rounded outline-none px-1 text-slate-900"
                      value={projectFundInput}
                      onChange={e => setProjectFundInput(e.target.value)}
                      onBlur={() => {
                        setEditingProjectFund(false);
                        if (onAllocateFund && projectFundInput.trim() !== '') {
                          const val = Number(projectFundInput);
                          if (!isNaN(val) && val !== summary.totalProjectFund) {
                            onAllocateFund('__PROJECT__', val);
                          }
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-2 group">
                      <span>{money(summary.totalProjectFund)}</span>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỔNG CHI */}
          <table className="border-collapse text-sm w-48 shrink-0 bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">TỔNG CHI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">
                  {money(summary.totalChi)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỒN CUỐI KỲ */}
          <table className="border-collapse text-sm w-48 shrink-0 bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">TỒN CUỐI KỲ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">
                  {money(summary.tonCuoiKy)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* CT TT CÔNG NHẬT */}
          <table className="border-collapse text-sm w-48 shrink-0 bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">CT TT CÔNG NHẬT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">
                  {money(summary.totalLabor)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TRÌNH */}
          <table className="border-collapse text-sm w-64 shrink-0 bg-white">
            <tbody>
              <tr>
                <td className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-2 text-center w-1/2">TRÌNH</td>
                <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2 relative">
                  {money(summary.totalProjectExpense)}
                  <div className="w-full h-1 bg-slate-100 mt-1">
                    <div className="h-full bg-orange-400" style={{ width: summary.totalProjectFund > 0 ? \`\${Math.min(100, (summary.totalProjectExpense / summary.totalProjectFund) * 100)}%\` : '0%' }}></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỪNG NGƯỜI */}
          {spenderNames.map((name, idx) => {
            const ton = summary.bySpender[name].quy - summary.bySpender[name].chi;
            const colorClass = idx % 3 === 0 ? 'bg-red-100 text-red-800' : idx % 3 === 1 ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800';
            
            return (
              <React.Fragment key={name}>
                {/* TỔNG CHI CÁ NHÂN */}
                <table className="border-collapse text-sm w-72 shrink-0 bg-white">
                  <tbody>
                    <tr>
                      <td className={\`border border-slate-300 py-1 px-2 font-bold text-center w-1/2 \${colorClass}\`}>
                        TỔNG CHI ({name.toUpperCase()})
                      </td>
                      <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">
                        {money(summary.bySpender[name].chi)}
                        <div className="w-full h-1 bg-slate-100 mt-1">
                          <div className="h-full bg-rose-400" style={{ width: summary.bySpender[name].quy > 0 ? \`\${Math.min(100, (summary.bySpender[name].chi / summary.bySpender[name].quy) * 100)}%\` : '0%' }}></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* TỒN QUỸ CÁ NHÂN */}
                <table className="border-collapse text-sm w-72 shrink-0 bg-white">
                  <tbody>
                    <tr>
                      <td className={\`border border-slate-300 py-1 px-2 font-bold text-center w-1/2 \${colorClass}\`}>
                        TỒN QUỸ ({name.toUpperCase()})
                      </td>
                      <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">
                        {money(ton)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* TỔNG QUỸ CÁ NHÂN */}
                <table className="border-collapse text-sm w-72 shrink-0 bg-white">
                  <tbody>
                    <tr>
                      <td className={\`border border-slate-300 py-1 px-2 font-bold text-center w-1/2 \${colorClass}\`}>
                        TỔNG QUỸ ({name.toUpperCase()})
                      </td>
                      <td 
                        className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2 cursor-pointer hover:bg-slate-50 transition-colors"
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
          })}

        </div>
      </div>
    </div>
  );
};`;

const blockRegex = /<div className="w-full mb-4">[\s\S]*?<\/div>\s*<\/div>\s*\);\s*};\s*$/;
code = code.replace(blockRegex, newLayout);

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
