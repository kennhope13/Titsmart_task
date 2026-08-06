import React, { useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { projects, issues, engineers, materials, expenses } = useRealtimeStore();

  const healthData = useMemo(() => {
    return projects.map((proj) => {
      // 1. Tiến độ
      const progress = proj.progressPercent || 0;

      // 2. Vướng mắc (Issues)
      const projIssues = issues.filter(i => i.projectCode === proj.code);
      const closedIssues = projIssues.filter(i => i.status === 'RESOLVED').length;
      const issueScore = projIssues.length > 0 ? Math.round((closedIssues / projIssues.length) * 100) : 100;

      // 3. Nhân sự (Personnel)
      const projEngineers = engineers.filter(e => e.managedProjects?.some(p => p.code === proj.code)).length;
      const personnelScore = Math.min(Math.round((projEngineers / 10) * 100), 100) || 50; // Default 50 if 0 to show something on chart

      // 4. Vật tư (Materials)
      const projMaterials = materials.filter(m => m.projectCode === proj.code);
      const hasImportMats = projMaterials.filter(m => (m.totalImport || 0) > 0).length;
      const materialScore = projMaterials.length > 0 ? Math.round((hasImportMats / projMaterials.length) * 100) : 60;

      // 5. Chi phí (Cost)
      // Giả lập điểm chi phí vì chưa có ngân sách
      const projExpenses = expenses.filter(e => e.projectCode === proj.code).length;
      const costScore = Math.max(100 - projExpenses * 2, 40);

      return {
        name: proj.name,
        code: proj.code,
        "Tiến độ": progress,
        "Vướng mắc": issueScore,
        "Nhân sự": personnelScore,
        "Vật tư": materialScore,
        "Chi phí": costScore,
      };
    });
  }, [projects, issues, engineers, materials, expenses]);

  const trendData = useMemo(() => {
    // Giả lập dữ liệu xu hướng qua 6 tháng
    const months = ['Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8'];
    return months.map((month, index) => {
      let totalProg = 0;
      let totalCost = 0;
      
      projects.forEach(p => {
        // Mock curve
        totalProg += (p.progressPercent || 0) * ((index + 1) / 6);
        totalCost += 20 + index * 10 + (p.name.length % 5);
      });

      return {
        name: month,
        "Tiến độ chung": projects.length ? Math.round(totalProg / projects.length) : 0,
        "Chi phí (Tỷ VNĐ)": Math.round(totalCost / 10)
      };
    });
  }, [projects]);

  const topProjectsData = useMemo(() => {
    return projects.map(proj => {
      const projExpenses = expenses.filter(e => e.projectCode === proj.code);
      const totalCost = projExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0) / 1000000;

      const projMaterials = materials.filter(m => m.projectCode === proj.code);
      const totalMaterialUsage = projMaterials.reduce((sum, m) => sum + (m.totalImport || 0), 0);

      const mockCost = totalCost > 0 ? totalCost : (20 + (proj.name.length * 2));
      const mockMaterial = totalMaterialUsage > 0 ? totalMaterialUsage : (500 + (proj.name.length * 50));

      return {
        name: proj.name,
        "Cost (Tr. VNĐ)": Math.round(mockCost),
        "Vật tư (Đơn vị)": Math.round(mockMaterial)
      };
    })
    .sort((a, b) => b["Cost (Tr. VNĐ)"] - a["Cost (Tr. VNĐ)"])
    .slice(0, 5);
  }, [projects, expenses, materials]);

  // Overall Stats
  const totalProjects = projects.length;
  const totalIssues = issues.filter(i => i.status !== 'RESOLVED').length;
  const totalEngineers = engineers.length;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0) / 1000000000; // in billions

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      <section className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">analytics</span>
          </div>
          <div className="min-w-0">
            <h2 className="page-title text-2xl font-extrabold text-slate-900">Tổng quan phân tích</h2>
          </div>
        </div>
      </section>

      <div className="p-6 space-y-6">

        {/* Horizontal Bar Chart: Top Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="text-center mb-6">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase">Top 5 Dự án Tiêu Hao Tài Nguyên Nhiều Nhất</h3>
            <p className="text-[11px] text-slate-500 mt-1">Xếp hạng dựa trên tổng chi phí ước tính và số lượng vật tư sử dụng</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topProjectsData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} width={180} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Cost (Tr. VNĐ)" fill="#3b82f6" name="Chi phí ước tính (Triệu VNĐ)" barSize={14} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Vật tư (Đơn vị)" fill="#10b981" name="Vật tư tiêu thụ (Đơn vị)" barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 mb-6">Sức khỏe dự án (Radar Chart)</h3>
            <div className="h-[400px] w-full">
              {healthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                    { subject: 'Tiến độ', ...healthData.reduce((acc, curr, i) => i < 3 ? { ...acc, [curr.name]: curr['Tiến độ'] } : acc, {}) },
                    { subject: 'Vật tư', ...healthData.reduce((acc, curr, i) => i < 3 ? { ...acc, [curr.name]: curr['Vật tư'] } : acc, {}) },
                    { subject: 'Nhân sự', ...healthData.reduce((acc, curr, i) => i < 3 ? { ...acc, [curr.name]: curr['Nhân sự'] } : acc, {}) },
                    { subject: 'Vướng mắc', ...healthData.reduce((acc, curr, i) => i < 3 ? { ...acc, [curr.name]: curr['Vướng mắc'] } : acc, {}) },
                    { subject: 'Chi phí', ...healthData.reduce((acc, curr, i) => i < 3 ? { ...acc, [curr.name]: curr['Chi phí'] } : acc, {}) },
                  ]}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    
                    {healthData.slice(0, 3).map((proj, idx) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b'];
                      return (
                        <Radar key={proj.code} name={proj.name} dataKey={proj.name} stroke={colors[idx]} fill={colors[idx]} fillOpacity={0.3} />
                      );
                    })}
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm font-semibold">Chưa có dữ liệu dự án</div>
              )}
            </div>
            {healthData.length > 3 && (
              <p className="text-center text-xs text-slate-500 mt-2">* Chỉ hiển thị 3 dự án tiêu biểu để biểu đồ trực quan.</p>
            )}
          </div>

          {/* Area Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 mb-6">Xu hướng Tổng hợp (6 tháng gần nhất)</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  
                  <Area yAxisId="left" type="monotone" dataKey="Tiến độ chung" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProg)" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="Chi phí (Tỷ VNĐ)" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};