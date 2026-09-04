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

  // 4. BIỂU ĐỒ 3: TIẾN ĐỘ VẬT TƯ (Bar Chart)
  const materialData = useMemo(() => {
    return enhancedProjects
      .filter(p => p.status !== 'completed')
      .sort((a, b) => b.materialProgress - a.materialProgress)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        "Vật tư về bãi (%)": p.materialProgress
      }));
  }, [enhancedProjects]);

  // 4. BIỂU ĐỒ 4: CƠ CẤU CHI PHÍ
  const costBreakdownData = useMemo(() => {
    const totalPurchasing = purchasingPlans.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalExp = expenses.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalLab = laborPayrolls.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    return [
      { name: 'Mua sắm vật tư', value: totalPurchasing, fill: '#0ea5e9' },
      { name: 'Chi phí khác', value: totalExp, fill: '#f43f5e' },
      { name: 'Lương nhân công', value: totalLab, fill: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [purchasingPlans, expenses, laborPayrolls]);

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

            <ChartBox title="TỈ LỆ VẬT TƯ VỀ CÔNG TRƯỜNG (%)" onClick={() => navigate("/materials")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val}%`, 'Đã về']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Vật tư về bãi (%)" fill="#14b8a6" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="Vật tư về bãi (%)" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="CƠ CẤU TỔNG CHI PHÍ TOÀN DỰ ÁN" onClick={() => navigate("/cost-plan")}>
              <ResponsiveContainer width="100%" height="100%">
                {costBreakdownData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">Chưa có dữ liệu chi phí</div>
                ) : (
                  <PieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

          </div>
        )}
      </div>
    </div>
  );
};