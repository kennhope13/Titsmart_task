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
    laborPayrolls,
    issues,
    documentTracks
  } = useRealtimeStore();

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const displayEnhancedProjects = useMemo(() => {
    if (selectedProjects.length === 0) return enhancedProjects;
    return enhancedProjects.filter(p => selectedProjects.includes(p.code));
  }, [enhancedProjects, selectedProjects]);

  // 2. BIỂU ĐỒ 1: TIẾN ĐỘ DỰ ÁN (Bar Chart)
  const progressData = useMemo(() => {
    return displayEnhancedProjects
      .filter(p => p.status !== 'completed' && p.status !== 'on_hold')
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        "Tiến độ (%)": p.progress
      }));
  }, [displayEnhancedProjects]);

  // 3. BIỂU ĐỒ 2: CHI PHÍ DỰ ÁN (Bar Chart)
  const costData = useMemo(() => {
    return displayEnhancedProjects
      .filter(p => p.status !== 'completed')
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        "Tổng chi (VNĐ)": p.totalCost
      }));
  }, [displayEnhancedProjects]);

  // 3. BIỂU ĐỒ 3: TIẾN ĐỘ THANH TOÁN / GIẢI NGÂN
  const paymentData = useMemo(() => {
    return displayEnhancedProjects.map(p => {
      // Dùng dữ liệu từ Hồ sơ thanh toán (documentTracks)
      const pDocs = documentTracks.filter(d => d.projectCode === p.code);
      const totalContract = pDocs.reduce((sum, d) => sum + (d.contractValue || 0), 0) || (p.contractValue || 0);
      const totalPaid = pDocs.reduce((sum, d) => sum + (d.prepayAmount || 0), 0);
      
      // Hoặc nếu người dùng muốn tính Dòng tiền = Tổng Hợp đồng (Project) - Tổng chi phí thực tế
      // Nhưng theo mô tả: "So sánh [Tổng giá trị Hợp đồng] với [Số tiền đã nhận/thanh toán]"
      return {
        name: p.name,
        'Tổng Hợp đồng': totalContract,
        'Đã giải ngân': totalPaid,
        total: totalContract
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [displayEnhancedProjects, documentTracks]);

  // 4. BIỂU ĐỒ 4: TÌNH TRẠNG SỰ CỐ / VƯỚNG MẮC
  const issueData = useMemo(() => {
    return displayEnhancedProjects.map(p => {
      const pIssues = issues.filter(i => i.projectCode === p.code);
      const open = pIssues.filter(i => i.status === 'OPEN').length;
      const processing = pIssues.filter(i => i.status === 'PROCESSING').length;
      const resolved = pIssues.filter(i => i.status === 'RESOLVED').length;
      return {
        name: p.name,
        'Tồn đọng': open,
        'Đang xử lý': processing,
        'Đã khắc phục': resolved,
        total: pIssues.length
      };
    }).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [displayEnhancedProjects, issues]);

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
        <div className="flex items-center gap-2 relative" ref={filterRef}>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)} 
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 focus:outline-none"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">filter_list</span>
            {selectedProjects.length === 0 ? 'So sánh tất cả dự án' : `Đang so sánh ${selectedProjects.length} dự án`}
            <span className="material-symbols-outlined text-[18px] text-slate-500">{isFilterOpen ? 'expand_less' : 'expand_more'}</span>
          </button>
          
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="font-bold text-sm text-slate-700">Chọn dự án so sánh</span>
                <button 
                  onClick={() => setSelectedProjects([])}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {projects.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Chưa có dự án nào</div>
                ) : (
                  projects.map(proj => (
                    <label key={proj.code} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={selectedProjects.includes(proj.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProjects([...selectedProjects, proj.code]);
                          } else {
                            setSelectedProjects(selectedProjects.filter(c => c !== proj.code));
                          }
                        }}
                      />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 truncate" title={proj.name}>
                        {proj.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4">
        
        {displayEnhancedProjects.length === 0 ? (
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

            <ChartBox title="TIẾN ĐỘ THANH TOÁN / GIẢI NGÂN (VNĐ)" onClick={() => navigate("/documents")}>
              <ResponsiveContainer width="100%" height="100%">
                {paymentData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">Không có dữ liệu hợp đồng</div>
                ) : (
                  <BarChart data={paymentData} margin={{ top: 10, right: 90, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Tổng Hợp đồng" fill="#94a3b8" barSize={12} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Đã giải ngân" fill="#10b981" barSize={12} radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="Đã giải ngân" position="right" formatter={(val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' ₫'} style={{ fontSize: 11, fill: '#10b981', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="THỐNG KÊ SỰ CỐ / VƯỚNG MẮC" onClick={() => navigate("/activity-log")}>
              <ResponsiveContainer width="100%" height="100%">
                {issueData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">Không có dữ liệu sự cố</div>
                ) : (
                  <BarChart data={issueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={220} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Tồn đọng" stackId="a" fill="#ef4444" barSize={20} />
                    <Bar dataKey="Đang xử lý" stackId="a" fill="#f59e0b" barSize={20} />
                    <Bar dataKey="Đã khắc phục" stackId="a" fill="#22c55e" barSize={20} radius={[0, 4, 4, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

          </div>
        )}
      </div>
    </div>
  );
};