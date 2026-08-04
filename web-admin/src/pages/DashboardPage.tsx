import React from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { projects } = useRealtimeStore();

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      <section className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">dashboard</span>
          </div>
          <div className="min-w-0">
            <h2 className="page-title text-2xl font-extrabold text-slate-900">T?ng quan</h2>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100 whitespace-nowrap">Qu?n l�</span>
      </section>

      <div className="p-6 space-y-4">
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-extrabold text-sm text-slate-900 mb-4">��nh gi� hi?u qu? d? �n</h3>
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

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="font-extrabold text-sm text-slate-900 mb-6">Th?ng k� c�ng vi?c v� ti?n d?</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projects} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar yAxisId="left" dataKey="totalTasks" fill="#3b82f6" maxBarSize={40} name="T?ng vi?c" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="progressPercent" stroke="#f59e0b" strokeWidth={3} name="% Ti?n d?" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex-1">
              <h3 className="font-extrabold text-sm text-slate-900 mb-5">T? l? ho�n th�nh theo d? �n</h3>
              <div className="flex flex-col gap-5">
                {projects.map((proj, idx) => {
                  const colors = ['bg-[#047857]', 'bg-[#1d4ed8]', 'bg-[#be123c]', 'bg-[#b45309]'];
                  const bgColors = ['bg-[#d1fae5]', 'bg-[#dbeafe]', 'bg-[#ffe4e6]', 'bg-[#fef3c7]'];
                  const circleColors = ['text-[#047857]', 'text-[#1d4ed8]', 'text-[#be123c]', 'text-[#b45309]'];
                  const colorIdx = idx % colors.length;
                  return (
                    <div key={proj.id} className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[12px] flex-shrink-0 ${bgColors[colorIdx]} ${circleColors[colorIdx]}`}>
                            {proj.code.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-700 truncate">{proj.name}</span>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 flex-shrink-0">{proj.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ml-11" style={{ width: 'calc(100% - 44px)' }}>
                        <div className={`${colors[colorIdx]} h-full rounded-full transition-all duration-1000`} style={{ width: `${proj.progressPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};