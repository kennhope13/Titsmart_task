const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectOverviewTab.tsx', 'utf-8');

// 1. Add recharts imports
content = content.replace(
  "import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';",
  "import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';"
);

// 2. Insert new data calculations before return
const newCalc = \
  // --- COST CHART DATA ---
  const costChartData = [
    { name: 'Ngân sách', value: contractValue, color: '#94a3b8' },
    { name: 'Đã chi', value: totalExpense, color: '#10b981' }
  ];

  // --- RECENT LOGS ---
  const recentLogs = [...projLogs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 4);
\;

content = content.replace(
  '  return (',
  newCalc + '\n  return ('
);

// 3. Insert new UI blocks before the final closing </div></div> of the file
const newUI = \
      {/* WIDGETS DƯỚI CÙNG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
        {/* Cost Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-slate-400">bar_chart</span>
            Biểu đồ Chi phí
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\\\\M\\\} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {costChartData.map((entry, index) => (
                    <Cell key={\\\cell-\\\\\\} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Field Logs Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-slate-400">history</span>
              Nhật ký hiện trường gần đây
            </h3>
            <button onClick={() => navigate(\\\/projects/\\\/field-logs\\\)} className="text-xs font-semibold text-primary hover:underline">
              Xem tất cả
            </button>
          </div>
          <div className="space-y-4">
            {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
              <div key={log.id} className="relative pl-6">
                {/* Timeline line */}
                {idx !== recentLogs.length - 1 && (
                  <div className="absolute left-1.5 top-5 bottom-[-16px] w-px bg-slate-200"></div>
                )}
                {/* Dot */}
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm"></div>
                {/* Content */}
                <div className="text-[11px] text-slate-500 mb-1">{new Date(log.timestamp).toLocaleString('vi-VN')}</div>
                <div className="text-sm text-slate-700 font-medium line-clamp-2">{log.note || 'Không có nội dung'}</div>
                {log.images && log.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {log.images.slice(0, 3).map((img, i) => (
                      <div key={i} className="w-10 h-10 rounded border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-sm">image</span>
                      </div>
                    ))}
                    {log.images.length > 3 && (
                      <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-medium">
                        +\\\
                      </div>
                    )}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-sm text-slate-400 italic text-center py-4">Chưa có nhật ký nào</div>
            )}
          </div>
        </div>
      </div>\;
\;

content = content.replace(
  '      </div>\n    </div>\n  );\n};\n',
  newUI + '\n    </div>\n  );\n};\n'
);

// fix backticks
content = content.replace(/\\\\\\\/g, '\');
content = content.replace(/\\\\\$/g, '$');

fs.writeFileSync('src/pages/ProjectOverviewTab.tsx', content, 'utf-8');
console.log('done');
