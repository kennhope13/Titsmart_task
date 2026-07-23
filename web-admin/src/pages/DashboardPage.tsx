import React from 'react';
import { Link } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Treemap, ComposedChart, Bar, Line, Legend } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { tasks, engineers, projects } = useRealtimeStore();
  const pureTasks = tasks.filter((task) => !task.isSectionHeader);
  const completed = pureTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const doing = pureTasks.filter((task) => task.progress > 0 && task.progress < 1).length;
  const waitingReview = pureTasks.filter((task) => task.status === 'Review' || !!task.issueStatus).length;
  const late = pureTasks.filter((task) => !!task.issue && !(task.isDone || task.progress >= 1)).length;
  
  // Custom Treemap Content
  const CustomizedTreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} style={{ fill: depth < 2 ? colors[index % colors.length] : '#ffffff00', stroke: '#fff', strokeWidth: 2 / (depth + 1e-10), strokeOpacity: 1 }} />
        {width > 30 && height > 30 && (
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
            {name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="px-0 pt-0 pb-4 space-y-4">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">dashboard</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tổng quan</h2>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100 whitespace-nowrap">Quản lý</span>
      </section>

      {/* Biểu đồ phân tích (Layout mới: Trái 2/3, Phải 1/3) */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
        {/* Cột trái (Gauges + Composed Chart) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Row 1: 4 Gauge Charts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-900 mb-4">Đánh giá hiệu quả dự án</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 gap-y-8">
              {projects.map((proj, idx) => {
                const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
                const val = proj.progressPercent;
                return (
                  <div key={proj.id} className="relative flex flex-col items-center justify-end h-32">
                    <div className="absolute inset-0 pb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ value: val }, { value: 100 - val }]} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="70%" outerRadius="95%" dataKey="value" stroke="none">
                            <Cell fill={colors[idx % colors.length]} />
                            <Cell fill="#f1f5f9" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="z-10 flex flex-col items-center mt-auto text-center w-full px-1">
                      <span className="text-xl font-extrabold text-slate-900">{val}%</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase truncate w-full" title={proj.name}>{proj.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Composed Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-900 mb-6">Thống kê công việc và tiến độ</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projects} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="left" dataKey="totalTasks" fill="#3b82f6" maxBarSize={40} name="Tổng việc" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="progressPercent" stroke="#f59e0b" strokeWidth={3} name="% Tiến độ" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Cột phải (Donut Chart + Progress Bars) */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          {/* Donut Chart: Trạng thái công việc */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 mb-2">Trạng thái công việc</h3>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Hoàn thành', value: completed, color: '#10b981' }, { name: 'Đang làm', value: doing, color: '#3b82f6' }, { name: 'Chờ duyệt', value: waitingReview, color: '#f59e0b' }, { name: 'Trễ hạn', value: late, color: '#ef4444' }]} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" paddingAngle={2} dataKey="value" stroke="none">
                    {[{ color: '#10b981' }, { color: '#3b82f6' }, { color: '#f59e0b' }, { color: '#ef4444' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-slate-900">{pureTasks.length}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Tổng việc</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-xs font-semibold text-slate-700">Hoàn thành ({completed})</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div><span className="text-xs font-semibold text-slate-700">Đang làm ({doing})</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-xs font-semibold text-slate-700">Chờ duyệt ({waitingReview})</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div><span className="text-xs font-semibold text-slate-700">Trễ hạn ({late})</span></div>
            </div>
          </div>

          {/* Custom Progress Bars (Vertical List) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex-1">
            <h3 className="font-extrabold text-sm text-slate-900 mb-5">Tỷ lệ hoàn thành theo Dự án</h3>
            <div className="flex flex-col gap-5">
              {projects.map((proj, idx) => {
                const colors = ['bg-[#047857]', 'bg-[#1d4ed8]', 'bg-[#be123c]', 'bg-[#b45309]'];
                const bgColors = ['bg-[#d1fae5]', 'bg-[#dbeafe]', 'bg-[#ffe4e6]', 'bg-[#fef3c7]'];
                const circleColors = ['text-[#047857]', 'text-[#1d4ed8]', 'text-[#be123c]', 'text-[#b45309]'];
                const colorIdx = idx % colors.length;
                return (
                  <div key={proj.id} className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[12px] ${bgColors[colorIdx]} ${circleColors[colorIdx]}`}>
                          {proj.code.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">{proj.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">{proj.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ml-11" style={{ width: 'calc(100% - 44px)' }}>
                      <div className={`${colors[colorIdx]} h-full rounded-full transition-all duration-1000`} style={{ width: `${proj.progressPercent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};