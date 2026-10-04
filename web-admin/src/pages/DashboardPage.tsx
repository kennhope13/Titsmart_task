import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { isUserMemberOfProject } from '../utils/projectMemberUtils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Cell, 
  Tooltip, 
  Legend, 
  LabelList, 
  PieChart, 
  Pie 
} from 'recharts';

interface ChartBoxProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  span?: number;
  onClick?: () => void;
  actionText?: string;
}

const ChartBox: React.FC<ChartBoxProps> = React.memo(({ title, subtitle, children, span = 1, onClick, actionText = 'Chi tiết' }) => (
  <div 
    className={`group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs h-[340px] xl:col-span-${span} overflow-hidden ${onClick ? 'hover:shadow-md hover:border-primary/40 transition-all duration-200' : ''}`}
  >
    <div className="bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center">
      <div className="min-w-0 pr-2">
        <span className="text-sm font-bold text-slate-800 truncate block">{title}</span>
        {subtitle && <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</p>}
      </div>
      {onClick && (
        <button 
          onClick={onClick}
          className="text-xs font-semibold text-primary hover:underline shrink-0 flex items-center gap-0.5"
        >
          {actionText}
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      )}
    </div>
    <div className="flex-1 h-[275px] relative p-3 overflow-hidden">
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
    documentTracks,
    fieldLogs
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

  const cleanStaffName = (raw?: string) => {
    if (!raw) return '';
    return raw.split('|')[0].trim();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // 1. DỮ LIỆU DỰ ÁN
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

  const targetCodes = useMemo(() => displayEnhancedProjects.map(p => p.code), [displayEnhancedProjects]);

  // TOP SUMMARY METRICS
  const topMetrics = useMemo(() => {
    const totalProjects = displayEnhancedProjects.length;
    const activeProjects = displayEnhancedProjects.filter(p => p.status !== 'completed' && p.status !== 'on_hold').length;
    const totalContractValue = displayEnhancedProjects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
    const totalActualCost = displayEnhancedProjects.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const costPercent = totalContractValue > 0 ? Math.round((totalActualCost / totalContractValue) * 100) : 0;

    const allTasks = tasks.filter(t => !t.isSectionHeader && targetCodes.includes(t.projectCode));
    const totalTasksCount = allTasks.length;
    const completedTasksCount = allTasks.filter(t => t.isDone || t.status === 'Hoàn thành' || (t.progress !== undefined && t.progress >= 1)).length;
    const taskPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const allDocs = documentTracks ? documentTracks.filter(d => targetCodes.includes(d.projectCode || (d as any).projectId)) : [];
    const totalDocs = allDocs.length;
    const completedDocs = allDocs.filter(d => {
      const s = (d.docStatus || '').toLowerCase();
      return s.includes('gửi') || s.includes('nộp') || s.includes('ký') || d.isCompleted;
    }).length;

    const activeEngineers = engineers.filter(e => !e.isLocked && !(e as any).is_locked).length;

    return {
      totalProjects,
      activeProjects,
      totalContractValue,
      totalActualCost,
      costPercent,
      totalTasksCount,
      completedTasksCount,
      taskPercent,
      totalDocs,
      completedDocs,
      activeEngineers
    };
  }, [displayEnhancedProjects, targetCodes, tasks, documentTracks, engineers]);

  // 1. BIỂU ĐỒ TIẾN ĐỘ THI CÔNG (%)
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

  // 2. BIỂU ĐỒ CHI PHÍ THỰC TẾ (VNĐ)
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

  // 3. BIỂU ĐỒ SO SÁNH NGÂN SÁCH VS THỰC CHI (VNĐ)
  const budgetVsCostData = useMemo(() => {
    return displayEnhancedProjects
      .filter(p => (p.contractValue || 0) > 0 || (p.totalCost || 0) > 0)
      .sort((a, b) => (b.contractValue || b.totalCost) - (a.contractValue || a.totalCost))
      .slice(0, 8)
      .map(p => ({
        name: p.name,
        "Ngân sách (Hợp đồng)": p.contractValue || 0,
        "Chi phí thực tế": p.totalCost || 0
      }));
  }, [displayEnhancedProjects]);

  // 4. BIỂU ĐỒ CƠ CẤU CHI PHÍ
  const costStructureData = useMemo(() => {
    const totalPurchasing = purchasingPlans.filter(i => targetCodes.includes(i.projectCode)).reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalExp = expenses.filter(i => targetCodes.includes(i.projectCode)).reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalLab = laborPayrolls.filter(i => targetCodes.includes(i.projectCode)).reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const data = [
      { name: 'Vật tư & Mua sắm', value: totalPurchasing, color: '#3b82f6' },
      { name: 'Chi phí dự án / QL', value: totalExp, color: '#10b981' },
      { name: 'Chi phí nhân công', value: totalLab, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    return data;
  }, [purchasingPlans, expenses, laborPayrolls, targetCodes]);

  // 5. BIỂU ĐỒ TRẠNG THÁI CÔNG VIỆC HỆ THỐNG
  const globalTaskStatusData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const relevantTasks = tasks.filter(t => !t.isSectionHeader && targetCodes.includes(t.projectCode));

    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let pending = 0;

    relevantTasks.forEach(t => {
      const isDone = t.isDone || t.status === 'Hoàn thành' || (t.progress !== undefined && t.progress >= 1);
      if (isDone) {
        completed += 1;
      } else {
        const isOver = t.dueDate && String(t.dueDate).split('T')[0] < todayStr;
        if (isOver) {
          overdue += 1;
        } else if (t.status === 'Đang làm' || (t.progress && t.progress > 0)) {
          inProgress += 1;
        } else {
          pending += 1;
        }
      }
    });

    return [
      { name: 'Hoàn thành', value: completed, color: '#10b981' },
      { name: 'Đang làm', value: inProgress, color: '#3b82f6' },
      { name: 'Quá hạn', value: overdue, color: '#ef4444' },
      { name: 'Chưa làm', value: pending, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [tasks, targetCodes]);

  // 6. BIỂU ĐỒ TIẾN ĐỘ CUNG ỨNG VẬT TƯ (%)
  const materialProgressData = useMemo(() => {
    return displayEnhancedProjects
      .filter(p => materialPlans.some(m => m.projectCode === p.code))
      .sort((a, b) => b.materialProgress - a.materialProgress)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        "Tiến độ vật tư (%)": p.materialProgress
      }));
  }, [displayEnhancedProjects, materialPlans]);

  // 7. BIỂU ĐỒ HỒ SƠ DỰ ÁN (ĐÃ GỬI / CHƯA GỬI)
  const documentData = useMemo(() => {
    return displayEnhancedProjects.map(p => {
      const pDocs = documentTracks ? documentTracks.filter(d => (d.projectCode || (d as any).projectId) === p.code || (d as any).projectId === p.id) : [];
      
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

  // 8. BIỂU ĐỒ KPI CÔNG VIỆC NHÂN VIÊN
  const kpiData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const relevantTasks = tasks.filter(t => !t.isSectionHeader && targetCodes.includes(t.projectCode));
    const engList = engineers.filter(e => !e.isLocked && !(e as any).is_locked);
    
    const results = engList.map(eng => {
      const engId = String(eng.id || '').trim().toLowerCase();
      const engUsername = String(eng.username || '').trim().toLowerCase();
      const engCode = String(eng.code || '').trim().toLowerCase();
      const cleanName = cleanStaffName(eng.name);
      const engName = cleanName.toLowerCase();
      if (engName === 'admin' || engUsername === 'admin') return null;

      const pTasks = relevantTasks.filter(t => {
        const assignedId = String(t.assignedEngineerId || '').trim().toLowerCase();
        const rawAssignedName = cleanStaffName(t.assignedEngineerName).toLowerCase();

        if (engId && assignedId === engId) return true;
        if (engUsername && assignedId === engUsername) return true;
        if (engCode && assignedId === engCode) return true;
        if (engName && rawAssignedName === engName) return true;
        if (engName && rawAssignedName && rawAssignedName.split(',').map(s => s.trim()).includes(engName)) return true;
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
        name: cleanName,
        'Hoàn thành': completedCount,
        'Đang làm': inProgressCount,
        'Quá hạn': overdueCount,
        'Tỷ lệ (%)': rate,
        total: totalCount
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null && d.total > 0)
    .sort((a, b) => b.total - a.total || b['Tỷ lệ (%)'] - a['Tỷ lệ (%)'])
    .slice(0, 10);

    return results;
  }, [tasks, engineers, targetCodes]);

  // 9. BIỂU ĐỒ SỰ CỐ & VẤN ĐỀ DỰ ÁN
  const issueData = useMemo(() => {
    const projIssues = issues ? issues.filter(i => targetCodes.includes(i.projectCode)) : [];
    
    let resolved = 0;
    let inProgress = 0;
    let open = 0;
    let critical = 0;

    projIssues.forEach(iss => {
      const st = (iss.status || '').toLowerCase();
      const prio = (iss.priority || '').toLowerCase();
      if (st === 'resolved' || st === 'closed' || st === 'hoàn thành' || st === 'đã xử lý') {
        resolved += 1;
      } else {
        if (prio === 'critical' || prio === 'high' || prio === 'khẩn cấp' || prio === 'cao') {
          critical += 1;
        }
        if (st === 'in_progress' || st === 'đang xử lý') {
          inProgress += 1;
        } else {
          open += 1;
        }
      }
    });

    return [
      { name: 'Đã giải quyết', value: resolved, color: '#10b981' },
      { name: 'Đang xử lý', value: inProgress, color: '#3b82f6' },
      { name: 'Mới tạo / Chờ', value: open, color: '#f59e0b' },
      { name: 'Khẩn cấp / Cao', value: critical, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [issues, targetCodes]);

  // 10. BIỂU ĐỒ NHẬT KÝ HIỆN TRƯỜNG THEO DỰ ÁN
  const fieldLogsData = useMemo(() => {
    if (!fieldLogs) return [];
    return displayEnhancedProjects.map(p => {
      const count = fieldLogs.filter(l => l.projectCode === p.code || (l as any).projectId === p.id).length;
      return {
        name: p.name,
        "Số nhật ký": count
      };
    })
    .filter(d => d["Số nhật ký"] > 0)
    .sort((a, b) => b["Số nhật ký"] - a["Số nhật ký"])
    .slice(0, 10);
  }, [displayEnhancedProjects, fieldLogs]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const yAxisWidth = isMobile ? 110 : 200;

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 overflow-hidden text-slate-800">
      
      {/* HEADER BAR */}
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-5">
        
        {/* TOP SUMMARY KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          <div onClick={() => navigate('/projects')} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-primary transition-colors">Tổng dự án</span>
              <span className="material-symbols-outlined text-primary text-xl bg-blue-50 p-1.5 rounded-lg">folder</span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-slate-800">{topMetrics.totalProjects}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{topMetrics.activeProjects} đang triển khai</p>
            </div>
          </div>

          <div onClick={() => navigate('/cost-plan')} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Tổng thực chi</span>
              <span className="material-symbols-outlined text-emerald-600 text-xl bg-emerald-50 p-1.5 rounded-lg">account_balance_wallet</span>
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-black text-slate-800 truncate" title={formatCurrency(topMetrics.totalActualCost)}>{formatCurrency(topMetrics.totalActualCost)}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{topMetrics.costPercent}% ngân sách</p>
            </div>
          </div>

          <div onClick={() => navigate('/task-management')} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Tổng đầu việc</span>
              <span className="material-symbols-outlined text-blue-600 text-xl bg-blue-50 p-1.5 rounded-lg">task_alt</span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-slate-800">{topMetrics.totalTasksCount}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{topMetrics.completedTasksCount} đã xong ({topMetrics.taskPercent}%)</p>
            </div>
          </div>

          <div onClick={() => navigate('/documents')} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-rose-600 transition-colors">Hồ sơ dự án</span>
              <span className="material-symbols-outlined text-rose-600 text-xl bg-rose-50 p-1.5 rounded-lg">description</span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-slate-800">{topMetrics.totalDocs}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{topMetrics.completedDocs} đã hoàn thành/gửi</p>
            </div>
          </div>

          <div onClick={() => navigate('/material-tracking')} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">Vật tư & Mua sắm</span>
              <span className="material-symbols-outlined text-amber-600 text-xl bg-amber-50 p-1.5 rounded-lg">inventory_2</span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-slate-800">{materialPlans.length}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{purchasingPlans.length} kế hoạch thu mua</p>
            </div>
          </div>

          <div onClick={() => navigate('/personnel')} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Nhân sự</span>
              <span className="material-symbols-outlined text-indigo-600 text-xl bg-indigo-50 p-1.5 rounded-lg">groups</span>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-slate-800">{topMetrics.activeEngineers}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">kỹ sư & chuyên viên</p>
            </div>
          </div>

        </div>

        {displayEnhancedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
            <h3 className="mt-3 font-bold text-slate-700">Chưa có dự án nào</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 1. TIẾN ĐỘ THI CÔNG (%) */}
            <ChartBox title="TIẾN ĐỘ THI CÔNG (%)" subtitle="Top 10 dự án theo tỷ lệ hoàn thành" onClick={() => navigate("/projects")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={progressData} margin={{ top: 10, right: 35, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val}%`, 'Tiến độ']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Tiến độ (%)" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    <LabelList dataKey="Tiến độ (%)" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: isMobile ? 10 : 11, fill: '#475569', fontWeight: 600 }} />
                    {progressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry["Tiến độ (%)"] >= 100 ? '#10b981' : entry["Tiến độ (%)"] >= 60 ? '#3b82f6' : entry["Tiến độ (%)"] >= 30 ? '#f59e0b' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            {/* 2. TỔNG CHI PHÍ THỰC TẾ (VNĐ) */}
            <ChartBox title="TỔNG CHI PHÍ THỰC TẾ (VNĐ)" subtitle="Chi phí lũy kế đã giải ngân theo từng dự án" onClick={() => navigate("/cost-plan")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={costData} margin={{ top: 10, right: isMobile ? 65 : 90, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [formatCurrency(val), 'Tổng chi']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Tổng chi (VNĐ)" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    <LabelList dataKey="Tổng chi (VNĐ)" position="right" formatter={(val: number) => `${(val / 1000000).toFixed(1)} tr`} style={{ fontSize: isMobile ? 9 : 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            {/* 3. SO SÁNH NGÂN SÁCH VS THỰC CHI (VNĐ) */}
            <ChartBox title="SO SÁNH NGÂN SÁCH VÀ THỰC CHI" subtitle="Đối chiếu giá trị hợp đồng kế hoạch và chi phí thực tế" onClick={() => navigate("/cost-plan")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={budgetVsCostData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                  <Legend verticalAlign="top" align="right" height={24} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Ngân sách (Hợp đồng)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Chi phí thực tế" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>

            {/* 4. CƠ CẤU CHI PHÍ TOÀN HỆ THỐNG */}
            <ChartBox title="CƠ CẤU CHI PHÍ TOÀN HỆ THỐNG" subtitle="Tỷ trọng phân bổ nguồn vốn: Vật tư, Dự án & Nhân công" onClick={() => navigate("/cost-plan")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {costStructureData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">Chưa có dữ liệu chi phí</div>
                ) : (
                  <PieChart>
                    <Pie 
                      data={costStructureData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="50%" 
                      outerRadius="80%" 
                      dataKey="value" 
                      stroke="none"
                    >
                      {costStructureData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

            {/* 5. TRẠNG THÁI CÔNG VIỆC TOÀN BỘ DỰ ÁN */}
            <ChartBox title="TRẠNG THÁI CÔNG VIỆC TOÀN BỘ DỰ ÁN" subtitle="Tổng quan tình trạng thực hiện đầu việc hệ thống" onClick={() => navigate("/task-management")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {globalTaskStatusData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">Chưa có dữ liệu công việc</div>
                ) : (
                  <PieChart>
                    <Pie 
                      data={globalTaskStatusData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="50%" 
                      outerRadius="80%" 
                      dataKey="value" 
                      stroke="none"
                    >
                      {globalTaskStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val} công việc`, 'Số lượng']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

            {/* 6. TIẾN ĐỘ CUNG ỨNG VẬT TƯ (%) */}
            <ChartBox title="TIẾN ĐỘ CUNG ỨNG VẬT TƯ (%)" subtitle="Tỷ lệ đáp ứng và giao nhận vật tư theo kế hoạch" onClick={() => navigate("/material-tracking")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {materialProgressData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">Chưa có kế hoạch vật tư</div>
                ) : (
                  <BarChart data={materialProgressData} margin={{ top: 10, right: 35, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val}%`, 'Tiến độ vật tư']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Tiến độ vật tư (%)" fill="#0ea5e9" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      <LabelList dataKey="Tiến độ vật tư (%)" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: isMobile ? 10 : 11, fill: '#0ea5e9', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

            {/* 7. HỒ SƠ ĐÃ GỬI VÀ CHƯA GỬI */}
            <ChartBox title="HỒ SƠ ĐÃ GỬI VÀ CHƯA GỬI" subtitle="Tình trạng chuyển giao hồ sơ pháp lý & kỹ thuật" onClick={() => navigate("/documents")}>
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

            {/* 8. KPI CÔNG VIỆC NHÂN VIÊN */}
            <ChartBox title="KPI CÔNG VIỆC NHÂN VIÊN" subtitle="Năng suất hoàn thành công việc theo từng nhân viên" onClick={() => navigate("/personnel")}>
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

            {/* 9. THỐNG KÊ SỰ CỐ & VẤN ĐỀ HIỆN TRƯỜNG */}
            <ChartBox title="SỰ CỐ & VẤN ĐỀ HIỆN TRƯỜNG" subtitle="Phân loại tình trạng xử lý sự cố phát sinh tại công trường" onClick={() => navigate("/issues")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {issueData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <span className="material-symbols-outlined text-3xl text-slate-300">verified</span>
                    <span className="text-xs font-medium">Không có sự cố nào ghi nhận</span>
                  </div>
                ) : (
                  <PieChart>
                    <Pie 
                      data={issueData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="50%" 
                      outerRadius="80%" 
                      dataKey="value" 
                      stroke="none"
                    >
                      {issueData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val} sự cố`, 'Số lượng']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </ChartBox>

            {/* 10. NHẬT KÝ HIỆN TRƯỜNG THEO DỰ ÁN */}
            <ChartBox title="NHẬT KÝ HIỆN TRƯỜNG THEO DỰ ÁN" subtitle="Số lượng bài viết nhật ký ảnh & báo cáo được đăng tải" onClick={() => navigate("/projects")}>
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                {fieldLogsData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <span className="material-symbols-outlined text-3xl text-slate-300">add_a_photo</span>
                    <span className="text-xs font-medium">Chưa có nhật ký hiện trường</span>
                  </div>
                ) : (
                  <BarChart data={fieldLogsData} margin={{ top: 10, right: 35, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }} tickLine={false} axisLine={false} width={yAxisWidth} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val} nhật ký`, 'Số lượng']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Số nhật ký" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      <LabelList dataKey="Số nhật ký" position="right" formatter={(val: number) => `${val} bài`} style={{ fontSize: isMobile ? 10 : 11, fill: '#8b5cf6', fontWeight: 600 }} />
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