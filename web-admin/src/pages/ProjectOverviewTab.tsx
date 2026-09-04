import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';

export const ProjectOverviewTab: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, tasks, expenses, engineers, materialPlans, documentTracks, fieldLogs } = useRealtimeStore();

  const project = useMemo(() => {
    return projects.find(p => p.id === projectId || p.code === projectId);
  }, [projectId, projects]);

  if (!project) {
    return <div className="p-6 text-center text-slate-500">Không tìm thấy thông tin dự án.</div>;
  }

  // --- 1. TIẾN ĐỘ ---
  const projTasks = tasks.filter(t => t.projectCode === project.code);
  const totalTasks = projTasks.length;
  const completedTasks = projTasks.filter(t => t.status === 'Hoàn thành').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // --- 2. VẬT TƯ & CHI PHÍ ---
  const projExpenses = expenses.filter(e => e.projectCode === project.code);
  const totalExpense = projExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const contractValue = project.contractValue || 0;
  const budgetPercent = contractValue > 0 ? Math.min(Math.round((totalExpense / contractValue) * 100), 100) : 0;

  // --- 3. HỒ SƠ ---
  const projDocs = documentTracks ? documentTracks.filter(d => d.projectCode === project.code) : [];
  const totalDocs = projDocs.length;
  const completedDocs = projDocs.filter(d => d.docStatus === 'Hoàn thành' || d.docStatus === 'Đã duyệt').length;
  const docPercent = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

  // --- 4. KHO DỰ ÁN ---
  const projMaterials = materialPlans.filter(m => m.projectCode === project.code);
  const totalMatEstimate = projMaterials.reduce((sum, m) => sum + (m.contractVolume || 0), 0);
  const totalMatActual = projMaterials.reduce((sum, m) => sum + (m.orderedVolume || 0), 0);
  const matPercent = totalMatEstimate > 0 ? Math.min(Math.round((totalMatActual / totalMatEstimate) * 100), 100) : 0;

  // --- 5. NHẬT KÝ HIỆN TRƯỜNG ---
  const projLogs = fieldLogs ? fieldLogs.filter(l => l.projectCode === project.code) : [];
  const totalLogs = projLogs.length;

  // --- 6. NHÂN SỰ ---
  const assignedEngineers = engineers.filter(eng => Array.isArray(eng.projectCodes) && eng.projectCodes.includes(project.code));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // --- CHART DATA ---
  const taskStatusData = [
    { name: 'Chưa làm', value: projTasks.filter(t => t.status === 'Chưa làm').length, color: '#94a3b8' },
    { name: 'Đang làm', value: projTasks.filter(t => t.status === 'Đang làm').length, color: '#3b82f6' },
    { name: 'Chờ nghiệm thu', value: projTasks.filter(t => t.status === 'Chờ nghiệm thu').length, color: '#f59e0b' },
    { name: 'Hoàn thành', value: completedTasks, color: '#10b981' },
  ].filter(d => d.value > 0);

  const costChartData = [
    { name: 'Ngân sách', value: contractValue, color: '#94a3b8' },
    { name: 'Đã chi', value: totalExpense, color: '#10b981' }
  ];

  const recentLogs = [...projLogs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 4);

  return (
    <div className="p-6 space-y-6 overflow-y-auto bg-slate-50 flex-1">
      
      {/* 6 SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Tiến độ */}
        <div onClick={() => navigate(`/projects/${project.id}/tasks`)} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] cursor-pointer hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Tiến độ công việc</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-100 transition-colors">
              <span className="material-symbols-outlined text-lg">fact_check</span>
            </div>
          </div>
          <div>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{progressPercent}%</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{completedTasks} / {totalTasks} công việc</p>
          </div>
        </div>

        {/* 2. Vật tư & Chi phí */}
        <div onClick={() => navigate(`/projects/${project.id}/cost-plan`)} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] cursor-pointer hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Vật tư & Chi phí</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 group-hover:bg-emerald-100 transition-colors">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <h3 className="text-[20px] leading-tight font-black text-slate-800 truncate" title={formatCurrency(totalExpense)}>{formatCurrency(totalExpense)}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${budgetPercent}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{budgetPercent}% hợp đồng</p>
          </div>
        </div>

        {/* 3. Hồ sơ */}
        <div onClick={() => navigate(`/projects/${project.id}/documents`)} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] cursor-pointer hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-rose-600 transition-colors">Hồ sơ</p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 group-hover:bg-rose-100 transition-colors">
              <span className="material-symbols-outlined text-lg">file_present</span>
            </div>
          </div>
          <div>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{totalDocs}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${docPercent}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{completedDocs} / {totalDocs} hoàn thành</p>
          </div>
        </div>

        {/* 4. Kho Dự Án */}
        <div onClick={() => navigate(`/projects/${project.id}/inventory`)} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] cursor-pointer hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">Kho dự án</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 group-hover:bg-amber-100 transition-colors">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
            </div>
          </div>
          <div>
            <h3 className="text-[20px] leading-tight font-black text-slate-800 truncate" title={totalMatActual.toLocaleString('vi-VN')}>{totalMatActual.toLocaleString('vi-VN')}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${matPercent}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Dự toán: {totalMatEstimate.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        {/* 5. Nhật ký hiện trường */}
        <div onClick={() => navigate(`/projects/${project.id}/field-logs`)} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] cursor-pointer hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-purple-600 transition-colors">Nhật ký hiện trường</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shrink-0 group-hover:bg-purple-100 transition-colors">
              <span className="material-symbols-outlined text-lg">add_a_photo</span>
            </div>
          </div>
          <div>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{totalLogs}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-purple-500 h-1.5 rounded-full w-full opacity-30"></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">nhật ký</p>
          </div>
        </div>

        {/* 6. Nhân sự tham gia */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] cursor-default hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Nhân sự tham gia</p>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 group-hover:bg-indigo-100 transition-colors">
              <span className="material-symbols-outlined text-lg">groups</span>
            </div>
          </div>
          <div>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{assignedEngineers.length}</h3>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-1.5 rounded-full w-full opacity-30"></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">người</p>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-slate-400">donut_large</span>
            Trạng thái Công việc
          </h3>
          <div className="h-[250px]">
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value" stroke="none">
                    {taskStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Chưa có dữ liệu công việc</div>
            )}
          </div>
        </div>

        {/* Info Detail */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-slate-400">info</span>
            Thông tin chi tiết
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase">Mã dự án</p>
              <p className="font-bold text-slate-800 mt-1">{project.code}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase">Khách hàng</p>
              <p className="font-bold text-slate-800 mt-1">{project.client || '---'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase">Địa điểm</p>
              <p className="font-bold text-slate-800 mt-1">{project.location || '---'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase">Quản lý dự án</p>
              <p className="font-bold text-slate-800 mt-1">{project.managerName || 'Chưa phân công'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase">Trạng thái</p>
              <p className="font-bold text-slate-800 mt-1">
                {project.status === 'active' ? 'Đang triển khai' : project.status === 'completed' ? 'Hoàn thành' : 'Tạm dừng'}
              </p>
            </div>
          </div>
        </div>
      </div>

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
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {costChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
            <button onClick={() => navigate(`/projects/${project.id}/field-logs`)} className="text-xs font-semibold text-primary hover:underline">
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
                        +{log.images.length - 3}
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
      </div>

    </div>
  );
};
