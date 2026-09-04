import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';

export const ProjectOverviewTab: React.FC = () => {
  const { projectId } = useParams();
  const { projects, tasks, expenses, engineers, materialPlans } = useRealtimeStore();

  const project = useMemo(() => {
    return projects.find(p => p.id === projectId || p.code === projectId);
  }, [projectId, projects]);

  if (!project) {
    return <div className="p-6 text-center text-slate-500">Không tìm thấy thông tin dự án.</div>;
  }

  // --- STATS CALCULATION ---
  const projTasks = tasks.filter(t => t.projectCode === project.code);
  const totalTasks = projTasks.length;
  const completedTasks = projTasks.filter(t => t.status === 'Hoàn thành').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projExpenses = expenses.filter(e => e.projectCode === project.code);
  const totalExpense = projExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const contractValue = project.contractValue || 0;
  const budgetPercent = contractValue > 0 ? Math.min(Math.round((totalExpense / contractValue) * 100), 100) : 0;

  const projMaterials = materialPlans.filter(m => m.projectCode === project.code);
  const totalMatEstimate = projMaterials.reduce((sum, m) => sum + (m.contractVolume || 0), 0);
  const totalMatActual = projMaterials.reduce((sum, m) => sum + (m.orderedVolume || 0), 0);
  
  const assignedEngineers = engineers.filter(eng => Array.isArray(eng.projectCodes) && eng.projectCodes.includes(project.code));

  // --- CHART DATA ---
  const taskStatusData = [
    { name: 'Chưa làm', value: projTasks.filter(t => t.status === 'Chưa làm').length, color: '#94a3b8' },
    { name: 'Đang làm', value: projTasks.filter(t => t.status === 'Đang làm').length, color: '#3b82f6' },
    { name: 'Chờ nghiệm thu', value: projTasks.filter(t => t.status === 'Chờ nghiệm thu').length, color: '#f59e0b' },
    { name: 'Hoàn thành', value: completedTasks, color: '#10b981' },
  ].filter(d => d.value > 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto bg-slate-50 flex-1">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined text-2xl">fact_check</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiến độ công việc</p>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{progressPercent}%</h3>
            <p className="text-[12px] text-slate-400 font-medium mt-1">{completedTasks} / {totalTasks} công việc</p>
          </div>
        </div>

        {/* Budget Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng chi phí</p>
            <h3 className="text-[22px] leading-tight font-black text-slate-800 truncate" title={formatCurrency(totalExpense)}>{formatCurrency(totalExpense)}</h3>
            <p className="text-[12px] text-slate-400 font-medium mt-1">{budgetPercent}% hợp đồng</p>
          </div>
        </div>

        {/* Materials Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vật tư đã xuất</p>
            <h3 className="text-[22px] leading-tight font-black text-slate-800 truncate" title={totalMatActual.toLocaleString('vi-VN')}>{totalMatActual.toLocaleString('vi-VN')}</h3>
            <p className="text-[12px] text-slate-400 font-medium mt-1">Dự toán: {totalMatEstimate.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        {/* Personnel Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nhân sự tham gia</p>
            <h3 className="text-[26px] leading-tight font-black text-slate-800">{assignedEngineers.length}</h3>
            <p className="text-[12px] text-slate-400 font-medium mt-1">người</p>
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
    </div>
  );
};
