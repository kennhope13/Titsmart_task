import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell, Tooltip, Legend, LabelList, PieChart, Pie } from 'recharts';


export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    projects, 
    engineers, 
    tasks, 
    materialPlans, 
    purchasingPlans, 
    expenses, 
    laborPayrolls 
  } = useRealtimeStore();

  // 1. CHUẨN BỊ DỮ LIỆU TỔNG HỢP CỦA TẤT CẢ DỰ ÁN
  const enhancedProjects = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
      
      let progress = project.progressPercent || 0;
      if (projectTasks.length > 0) {
        const totalProgress = projectTasks.reduce((sum, task) => sum + (task.isDone ? 1 : (task.progress || 0)), 0);
        progress = Math.round((totalProgress / projectTasks.length) * 100);
      }

      const projMaterialPlans = materialPlans.filter((plan) => plan.projectCode === project.code);
      const totalMaterials = projMaterialPlans.length;
      const completedMaterials = projMaterialPlans.filter((plan) => {
        const status = (plan.progressStatus || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const ordered = (plan.orderedStatus || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return status.includes('hoan thanh') || ordered.includes('nhan du') || status.includes('da co hang') || status.includes('da giao');
      }).length;
      const materialProgress = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;

      const totalPurchasing = purchasingPlans.filter((item) => item.projectCode === project.code).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      const totalExp = expenses.filter((item) => item.projectCode === project.code).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      const totalLab = laborPayrolls.filter((item) => item.projectCode === project.code).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      const totalCost = totalPurchasing + totalExp + totalLab;

      return {
        ...project,
        progress,
        materialProgress,
        totalCost,
      };
    });
  }, [projects, tasks, materialPlans, purchasingPlans, expenses, laborPayrolls]);

  // 2. BIỂU ĐỒ 1: TIẾN ĐỘ DỰ ÁN (Bar Chart)
  const progressData = useMemo(() => {
    return enhancedProjects
      .filter(p => p.status !== 'completed' && p.status !== 'on_hold')
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        "Tiến độ (%)": p.progress
      }));
  }, [enhancedProjects]);

  // 3. BIỂU ĐỒ 2: CHI PHÍ DỰ ÁN (Bar Chart)
  const costData = useMemo(() => {
    return enhancedProjects
      .filter(p => p.status !== 'completed')
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        "Tổng chi (VNĐ)": p.totalCost
      }));
  }, [enhancedProjects]);

  // 3. BIỂU ĐỒ 3: THỐNG KÊ CÔNG VIỆC THEO DỰ ÁN
  const taskStatData = useMemo(() => {
    return enhancedProjects.map(p => {
      const pTasks = tasks.filter(t => t.projectCode === p.code && !t.isSectionHeader);
      const completed = pTasks.filter(t => t.status === 'Hoàn thành').length;
      const inProgress = pTasks.filter(t => t.status === 'Đang làm' || t.status === 'Chờ vật tư' || t.status === 'Chờ khách hàng' || t.status === 'Chờ nghiệm thu').length;
      const notStarted = pTasks.filter(t => !t.status || t.status === 'Chưa làm' || t.status === 'Chờ nhận việc' || t.status === 'Tạm dừng').length;
      return {
        name: p.name,
        'Hoàn thành': completed,
        'Đang xử lý': inProgress,
        'Chưa bắt đầu': notStarted,
        total: pTasks.length
      };
    }).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [enhancedProjects, tasks]);

  // 4. BIỂU ĐỒ 4: SỐ LƯỢNG NHÂN SỰ THEO DỰ ÁN
  const projectPersonnelData = useMemo(() => {
    return enhancedProjects.map(p => {
      let count = 0;
      engineers.forEach(e => {
        const isManaged = e.managedProjects?.some(mp => mp.code === p.code);
        const isMember = e.memberProjects?.some(mp => mp.code === p.code);
        if (isManaged || isMember) {
          count++;
        }
      });
      return {
        name: p.name,
        'Số nhân sự': count
      };
    }).sort((a, b) => b['Số nhân sự'] - a['Số nhân sự']).slice(0, 10);
  }, [enhancedProjects, engineers]);

  const ChartBox = ({ title, children, span = 1, onClick }: { title: string, children: React.ReactNode, span?: number, onClick?: () => void }) => (
    <div 
      className={`group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs h-full xl:col-span-${span} overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200' : ''}`}
      onClick={onClick}
    >
      <div className={`h-1 w-full ${onClick ? 'bg-slate-100 group-hover:bg-blue-400' : 'bg-slate-100'} transition-colors`} />
      <div className="bg-white border-b border-slate-100 px-3 py-2 flex justify-between items-center">
        <span className={`text-sm font-extrabold text-slate-800 truncate ${onClick ? 'group-hover:text-primary transition-colors' : ''}`}>{title}</span>
      </div>
      <div className="flex-1 min-h-0 relative p-2">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 overflow-hidden text-slate-800">
      <section className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm pl-3 pr-14 py-4 md:py-3 lg:py-0 lg:min-h-[3rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2">TỔNG QUAN CHUNG</h1>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4">
        
        {enhancedProjects.length === 0 ? (
           <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl">
             <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
             <h3 className="mt-3 font-bold text-slate-700">Chưa có dự án nào</h3>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-[350px]">
            
            <ChartBox title="TIẾN ĐỘ THI CÔNG (%)" onClick={() => navigate("/projects")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val}%`, 'Tiến độ']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Tiến độ (%)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="Tiến độ (%)" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                    {progressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry["Tiến độ (%)"] >= 100 ? '#10b981' : entry["Tiến độ (%)"] >= 60 ? '#3b82f6' : entry["Tiến độ (%)"] >= 30 ? '#f59e0b' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="TỔNG CHI PHÍ THỰC TẾ (VNĐ)" onClick={() => navigate("/cost-plan")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData} margin={{ top: 10, right: 90, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val), 'Tổng chi']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Tổng chi (VNĐ)" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="Tổng chi (VNĐ)" position="right" formatter={(val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' ₫'} style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="TIẾN ĐỘ CÔNG VIỆC CHI TIẾT (THEO DỰ ÁN)" onClick={() => navigate("/tasks")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Hoàn thành" stackId="a" fill="#10b981" barSize={20} />
                  <Bar dataKey="Đang xử lý" stackId="a" fill="#3b82f6" barSize={20} />
                  <Bar dataKey="Chưa bắt đầu" stackId="a" fill="#94a3b8" barSize={20} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="SỐ LƯỢNG NHÂN SỰ ĐƯỢC PHÂN BỔ (THEO DỰ ÁN)" onClick={() => navigate("/personnel")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectPersonnelData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Số nhân sự" fill="#0284c7" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="Số nhân sự" position="right" formatter={(val: number) => `${val} người`} style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

          </div>
        )}
      </div>
    </div>
  );
};