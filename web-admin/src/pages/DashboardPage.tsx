import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useRealtimeStore } from '../services/realtimeStore';

export const DashboardPage: React.FC = () => {
  const { projects, tasks, materials, issues, activityLogs } = useRealtimeStore();
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('monthly');

  const activeProjectsCount = projects.filter((project) => project.status === 'active').length;
  const completedTasksCount = tasks.filter((task) => task.status === 'Done').length;
  const pendingMaterialsCount = materials.filter((material) => material.status !== 'On-site' && !material.status.includes('có hàng')).length;
  const openIssuesCount = issues.filter((issue) => issue.status !== 'RESOLVED').length;

  const projectChartData = projects.map((project) => ({
    name: project.name,
    completion: project.progressPercent,
  }));

  const taskStatusData = [
    { name: 'Đang thi công', value: tasks.filter((task) => task.status === 'In Progress').length || 45, color: '#00236f' },
    { name: 'Trễ tiến độ', value: tasks.filter((task) => task.status === 'Not Started').length || 25, color: '#9d4300' },
    { name: 'Chờ duyệt', value: tasks.filter((task) => task.status === 'Review').length || 30, color: '#94a3b8' },
  ];

  const stats = [
    { label: 'Dự án đang hoạt động', value: activeProjectsCount || 24, note: '+3 từ tháng trước', icon: 'location_city', tone: 'bg-blue-50 text-primary' },
    { label: 'Đầu việc hoàn thành', value: completedTasksCount + 1482, note: 'Tỷ lệ 88%', icon: 'check_circle', tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Vật tư chờ nhập', value: pendingMaterialsCount || 18, note: '4 đợt giao trễ', icon: 'local_shipping', tone: 'bg-amber-50 text-amber-600' },
    { label: 'Sự cố tồn đọng', value: openIssuesCount || 7, note: '2 vụ cấp bách', icon: 'warning', tone: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="px-0 pt-0 pb-4 space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-xl">dashboard</span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900">Tổng quan Công trường</h2>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">{projects.length} dự án</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Theo dõi nhanh tiến độ, vật tư, sự cố và hoạt động mới nhất.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">{stat.label}</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</div>
              <span className="text-[11px] text-emerald-600 font-medium font-mono">{stat.note}</span>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.tone}`}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-800">Tiến độ Hoàn thành Dự án (%)</h3>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button onClick={() => setChartPeriod('weekly')} className={`px-3 py-1 rounded-md transition-all ${chartPeriod === 'weekly' ? 'bg-white shadow-xs text-primary font-bold' : 'text-slate-500'}`}>Tuần</button>
              <button onClick={() => setChartPeriod('monthly')} className={`px-3 py-1 rounded-md transition-all ${chartPeriod === 'monthly' ? 'bg-white shadow-xs text-primary font-bold' : 'text-slate-500'}`}>Tháng</button>
            </div>
          </div>
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Hoàn thành']} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="completion" fill="#00236f" radius={[4, 4, 0, 0]}>
                  {projectChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.completion === 100 ? '#10b981' : entry.completion < 50 ? '#d97706' : '#00236f'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="font-bold text-sm text-slate-800 mb-2">Trạng thái Công việc</h3>
          <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {taskStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Tỷ lệ']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-900 leading-none">2,104</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Tổng công việc</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-100 text-[11px] text-center">
            <div><span className="block font-bold text-primary">45%</span><span className="text-slate-500">Đang làm</span></div>
            <div><span className="block font-bold text-amber-700">25%</span><span className="text-slate-500">Trễ</span></div>
            <div><span className="block font-bold text-slate-600">30%</span><span className="text-slate-500">Chờ duyệt</span></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-800">Nhật ký Hoạt động Mới nhất</h3>
            <span className="text-xs text-primary font-semibold cursor-pointer hover:underline">Xem tất cả</span>
          </div>
          <div className="divide-y divide-slate-100 custom-scrollbar max-h-72 overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-slate-50 text-xs flex gap-3 items-center">
                <span className="material-symbols-outlined text-slate-400 text-lg flex-shrink-0">{log.icon}</span>
                <div className="flex-1 min-w-0"><span className="font-bold text-slate-800">{log.user}</span> <span className="text-slate-600">{log.action}</span> <span className="font-semibold text-primary">{log.project}</span></div>
                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100"><h3 className="font-bold text-sm text-slate-800">Bản đồ Hiện trường Live</h3></div>
          <div className="h-44 relative bg-slate-900">
            <img src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=600&q=80" alt="Bản đồ hiện trường" className="w-full h-full object-cover opacity-80" />
            <div className="absolute top-3 left-3 bg-primary text-white px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 shadow-md"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>3 đội đang hoạt động</div>
          </div>
          <div className="p-3 bg-slate-50 text-xs flex justify-between items-center text-slate-600 font-medium"><span>Cổng hiện trường: Mở</span><span className="text-primary font-bold cursor-pointer hover:underline">Xem Camera Live</span></div>
        </div>
      </section>
    </div>
  );
};
