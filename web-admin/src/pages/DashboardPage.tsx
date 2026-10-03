import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { isUserMemberOfProject } from '../utils/projectMemberUtils';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell, Tooltip, Legend, LabelList, PieChart, Pie } from 'recharts';


interface ChartBoxProps {
  title: string;
  children: React.ReactNode;
  span?: number;
  onClick?: () => void;
}

const ChartBox: React.FC<ChartBoxProps> = React.memo(({ title, children, span = 1, onClick }) => (
  <div 
    className={`group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs h-[330px] xl:col-span-${span} overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200' : ''}`}
    onClick={onClick}
  >
    <div className={`h-1 w-full ${onClick ? 'bg-slate-100 group-hover:bg-blue-400' : 'bg-slate-100'} transition-colors`} />
    <div className="bg-white border-b border-slate-100 px-3 py-2 flex justify-between items-center">
      <span className={`text-sm font-extrabold text-slate-800 truncate ${onClick ? 'group-hover:text-primary transition-colors' : ''}`}>{title}</span>
    </div>
    <div className="flex-1 h-[270px] relative p-2 overflow-hidden">
      {children}
    </div>
  </div>
));

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
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
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

  const currentUser = useAuthStore(state => state.user);

  // 1. CHUẨN BỊ DỮ LIỆU TỔNG HỢP CỦA TẤT CẢ DỰ ÁN
  const enhancedProjects = useMemo(() => {
    const visibleProjects = projects.filter(p => isUserMemberOfProject(currentUser, p, engineers));
    return visibleProjects.map((project) => {
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

  // 3. BIỂU ĐỒ 3: THỐNG KÊ HỒ SƠ DỰ ÁN (ĐÃ GỬI / CHƯA GỬI)
  const documentData = useMemo(() => {
    return displayEnhancedProjects.map(p => {
      const pDocs = documentTracks.filter(d => (d.projectCode || (d as any).projectId) === p.code || (d as any).projectId === p.id);
      
      const sentDocs = pDocs.filter(d => {
        if (d.sendDate && String(d.sendDate).trim() !== '' && d.sendDate !== '—' && d.sendDate !== '-') return true;
        const status = (d.docStatus || '').toLowerCase();
        if (status.includes('đã gửi') || status.includes('da gui') || status.includes('đã nộp') || status.includes('da nop') || status.includes('đã ký') || status.includes('da ky')) return true;
        return false;
      });
      const sentCount = sentDocs.length;
      const unsentCount = pDocs.length - sentCount;
      const rate = pDocs.length > 0 ? Math.round((sentCount / pDocs.length) * 100) : 0;

      return {
        name: p.name,
        'Đã gửi': sentCount,
        'Chưa gửi': unsentCount,
        'Tỷ lệ (%)': rate,
        total: pDocs.length
      };
    })
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total || b['Đã gửi'] - a['Đã gửi'])
    .slice(0, 10);
  }, [displayEnhancedProjects, documentTracks]);

  // 4. BIỂU ĐỒ 4: KPI CÔNG VIỆC NHÂN VIÊN
  const kpiData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetProjectCodes = displayEnhancedProjects.map(p => p.code);
    const relevantTasks = tasks.filter(t => !t.isSectionHeader && targetProjectCodes.includes(t.projectCode));

    const engList = engineers.filter(e => !e.isLocked && !(e as any).is_locked);
    
    const results = engList.map(eng => {
      const engId = String(eng.id || '').trim().toLowerCase();
      const engUsername = String(eng.username || '').trim().toLowerCase();
      const engCode = String(eng.code || '').trim().toLowerCase();
      const engName = String(eng.name || '').trim().toLowerCase();

      const pTasks = relevantTasks.filter(t => {
        const assignedId = String(t.assignedEngineerId || '').trim().toLowerCase();
        const assignedName = String(t.assignedEngineerName || '').trim().toLowerCase();

        if (engId && assignedId === engId) return true;
        if (engUsername && assignedId === engUsername) return true;
        if (engCode && assignedId === engCode) return true;
        if (engName && assignedName === engName) return true;
        if (engName && assignedName && (assignedName.includes(engName) || engName.includes(assignedName))) return true;
        return false;
      });

      const totalCount = pTasks.length;
      const completedCount = pTasks.filter(t => t.isDone || t.status === 'Hoàn thành' || (t.progress !== undefined && t.progress >= 1)).length;
      const pendingTasks = pTasks.filter(t => !t.isDone && t.status !== 'Hoàn thành' && (t.progress === undefined || t.progress < 1));
      const overdueCount = pendingTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = String(t.dueDate).split('T')[0];
        return due < todayStr;
      }).length;
      const inProgressCount = pendingTasks.length - overdueCount;

      const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        name: eng.name,
        'Hoàn thành': completedCount,
        'Đang làm': inProgressCount,
        'Quá hạn': overdueCount,
        'Tỷ lệ (%)': rate,
        total: totalCount
      };
    })
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total || b['Tỷ lệ (%)'] - a['Tỷ lệ (%)'])
    .slice(0, 10);

    return results;
  }, [displayEnhancedProjects, tasks, engineers]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const yAxisWidth = isMobile ? 110 : 220;

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 overflow-hidden text-slate-800">
      <section className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm px-3 md:px-6 pr-16 md:pr-20 py-2 md:py-0 md:h-12 flex flex-col md:flex-row justify-start items-start md:items-center gap-4 shrink-0 relative no-drag-region electron-no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-6 h-8 md:h-auto mb-1 md:mb-0">
          <h1 className="page-title text-base md:text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase font-['Inter'] whitespace-nowrap">TỔNG QUAN CHUNG</h1>
          
          <div className="relative z-50 no-drag-region electron-no-drag" ref={filterRef} style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              style={{ WebkitAppRegion: 'no-drag' } as any}
              className="flex items-center justify-between w-64 md:w-72 h-[34px] px-3.5 bg-white border border-slate-200 rounded-lg shadow-xs text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer select-none no-drag-region electron-no-drag"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-400">filter_list</span>
                <span>{selectedProjects.length === 0 ? 'So sánh tất cả dự án' : `Đang so sánh ${selectedProjects.length} dự án`}</span>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-400">{isFilterOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            
            {isFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 md:w-80 bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="font-bold text-sm text-slate-700">Chọn dự án so sánh</span>
                <button 
                  onClick={() => setSelectedProjects([])}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <div className="p-2 border-b border-slate-100 bg-white">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm dự án..." 
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {enhancedProjects.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Chưa có dự án nào</div>
                ) : (
                  enhancedProjects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Không tìm thấy dự án</div>
                  ) : (
                    enhancedProjects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(projectSearchQuery.toLowerCase())).map(proj => (
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
                  )
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto p-2 pb-16 md:p-3 lg:p-4">
        
        {displayEnhancedProjects.length === 0 ? (
           <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl">
             <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
             <h3 className="mt-3 font-bold text-slate-700">Chưa có dự án nào</h3>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-[350px]">
            
            <ChartBox title="TIẾN ĐỘ THI CÔNG (%)" onClick={() => navigate("/projects")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={progressData} margin={{ top: 10, right: 35, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val}%`, 'Tiến độ']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Tiến độ (%)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="Tiến độ (%)" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: isMobile ? 10 : 11, fill: '#475569', fontWeight: 600 }} />
                    {progressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry["Tiến độ (%)"] >= 100 ? '#10b981' : entry["Tiến độ (%)"] >= 60 ? '#3b82f6' : entry["Tiến độ (%)"] >= 30 ? '#f59e0b' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="TỔNG CHI PHÍ THỰC TẾ (VNĐ)" onClick={() => navigate("/cost-plan")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={costData} margin={{ top: 10, right: isMobile ? 65 : 90, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val), 'Tổng chi']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Tổng chi (VNĐ)" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="Tổng chi (VNĐ)" position="right" formatter={(val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' ₫'} style={{ fontSize: isMobile ? 9 : 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="HỒ SƠ ĐÃ GỬI VÀ CHƯA GỬI" onClick={() => navigate("/documents")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {documentData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1.5">
                    <span className="material-symbols-outlined text-3xl text-slate-300">folder_shared</span>
                    <span className="text-xs font-medium">Không có dữ liệu hồ sơ dự án</span>
                  </div>
                ) : (
                  <BarChart data={documentData} margin={{ top: 10, right: isMobile ? 35 : 45, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Đã gửi" stackId="a" fill="#10b981" barSize={18} />
                    <Bar dataKey="Chưa gửi" stackId="a" fill="#f59e0b" barSize={18} radius={[0, 4, 4, 0]}>
                      <LabelList 
                        dataKey="Tỷ lệ (%)" 
                        position="right" 
                        formatter={(val: number) => `${val}%`} 
                        style={{ fontSize: isMobile ? 9 : 11, fill: '#10b981', fontWeight: 700 }} 
                      />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="KPI CÔNG VIỆC NHÂN VIÊN" onClick={() => navigate("/personnel")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {kpiData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1.5">
                    <span className="material-symbols-outlined text-3xl text-slate-300">assignment_turned_in</span>
                    <span className="text-xs font-medium">Chưa có dữ liệu công việc nhân viên</span>
                  </div>
                ) : (
                  <BarChart data={kpiData} margin={{ top: 10, right: isMobile ? 35 : 45, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={isMobile ? 100 : 140} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Hoàn thành" stackId="a" fill="#10b981" barSize={18} />
                    <Bar dataKey="Đang làm" stackId="a" fill="#3b82f6" barSize={18} />
                    <Bar dataKey="Quá hạn" stackId="a" fill="#ef4444" barSize={18} radius={[0, 4, 4, 0]}>
                      <LabelList 
                        dataKey="Tỷ lệ (%)" 
                        position="right" 
                        formatter={(val: number) => `${val}%`} 
                        style={{ fontSize: isMobile ? 9 : 11, fill: '#10b981', fontWeight: 700 }} 
                      />
                    </Bar>
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