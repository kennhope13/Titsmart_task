const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectOverviewTab.tsx', 'utf-8');

// Add matPercent
if (!content.includes('const matPercent =')) {
  content = content.replace(
    /const totalMatActual = projMaterials.reduce\(\(sum, m\) => sum \+ \(m\.orderedVolume \|\| 0\), 0\);/,
    "const totalMatActual = projMaterials.reduce((sum, m) => sum + (m.orderedVolume || 0), 0);\n  const matPercent = totalMatEstimate > 0 ? Math.min(Math.round((totalMatActual / totalMatEstimate) * 100), 100) : 0;"
  );
}

// Replace the cards block
const newCards = \      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiến độ công việc</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined text-lg">fact_check</span>
            </div>
          </div>
          <div>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{progressPercent}%</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: \\\\%\n\\\ }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{completedTasks} / {totalTasks} công việc</p>
          </div>
        </div>

        {/* Budget Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng chi phí</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <h3 className="text-[22px] leading-tight font-black text-slate-800 truncate" title={formatCurrency(totalExpense)}>{formatCurrency(totalExpense)}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: \\\\%\n\\\ }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{budgetPercent}% hợp đồng</p>
          </div>
        </div>

        {/* Materials Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vật tư đã xuất</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
            </div>
          </div>
          <div>
            <h3 className="text-[22px] leading-tight font-black text-slate-800 truncate" title={totalMatActual.toLocaleString('vi-VN')}>{totalMatActual.toLocaleString('vi-VN')}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: \\\\%\n\\\ }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Dự toán: {totalMatEstimate.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        {/* Personnel Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nhân sự tham gia</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
              <span className="material-symbols-outlined text-lg">groups</span>
            </div>
          </div>
          <div>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{assignedEngineers.length}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-purple-500 h-1.5 rounded-full w-full opacity-30"></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">người</p>
          </div>
        </div>
      </div>\;
\

const startIndex = content.indexOf('{/* SUMMARY CARDS */}');
const endIndex = content.indexOf('{/* CHARTS */}');
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newCards + '\n\n      ' + content.substring(endIndex);
  // fix template string escaping
  content = content.replace(/\\\\\\\\$\\{progressPercent\\}%\\n\\\\\/g, '\\%\');
  content = content.replace(/\\\\\\\\$\\{budgetPercent\\}%\\n\\\\\/g, '\\%\');
  content = content.replace(/\\\\\\\\$\\{matPercent\\}%\\n\\\\\/g, '\\%\');
  fs.writeFileSync('src/pages/ProjectOverviewTab.tsx', content, 'utf-8');
  console.log('done');
} else {
  console.log('could not find block');
}
