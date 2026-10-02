import { Permission } from '../types';
import { getDefaultPermissions, hasPermission } from '../services/authStore';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { Toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { CustomSelect } from '@/components/common/CustomSelect';
import { PullToRefresh } from '../components/common/PullToRefresh';

const filters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'worker', label: 'Nhân viên' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'locked', label: 'Bị khóa' },
];

const ALL_AVAILABLE_PERMISSIONS: Permission[] = [
  'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS',
  'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS', 'VIEW_FIELD_LOGS', 'MANAGE_FIELD_LOGS',
  'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS', 'MANAGE_INVENTORY',
  'VIEW_FINANCE', 'EDIT_PRICES', 'VIEW_PAYMENTS', 'EDIT_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES',
  'VIEW_USERS', 'MANAGE_USERS', 'MANAGE_PERMISSIONS', 'MANAGE_PAYROLL', 'APPROVE_LEAVE_STEP1', 'APPROVE_LEAVE_FINAL', 'EXPORT_DATA', 'VIEW_ACTIVITY_LOG',
  'VIEW_PROJECT_DIAGRAM', 'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS'
];

const getPersonTasks = (person: any, allTasks: any[]) => {
  if (!person || !Array.isArray(allTasks)) return [];
  const personId = String(person.id || '').trim().toLowerCase();
  const personUsername = String(person.username || '').trim().toLowerCase();
  const personCode = String(person.code || '').trim().toLowerCase();
  const personName = String(person.name || '').trim().toLowerCase();

  return allTasks.filter(t => {
    if (t.isSectionHeader) return false;
    const assignedId = String(t.assignedEngineerId || '').trim().toLowerCase();
    const assignedName = String(t.assignedEngineerName || '').trim().toLowerCase();

    if (personId && assignedId === personId) return true;
    if (personUsername && assignedId === personUsername) return true;
    if (personCode && assignedId === personCode) return true;
    if (personName && assignedName === personName) return true;
    if (personName && assignedName && (assignedName.includes(personName) || personName.includes(assignedName))) return true;

    return false;
  });
};

const computePersonKpi = (person: any, allTasks: any[]) => {
  const pTasks = getPersonTasks(person, allTasks);
  const totalCount = pTasks.length;
  
  const todayStr = new Date().toISOString().split('T')[0];

  const completedTasks = pTasks.filter(t => t.isDone || t.status === 'Hoàn thành' || (t.progress !== undefined && t.progress >= 1));
  const completedCount = completedTasks.length;

  const pendingTasks = pTasks.filter(t => !t.isDone && t.status !== 'Hoàn thành' && (t.progress === undefined || t.progress < 1));
  const pendingCount = pendingTasks.length;

  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    const due = String(t.dueDate).split('T')[0];
    return due < todayStr;
  });
  const overdueCount = overdueTasks.length;

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const avgProgress = totalCount > 0 
    ? Math.round(pTasks.reduce((sum, t) => sum + (t.isDone || t.status === 'Hoàn thành' ? 100 : Math.round((t.progress || 0) * 100)), 0) / totalCount) 
    : 0;

  return {
    tasks: pTasks,
    totalCount,
    completedCount,
    pendingCount,
    overdueCount,
    percent,
    avgProgress
  };
};

export const PersonnelPage: React.FC = () => {
  const { engineers, projects, tasks, createEngineer, updateEngineer, deleteEngineer, fetchProjects, fetchEngineers, fetchTasks, addTask } = useRealtimeStore();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const user = useAuthStore(state => state.user);
  const [role, setRole] = useState(user?.role || 'Nhân viên');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProjectCodes, setSelectedProjectCodes] = useState<string[]>([]);
  const [isAllProjects, setIsAllProjects] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<'level1' | 'level2' | 'level3' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<{ id: string; name: string } | null>(null);
  const [viewingProjectsPerson, setViewingProjectsPerson] = useState<any | null>(null);
  const [projectModalSearch, setProjectModalSearch] = useState('');
  
  // KPI Modal state
  const [viewingKpiPerson, setViewingKpiPerson] = useState<any | null>(null);
  const [kpiFilterTab, setKpiFilterTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [kpiSearch, setKpiSearch] = useState('');

  // Quick Task Assign State
  const [isQuickAssignModalOpen, setIsQuickAssignModalOpen] = useState(false);
  const [assigningToPerson, setAssigningToPerson] = useState<any | null>(null);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskProject, setQuickTaskProject] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [quickTaskNotes, setQuickTaskNotes] = useState('');
  const [savingQuickTask, setSavingQuickTask] = useState(false);

  const toggleProjectCode = (code: string) => {
    setSelectedProjectCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  useEffect(() => { 
    fetchProjects(); 
    fetchEngineers();
    fetchTasks();
  }, []);

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSaveQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskName.trim() || !assigningToPerson) {
      triggerToast('Vui lòng nhập tên công việc!', 'warning');
      return;
    }
    setSavingQuickTask(true);
    try {
      const projObj = projects.find(p => p.code === quickTaskProject || p.id === quickTaskProject);
      const pCode = projObj ? projObj.code : (quickTaskProject || 'COMPANY');
      const pName = projObj ? projObj.name : (quickTaskProject === 'COMPANY' ? 'Nội bộ Công ty' : quickTaskProject);

      await addTask({
        stt: String(tasks.filter(t => t.projectCode === pCode && !t.isSectionHeader).length + 1),
        code: `TSK-${Date.now().toString().slice(-6)}`,
        name: quickTaskName.trim(),
        projectCode: pCode,
        projectName: pName,
        assignedEngineerId: assigningToPerson.id || assigningToPerson.code || '',
        assignedEngineerName: assigningToPerson.name,
        assignerId: user?.id || 'admin',
        assignerName: user?.name || user?.username || 'Quản trị viên',
        dueDate: quickTaskDueDate || undefined,
        priority: quickTaskPriority,
        notes: quickTaskNotes.trim() || undefined,
        status: 'Chưa làm',
        progress: 0,
        volume: 1,
        unit: 'việc',
        purchaseStatus: 'Không có hàng',
        constrStatus: 'Chưa thi công',
        isDone: false
      });

      triggerToast(`Đã giao việc thành công cho ${assigningToPerson.name}!`, 'success');
      setIsQuickAssignModalOpen(false);
      setQuickTaskName('');
      setQuickTaskNotes('');
    } catch (err: any) {
      triggerToast(`Lỗi giao việc: ${err.message || err}`, 'warning');
    } finally {
      setSavingQuickTask(false);
    }
  };

  const handleExportExcel = () => {
    const data = people.map((p, index) => {
      const kpi = computePersonKpi(p, tasks);
      return {
        'STT': index + 1,
        'Mã nhân viên': p.code,
        'Họ tên': p.name,
        'Vai trò': p.role,
        'Đội/Nhóm': p.team,
        'Số điện thoại': p.phone || 'Chưa cập nhật',
        'Tổng số công việc': kpi.totalCount,
        'Đã hoàn thành': kpi.completedCount,
        'Chưa hoàn thành': kpi.pendingCount,
        'Quá hạn': kpi.overdueCount,
        'Tỷ lệ hoàn thành (%)': `${kpi.percent}%`,
        'Tiến độ TB (%)': `${kpi.avgProgress}%`,
        'Trạng thái': p.locked ? 'Bị khóa' : 'Đang hoạt động'
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhanSu_KPI');
    XLSX.writeFile(wb, `Danh_Sach_Nhan_Su_KPI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportIndividualKpi = (person: any, kpiData: any) => {
    const data = kpiData.tasks.map((t: any, idx: number) => ({
      'STT': idx + 1,
      'Mã dự án': t.projectCode || '-',
      'Tên dự án': t.projectName || '-',
      'Tên công việc': t.name,
      'Người giao việc': t.assignerName || '-',
      'Hạn hoàn thành': t.dueDate || '-',
      'Tiến độ (%)': t.isDone || t.status === 'Hoàn thành' ? '100%' : `${Math.round((t.progress || 0) * 100)}%`,
      'Trạng thái': t.status || (t.isDone ? 'Hoàn thành' : 'Chưa làm'),
      'Ghi chú': t.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CongViec_KPI');
    XLSX.writeFile(wb, `KPI_${person.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleLock = async (person: any) => {
    try {
      const newStatus = !person.locked;
      await updateEngineer(person.id, { isLocked: newStatus } as any);
      triggerToast(`Đã ${newStatus ? 'khóa' : 'mở khóa'} tài khoản ${person.name}`, 'success');
    } catch (e: any) {
      triggerToast(`Lỗi: ${e?.message}`, 'warning');
    }
  };

  const resetForm = () => {
    setEditingPersonId(null);
    setName('');
    setPhone('');
    setRole('Nhân viên');
    setUsername('');
    setPassword('');
    setSelectedProjectCodes([]);
    setIsAllProjects(false);
    setPermissions(getDefaultPermissions('Nhân viên'));
  };

  const closeForm = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const people = useMemo(() => engineers.map((engineer, index) => {
    let assignedProjects = [];
    
    // Combine all sources of assigned projects
    const allAssigned = [
      ...(engineer.managedProjects || []),
      ...(engineer.memberProjects || []),
    ];
    
    if (engineer.projectCodes && Array.isArray(engineer.projectCodes)) {
      engineer.projectCodes.forEach((code: string) => {
        const uCode = (code || '').trim().toUpperCase();
        if (uCode === 'COMPANY') {
          allAssigned.push({ code: 'COMPANY', name: 'Kho Tổng (Kho Công Ty)' });
        } else {
          const found = projects.find(p => (p.code || '').trim().toUpperCase() === uCode || (p.id || '').trim().toUpperCase() === uCode);
          if (found) {
            allAssigned.push({ code: found.code || found.id, name: found.name });
          }
        }
      });
    }

    // Also check projects where this engineer is listed in project.members, memberIds, or managerName
    const engNameUpper = (engineer.name || '').trim().toUpperCase();
    projects.forEach(p => {
      const isMember = (Array.isArray(p.members) && p.members.includes(engineer.id)) ||
                       (Array.isArray(p.memberIds) && p.memberIds.includes(engineer.id));
      const isManager = p.managerName ? p.managerName.split(',').map(s => s.trim().toUpperCase()).includes(engNameUpper) : false;
      if (isMember || isManager) {
        allAssigned.push({ code: p.code || p.id, name: p.name });
      }
    });

    // Filter out duplicates and projects that no longer exist in the projects list
    assignedProjects = allAssigned.filter((value, assignedIndex, self) => 
      (value.code === 'COMPANY' || projects.some(p => (p.code || p.name || '').trim().toUpperCase() === (value.code || value.name || '').trim().toUpperCase() || (p.id || '').trim().toUpperCase() === (value.code || '').trim().toUpperCase())) &&
      self.findIndex((item) => (item.code || item.name || '').trim().toUpperCase() === (value.code || value.name || '').trim().toUpperCase()) === assignedIndex
    );

    let rawRole = (engineer as any).role || engineer.title?.trim() || 'Nhân viên';
    if (rawRole === 'Nhân viên/Thợ') rawRole = 'Nhân viên';
    
    const removeAccents = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    };
    
    const cleanRole = removeAccents(rawRole).toUpperCase().replace(/\s+/g, '-');
    const cleanName = removeAccents(engineer.name).toUpperCase().replace(/\s+/g, '-');

    let legacyCode = engineer.code || '';
    if (legacyCode.includes('/THO')) {
      legacyCode = legacyCode.replace('/THO', '');
    }

    return {
      ...engineer,
      assignedProjects,
      code: legacyCode || `TSM-${cleanRole}-${cleanName}`,
      
      team: assignedProjects[0]?.name || 'Chưa gán dự án',
      locked: (engineer as any).isLocked || false,
      username: (engineer as any).username || '',
      role: rawRole,
    };
  }).filter((person) => {
    if (person.role === 'Quản trị viên' || person.username === 'admin') return false;
    
    const term = searchTerm.toLowerCase();
    const matchSearch = !term 
      || person.name.toLowerCase().includes(term)
      || person.code.toLowerCase().includes(term)
      || person.role.toLowerCase().includes(term)
      || (person.phone && person.phone.toLowerCase().includes(term));

    const matchFilter = filter === 'all'
      || (filter === 'manager' && person.role.includes('Quản lý'))
      || (filter === 'worker' && person.role.includes('Nhân viên'))
      || (filter === 'active' && !person.locked)
      || (filter === 'locked' && person.locked);
    return matchFilter && matchSearch;
  }), [engineers, filter, searchTerm]);

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (person: typeof people[number]) => {
    setEditingPersonId(person.id);
    setName(person.name || '');
    setPermissions((person.permissions?.length ?? 0) > 0 ? person.permissions! : getDefaultPermissions(person.role || 'Nhân viên'));
    setPhone(person.phone || '');
    setRole(person.role || 'Nhân viên');
    setUsername((person as any).username || '');
    setPassword('');
    
    // Read projectCodes directly from engineer object in engineers store
    const eng = engineers.find(e => e.id === person.id) || person;
    const rawProjectCodes = (eng as any).projectCodes || (eng as any).project_codes || [];
    const initialCodes = Array.isArray(rawProjectCodes) ? rawProjectCodes : [];
    
    setSelectedProjectCodes(initialCodes);
    setIsFormOpen(true);
  };

  const handleSavePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    if (selectedProjectCodes.length === 0) {
      triggerToast('Vui lòng chọn ít nhất 1 dự án cho nhân sự!', 'warning');
      return;
    }
    
    const finalProjectCodes = selectedProjectCodes;
    
    setSubmitting(true);
    try {
      if (editingPersonId) {
        await updateEngineer(editingPersonId, {
          name: name.trim(),
          phone,
          role,
          title: role,
          ...(username ? { username: username.trim() } : {}),
          ...(password ? { password } : {}),
          projectCodes: finalProjectCodes,
          permissions,
        });

        // Synchronize updated personnel with projects member arrays
        const engId = editingPersonId;
        const targetCodesUpper = finalProjectCodes.map(c => String(c || '').trim().toUpperCase());
        const projectSyncPromises: Promise<any>[] = [];
        
        for (const proj of projects) {
          const pCodeUpper = String(proj.code || '').trim().toUpperCase();
          const pIdUpper = String(proj.id || '').trim().toUpperCase();
          const currentMembers = Array.isArray(proj.members) ? proj.members : [];
          const currentMemberIds = Array.isArray(proj.memberIds) ? proj.memberIds : [];
          
          const isAssigned = targetCodesUpper.includes(pCodeUpper) || targetCodesUpper.includes(pIdUpper);
          const hasMember = currentMembers.includes(engId) || currentMemberIds.includes(engId);

          if (isAssigned && !hasMember) {
            const nextMembers = Array.from(new Set([...currentMembers, engId]));
            const nextMemberIds = Array.from(new Set([...currentMemberIds, engId]));
            projectSyncPromises.push(useRealtimeStore.getState().updateProject(proj.id, { members: nextMembers, memberIds: nextMemberIds }));
          } else if (!isAssigned && hasMember) {
            const nextMembers = currentMembers.filter(m => m !== engId);
            const nextMemberIds = currentMemberIds.filter(m => m !== engId);
            projectSyncPromises.push(useRealtimeStore.getState().updateProject(proj.id, { members: nextMembers, memberIds: nextMemberIds }));
          }
        }
        if (projectSyncPromises.length > 0) {
          await Promise.all(projectSyncPromises).catch(err => console.warn('Project member sync failed:', err));
        }

        triggerToast(`Đã cập nhật nhân sự "${name.trim()}" thành công!`, 'success');
      } else {
        // KIỂM TRA TRÙNG LẶP TRƯỚC KHI TẠO MỚI
        const normalizeStr = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
        const targetUsername = username.trim().toLowerCase();
        const targetName = normalizeStr(name);
        const targetPhone = phone.trim();

        const duplicate = engineers.find(eng => {
          if (eng.role === 'Quản trị viên' || (eng as any).username === 'admin') return false;
          const engUsername = ((eng as any).username || '').trim().toLowerCase();
          const engName = normalizeStr(eng.name || '');
          const engPhone = (eng.phone || '').trim();

          const matchUsername = targetUsername && engUsername && engUsername === targetUsername;
          const matchName = targetName && engName === targetName;
          const matchPhone = targetPhone && targetPhone.length >= 8 && engPhone === targetPhone;

          return matchUsername || matchName || (matchPhone && matchName);
        });

        if (duplicate) {
          triggerToast('Cảnh báo: Tên đăng nhập hoặc tài khoản này đã tồn tại trong hệ thống! Vui lòng kiểm tra lại.', 'warning');
          setSubmitting(false);
          return;
        }

        await createEngineer({
          name: name.trim(),
          phone,
          role,
          title: role,
          username: username.trim(),
          password,
          projectCodes: finalProjectCodes,
          permissions,
        });
        triggerToast(`Đã thêm nhân sự "${name.trim()}" và gán ${selectedProjectCodes.length} dự án!`, 'success');
      }
      closeForm();
    } catch (e: any) {
      triggerToast(
        `${editingPersonId ? 'Lỗi khi cập nhật nhân sự: ' : 'Lỗi khi thêm nhân sự: '}${e?.response?.data?.error || e.message || 'Không xác định'}`,
        'warning'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePerson = async (id: string, name: string) => {
    try {
      await deleteEngineer(id);
      triggerToast(`Đã xóa nhân sự "${name}"`, 'success');
    } catch (err: any) {
      triggerToast(`Lỗi khi xóa nhân sự: ${err?.response?.data?.error || err.message}`, 'warning');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-hidden">
      <section className="border-b border-slate-200 bg-white pl-3 pr-16 md:pr-20 py-2.5 md:py-0 md:h-12 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full">
          <div className="flex items-center justify-between w-full md:w-auto h-8 md:h-auto mb-1 md:mb-0">
            <h2 className="page-title text-base md:text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">TÀI KHOẢN & NHÂN SỰ</h2>
          </div>

          <div className="flex items-center gap-2 justify-between md:justify-end w-full md:w-auto pt-0.5 md:pt-0 flex-wrap">
            {/* Search Input (Mobile + Desktop) */}
            <div className="relative flex-1 min-w-[120px] md:w-56 md:flex-initial">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
              <input
                type="text"
                placeholder="Tìm nhân sự..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all h-8 md:h-[34px]"
              />
            </div>

            <span className="h-8 md:h-[34px] px-3 md:px-3 rounded-lg flex items-center bg-blue-50 text-primary text-xs font-bold border border-blue-100 shrink-0">{engineers.filter(e => e.role !== 'Quản trị viên' && e.username !== 'admin').length} nhân sự</span>
            
            {/* Desktop Export Dropdown with Standardized Height */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 h-[34px] px-3.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs relative z-50 cursor-pointer"
                title="Xuất file"
              >
                <span className="material-symbols-outlined text-[14px]">file_download</span>
                <span>Xuất file</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in duration-100">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                      Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                      CSV (.csv)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        window.print();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                      PDF (.pdf)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-blue-600">description</span>
                      Word (.docx)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Export Icon Dropdown */}
            <div className="relative md:hidden shrink-0">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="flex items-center justify-center h-8 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs gap-0.5"
                title="Xuất file"
              >
                <span className="material-symbols-outlined text-base">file_download</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[9998]" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[9999] animate-in fade-in zoom-in duration-100">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                      Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                      CSV (.csv)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        window.print();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                      PDF (.pdf)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base text-blue-600">description</span>
                      Word (.docx)
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={openCreateModal}
              title="Thêm nhân sự"
              className="bg-primary text-white h-8 md:h-[34px] w-8 md:w-auto px-0 md:px-3.5 rounded-lg text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span className="hidden md:inline">Thêm nhân sự</span>
            </button>
          </div>
        </div>
      </section>

      <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col pb-4">
      <section className="flex-1 grid grid-cols-1 gap-0 overflow-hidden">
        <div className="bg-white border-b border-r border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <PullToRefresh onRefresh={async () => { await Promise.all([fetchEngineers(), fetchProjects()]); }} className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative pb-16 md:pb-0">
            <table className="w-full text-[11px] sm:text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 uppercase text-[10px] sm:text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Họ tên</th>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Mã NV</th>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Tài khoản</th>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Vai trò / Chức danh</th>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Dự án</th>
                  <th className="text-center p-2 sm:p-3 bg-slate-50 whitespace-nowrap">KPI & Công việc</th>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">SĐT</th>
                  <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Trạng thái</th>
                  {hasPermission(user, 'MANAGE_USERS') && <th className="text-left p-2 sm:p-3 bg-slate-50 whitespace-nowrap">Chức năng</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((person, index) => {
                  const kpi = computePersonKpi(person, tasks);
                  return (
                    <tr
                      key={person.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => openEditModal(person)}
                    >
                      <td className="p-2 sm:p-3 text-xs sm:text-sm font-semibold text-slate-900 tracking-tight min-w-[120px] whitespace-nowrap">
                        <div>{person.name}</div>
                      </td>
                      <td className="p-2 sm:p-3 font-mono font-bold text-primary max-w-[140px] truncate whitespace-nowrap text-[10px] sm:text-xs" title={person.code}>{person.code}</td>
                      <td className="p-2 sm:p-3 text-slate-700 font-semibold max-w-[110px] truncate whitespace-nowrap text-[10px] sm:text-xs" title={person.username || '-'}>{person.username || '-'}</td>
                      <td className="p-2 sm:p-3 whitespace-nowrap">
                        <span className={`text-[10px] sm:text-[11px] font-bold ${
                          person.role === 'Quản trị viên' ? 'text-purple-700' :
                          person.role === 'Quản lý dự án' ? 'text-blue-700' :
                          person.role === 'Kỹ sư hiện trường' ? 'text-orange-700' :
                          'text-slate-700'
                        }`}>
                          {person.role}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 whitespace-nowrap">
                        {person.assignedProjects.length === 0 ? (
                          <span className="text-slate-400 text-[10px] sm:text-[11px] italic">Chưa phân công</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectModalSearch('');
                              setViewingProjectsPerson(person);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 border border-blue-200 text-[11px] sm:text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer group"
                            title={`Xem ${person.assignedProjects.length} dự án tham gia`}
                          >
                            <span className="material-symbols-outlined text-[15px] group-hover:scale-110 transition-transform">folder_open</span>
                            <span>Xem dự án</span>
                            <span className="px-1.5 py-0.2 bg-primary text-white rounded-full text-[10px] font-bold">
                              {person.assignedProjects.length}
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="p-2 sm:p-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingKpiPerson(person);
                            setKpiFilterTab('all');
                            setKpiSearch('');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] sm:text-xs font-bold transition-all active:scale-95 shadow-2xs group cursor-pointer"
                          title={`Xem chi tiết KPI (${kpi.completedCount}/${kpi.totalCount} công việc hoàn thành)`}
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary group-hover:scale-110 transition-transform">analytics</span>
                          <span className="text-slate-800 font-extrabold">{kpi.completedCount}/{kpi.totalCount} CV</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            kpi.totalCount === 0 ? 'bg-slate-100 text-slate-500' :
                            kpi.percent === 100 ? 'bg-emerald-100 text-emerald-700' :
                            kpi.percent >= 50 ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {kpi.percent}%
                          </span>
                          {kpi.overdueCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse" title={`${kpi.overdueCount} việc quá hạn`}>
                              !{kpi.overdueCount}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-2 sm:p-3 text-slate-600 whitespace-nowrap text-[10px] sm:text-xs">{person.phone || 'Chưa cập nhật'}</td>
                    <td className="p-2 sm:p-3 whitespace-nowrap"><span className={`text-[10px] sm:text-[11px] font-bold ${person.locked ? 'text-red-700' : 'text-emerald-700'}`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>
                    <td className="p-2 sm:p-3 min-w-[140px] whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleLock(person);
                          }}
                          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-bold active:scale-95 transition-all ${person.locked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{person.locked ? 'lock_open' : 'lock'}</span>
                          {person.locked ? 'Mở khóa' : 'Khóa'}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingPerson({ id: person.id, name: person.name });
                          }}
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-red-200 bg-white text-[11px] font-bold text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </PullToRefresh>
        </div>
      </section>
      </div>

      <Modal size='xl' isOpen={isFormOpen} onClose={closeForm} title={editingPersonId ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự'}>
        <form onSubmit={async (e) => { e.preventDefault(); if (loading || isSubmittingRef.current) return; isSubmittingRef.current = true; setLoading(true); try { await handleSavePerson(e); } finally { isSubmittingRef.current = false; setLoading(false); } }} className="p-1">
<div className="flex flex-col lg:flex-row gap-4">
<div className="lg:w-[40%] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-700">Họ tên <span className="text-red-500">*</span></label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập họ tên" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-700">Số điện thoại</label>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập SĐT" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>
          
            <div className="space-y-1 mb-3">
              <label className="text-[13px] font-bold text-slate-700">Vai trò / Chức danh</label>
              <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Nhập chức danh (VD: Quản trị viên, Trưởng phòng...)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-slate-700">Tên đăng nhập</label>
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-slate-700">Mật khẩu {editingPersonId && <span className="text-slate-400 font-normal text-[11px]">(Bỏ trống nếu không đổi)</span>}</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={editingPersonId ? "••••••••" : "Nhập mật khẩu"} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
            </div>

            {/* CẤP ĐỘ PHÂN QUYỀN */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[13px] font-bold text-slate-700">
                Phân quyền
              </label>
              
              <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                {/* Cấp 1: Cao nhất (Toàn quyền / Ban Giám Đốc / Duyệt C2) */}
                <label className="flex items-center gap-2.5 text-sm p-1 hover:bg-slate-100/80 rounded cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={
                      selectedLevel === 'level1' ||
                      (permissions.includes('APPROVE_LEAVE_FINAL') && permissions.includes('DELETE_PROJECTS'))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLevel('level1');
                        setPermissions([...ALL_AVAILABLE_PERMISSIONS]);
                      } else {
                        setSelectedLevel(null);
                        setPermissions([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Cấp 1</span>
                </label>

                {/* Cấp 2: Quản lý / Trưởng nhóm (Duyệt C1) */}
                <label className="flex items-center gap-2.5 text-sm p-1 hover:bg-slate-100/80 rounded cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={
                      selectedLevel === 'level2' ||
                      (permissions.includes('APPROVE_LEAVE_STEP1') && !permissions.includes('APPROVE_LEAVE_FINAL'))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLevel('level2');
                        setPermissions([
                          'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS',
                          'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS', 'VIEW_FIELD_LOGS', 'MANAGE_FIELD_LOGS',
                          'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS', 'MANAGE_INVENTORY',
                          'VIEW_FINANCE', 'VIEW_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES',
                          'VIEW_USERS', 'MANAGE_PAYROLL', 'EXPORT_DATA', 'VIEW_ACTIVITY_LOG',
                          'APPROVE_LEAVE_STEP1',
                          'VIEW_PROJECT_DIAGRAM', 'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS'
                        ]);
                      } else {
                        setSelectedLevel(null);
                        setPermissions([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Cấp 2</span>
                </label>

                {/* Cấp 3: Nhân viên / Kỹ sư hiện trường (Khớp chính xác ảnh mẫu) */}
                <label className="flex items-center gap-2.5 text-sm p-1 hover:bg-slate-100/80 rounded cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={
                      selectedLevel === 'level3' ||
                      (
                        permissions.includes('VIEW_PROJECTS') &&
                        permissions.includes('VIEW_TASKS') &&
                        permissions.includes('UPDATE_TASK_PROGRESS') &&
                        permissions.includes('VIEW_FIELD_LOGS') &&
                        permissions.includes('MANAGE_FIELD_LOGS') &&
                        permissions.includes('VIEW_MATERIALS') &&
                        permissions.includes('UPDATE_MATERIAL_STATUS') &&
                        permissions.includes('VIEW_USERS') &&
                        permissions.includes('VIEW_PROJECT_DIAGRAM') &&
                        permissions.includes('VIEW_DOCUMENTS') &&
                        !permissions.includes('APPROVE_LEAVE_STEP1') &&
                        !permissions.includes('APPROVE_LEAVE_FINAL') &&
                        !permissions.includes('VIEW_FINANCE') &&
                        !permissions.includes('CREATE_PROJECTS')
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLevel('level3');
                        setPermissions([
                          'VIEW_PROJECTS',
                          'VIEW_TASKS', 'UPDATE_TASK_PROGRESS', 'VIEW_FIELD_LOGS', 'MANAGE_FIELD_LOGS',
                          'VIEW_MATERIALS', 'UPDATE_MATERIAL_STATUS',
                          'VIEW_USERS',
                          'VIEW_PROJECT_DIAGRAM', 'VIEW_DOCUMENTS'
                        ]);
                      } else {
                        setSelectedLevel(null);
                        setPermissions([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Cấp 3</span>
                </label>
              </div>
            </div>
          
          
            
<div className="pt-4 mt-3 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeForm} className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors">Hủy</button>
            <button
              type="submit"
              disabled={submitting || projects.length === 0 || !name.trim()}
              className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
            >
              {submitting ? 'Đang xử lý...' : (editingPersonId ? 'Lưu thay đổi' : 'Thêm nhân sự')}
            </button>
          </div>
</div>
<div className="lg:w-[60%] border-t lg:border-t-0 lg:border-l lg:pl-4 border-slate-100">
<div className="mt-2">
  <div className="flex justify-between items-center mb-1.5">
    <label className="block text-[13px] font-bold text-slate-700">
      Phân quyền Dự án <span className="text-red-500">*</span>
    </label>
    {projects.length > 0 && (
      <label className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-blue-700 cursor-pointer select-none bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors border border-blue-200">
        <input
          type="checkbox"
          checked={
            selectedProjectCodes.includes('COMPANY') &&
            projects.every(p => selectedProjectCodes.includes(p.code))
          }
          onChange={(e) => {
            if (e.target.checked) {
              const allCodes = ['COMPANY', ...projects.map(p => p.code)];
              setSelectedProjectCodes(allCodes);
            } else {
              setSelectedProjectCodes([]);
            }
          }}
          className="accent-primary w-3.5 h-3.5 cursor-pointer rounded"
        />
        <span>Chọn tất cả</span>
      </label>
    )}
  </div>
  <div>
    <div className={`max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-slate-50 custom-scrollbar ${selectedProjectCodes.length === 0 ? 'border-red-300' : 'border-slate-200'}`}>
      <label key="COMPANY" className="flex items-center gap-2 text-sm p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors border-b border-slate-200/60 pb-2 mb-1">
        <input type="checkbox" checked={selectedProjectCodes.includes('COMPANY')} onChange={() => toggleProjectCode('COMPANY')} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
        <span className="font-bold text-primary">Kho Tổng (Kho Công Ty)</span>
        <span className="text-slate-400 text-xs">(COMPANY)</span>
      </label>
      {projects.length === 0 && <p className="text-[11px] text-slate-400 p-2">Chưa có dự án nào trong hệ thống.</p>}
      {projects.map((p) => (
        <label key={p.code} className="flex items-center gap-2 text-sm p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors">
          <input type="checkbox" checked={selectedProjectCodes.includes(p.code)} onChange={() => toggleProjectCode(p.code)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
          <span className="font-semibold text-slate-700">{p.name}</span>
          <span className="text-slate-400 text-xs">({p.code})</span>
        </label>
      ))}
    </div>
    {selectedProjectCodes.length === 0 && (
      <p className="mt-1 text-[11px] text-red-500">Bắt buộc chọn ít nhất 1 dự án để nhân sự có quyền truy cập.</p>
    )}
  </div>
<div className="border-t border-slate-100 my-2"></div>

              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[13px] font-bold text-slate-700 uppercase">Phân quyền chi tiết</h3>
                <label className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-blue-700 cursor-pointer select-none bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors border border-blue-200">
                  <input
                    type="checkbox"
                    checked={ALL_AVAILABLE_PERMISSIONS.every(p => permissions.includes(p))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPermissions([...ALL_AVAILABLE_PERMISSIONS]);
                      } else {
                        setPermissions([]);
                      }
                    }}
                    className="accent-primary w-4 h-4 cursor-pointer rounded"
                  />
                  <span>Chọn tất cả</span>
                </label>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {/* DỰ ÁN */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Dự án & Tổng quan</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'VIEW_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Xem danh sách dự án</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('CREATE_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'CREATE_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'CREATE_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Tạo dự án mới</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'EDIT_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Sửa thông tin dự án</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('DELETE_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'DELETE_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'DELETE_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Xóa dự án</label>
                </div>
                {/* TIẾN ĐỘ */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Tiến độ công việc</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_TASKS']) : setPermissions(p => p.filter(x => x !== 'VIEW_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Xem tiến độ</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('IMPORT_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'IMPORT_TASKS']) : setPermissions(p => p.filter(x => x !== 'IMPORT_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Nhập Excel/OCR</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_TASKS']) : setPermissions(p => p.filter(x => x !== 'EDIT_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Thêm/Sửa/Xóa công việc</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('ASSIGN_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'ASSIGN_TASKS']) : setPermissions(p => p.filter(x => x !== 'ASSIGN_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Giao việc</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('UPDATE_TASK_PROGRESS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'UPDATE_TASK_PROGRESS']) : setPermissions(p => p.filter(x => x !== 'UPDATE_TASK_PROGRESS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật % và Trạng thái</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('APPROVE_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'APPROVE_TASKS']) : setPermissions(p => p.filter(x => x !== 'APPROVE_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Nghiệm thu công việc</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_FIELD_LOGS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_FIELD_LOGS']) : setPermissions(p => p.filter(x => x !== 'VIEW_FIELD_LOGS'))} className="accent-primary w-3.5 h-3.5"/>Xem nhật ký công trường</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_FIELD_LOGS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_FIELD_LOGS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_FIELD_LOGS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật nhật ký công trường</label>
                </div>
                {/* VẬT TƯ */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Kế hoạch Vật tư</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_MATERIALS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_MATERIALS']) : setPermissions(p => p.filter(x => x !== 'VIEW_MATERIALS'))} className="accent-primary w-3.5 h-3.5"/>Xem danh sách vật tư</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('IMPORT_MATERIALS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'IMPORT_MATERIALS']) : setPermissions(p => p.filter(x => x !== 'IMPORT_MATERIALS'))} className="accent-primary w-3.5 h-3.5"/>Nhập Excel vật tư</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_MATERIALS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_MATERIALS']) : setPermissions(p => p.filter(x => x !== 'EDIT_MATERIALS'))} className="accent-primary w-3.5 h-3.5"/>Sửa/Xóa vật tư</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('UPDATE_MATERIAL_STATUS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'UPDATE_MATERIAL_STATUS']) : setPermissions(p => p.filter(x => x !== 'UPDATE_MATERIAL_STATUS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật trạng thái</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_INVENTORY')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_INVENTORY']) : setPermissions(p => p.filter(x => x !== 'MANAGE_INVENTORY'))} className="accent-primary w-3.5 h-3.5"/>Nhập/Xuất/Chuyển kho</label>
                </div>
                {/* TÀI CHÍNH */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Tài chính & Hợp đồng</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_FINANCE')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_FINANCE']) : setPermissions(p => p.filter(x => x !== 'VIEW_FINANCE'))} className="accent-primary w-3.5 h-3.5"/>Xem bảng giá</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_PRICES')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_PRICES']) : setPermissions(p => p.filter(x => x !== 'EDIT_PRICES'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật giá, VAT</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_PAYMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_PAYMENTS']) : setPermissions(p => p.filter(x => x !== 'VIEW_PAYMENTS'))} className="accent-primary w-3.5 h-3.5"/>Xem Kế hoạch thanh toán</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_PAYMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_PAYMENTS']) : setPermissions(p => p.filter(x => x !== 'EDIT_PAYMENTS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật thanh toán</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_EXPENSES')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_EXPENSES']) : setPermissions(p => p.filter(x => x !== 'VIEW_EXPENSES'))} className="accent-primary w-3.5 h-3.5"/>Xem chi phí công trình</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_EXPENSES')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_EXPENSES']) : setPermissions(p => p.filter(x => x !== 'EDIT_EXPENSES'))} className="accent-primary w-3.5 h-3.5"/>Quản lý chi phí công trình</label>
                </div>
                {/* HỆ THỐNG */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Nhân sự & Hệ thống</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_USERS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_USERS']) : setPermissions(p => p.filter(x => x !== 'VIEW_USERS'))} className="accent-primary w-3.5 h-3.5"/>Xem nhân sự</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_USERS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_USERS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_USERS'))} className="accent-primary w-3.5 h-3.5"/>Quản lý nhân sự</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_PERMISSIONS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_PERMISSIONS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_PERMISSIONS'))} className="accent-primary w-3.5 h-3.5"/>Cấp quyền hệ thống</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_PAYROLL')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_PAYROLL']) : setPermissions(p => p.filter(x => x !== 'MANAGE_PAYROLL'))} className="accent-primary w-3.5 h-3.5"/>Bảng chấm công</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EXPORT_DATA')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EXPORT_DATA']) : setPermissions(p => p.filter(x => x !== 'EXPORT_DATA'))} className="accent-primary w-3.5 h-3.5"/>Xuất báo cáo (Excel/PDF)</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_ACTIVITY_LOG')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_ACTIVITY_LOG']) : setPermissions(p => p.filter(x => x !== 'VIEW_ACTIVITY_LOG'))} className="accent-primary w-3.5 h-3.5"/>Xem lịch sử hoạt động</label>
                </div>
                {/* HỒ SƠ */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Hồ sơ & Tài liệu</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_PROJECT_DIAGRAM')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_PROJECT_DIAGRAM']) : setPermissions(p => p.filter(x => x !== 'VIEW_PROJECT_DIAGRAM'))} className="accent-primary w-3.5 h-3.5"/>Xem sơ đồ dự án</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_DOCUMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_DOCUMENTS']) : setPermissions(p => p.filter(x => x !== 'VIEW_DOCUMENTS'))} className="accent-primary w-3.5 h-3.5"/>Xem hồ sơ</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_DOCUMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_DOCUMENTS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_DOCUMENTS'))} className="accent-primary w-3.5 h-3.5"/>Quản lý hồ sơ</label>
                </div></div></div></div>
</div>
</form>
      </Modal>
      {deletingPerson && (
        <Modal isOpen={!!deletingPerson} onClose={() => setDeletingPerson(null)} title="Xác nhận xóa">
          <div className="py-4">
            <p className="mb-8 text-sm font-medium text-slate-700">Bạn chắc chắn muốn xóa nhân sự "{deletingPerson.name}"?</p>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setDeletingPerson(null)} className="h-[40px] px-5 border border-slate-300 text-slate-700 bg-white rounded hover:bg-slate-50 transition-colors font-medium">Hủy</button>
              <button onClick={() => { const { id, name } = deletingPerson; setDeletingPerson(null); handleDeletePerson(id, name); }} className="h-[40px] px-5 bg-[#e53935] text-white rounded hover:bg-red-700 transition-colors font-bold shadow-md">Xóa</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Xem danh sách dự án của nhân sự */}
      <Modal
        size="md"
        isOpen={Boolean(viewingProjectsPerson)}
        onClose={() => setViewingProjectsPerson(null)}
        title={`Dự án tham gia - ${viewingProjectsPerson?.name || ''}`}
      >
        <div className="space-y-3 p-1">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Mã NV:</span>
              <span className="font-mono font-bold text-primary">{viewingProjectsPerson?.code}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-primary font-bold text-xs border border-blue-100">
              {viewingProjectsPerson?.assignedProjects?.length || 0} dự án
            </span>
          </div>

          {(viewingProjectsPerson?.assignedProjects?.length || 0) > 4 && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={projectModalSearch}
                onChange={(e) => setProjectModalSearch(e.target.value)}
                placeholder="Tìm kiếm dự án..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          )}

          <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {viewingProjectsPerson?.assignedProjects
              ?.filter((p: any) => !projectModalSearch || p.name?.toLowerCase().includes(projectModalSearch.toLowerCase()) || p.code?.toLowerCase().includes(projectModalSearch.toLowerCase()))
              .map((p: any, idx: number) => {
                const matchedProject = projects.find(proj => 
                  (proj.code || '').trim().toUpperCase() === (p.code || '').trim().toUpperCase() || 
                  (proj.id || '').trim().toUpperCase() === (p.code || '').trim().toUpperCase() || 
                  proj.name?.trim().toUpperCase() === p.name?.trim().toUpperCase()
                );
                return (
                  <div
                    key={p.code || idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-blue-50/40 hover:border-blue-300 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={p.name}>
                          {p.name}
                        </p>
                        {p.code && p.code !== 'COMPANY' && (
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            Mã: {p.code}
                          </span>
                        )}
                      </div>
                    </div>
                    {matchedProject && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProjectsPerson(null);
                          window.location.href = `#/projects/${matchedProject.id}/overview`;
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-primary hover:text-white text-primary border border-blue-200 text-[11px] font-bold whitespace-nowrap shrink-0 active:scale-95 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Đi đến dự án này"
                      >
                        <span>Mở</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                );
              })}
            {(!viewingProjectsPerson?.assignedProjects || viewingProjectsPerson.assignedProjects.length === 0) && (
              <p className="text-xs text-slate-400 italic text-center py-4">Chưa phân công dự án nào.</p>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewingProjectsPerson(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Xem KPI & Chi Tiết Công Việc của nhân sự */}
      <Modal
        size="xl"
        isOpen={Boolean(viewingKpiPerson)}
        onClose={() => setViewingKpiPerson(null)}
        title={`Đánh giá KPI & Chi tiết công việc — ${viewingKpiPerson?.name || ''}`}
      >
        {viewingKpiPerson && (() => {
          const kpi = computePersonKpi(viewingKpiPerson, tasks);
          const filteredTasks = kpi.tasks.filter((t: any) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isCompleted = t.isDone || t.status === 'Hoàn thành' || (t.progress !== undefined && t.progress >= 1);
            const isPending = !isCompleted;
            const isOverdue = isPending && t.dueDate && String(t.dueDate).split('T')[0] < todayStr;

            if (kpiFilterTab === 'completed' && !isCompleted) return false;
            if (kpiFilterTab === 'pending' && !isPending) return false;
            if (kpiFilterTab === 'overdue' && !isOverdue) return false;

            if (kpiSearch.trim()) {
              const q = kpiSearch.toLowerCase().trim();
              const matchName = (t.name || '').toLowerCase().includes(q);
              const matchProj = (t.projectCode || '').toLowerCase().includes(q) || (t.projectName || '').toLowerCase().includes(q);
              const matchNotes = (t.notes || '').toLowerCase().includes(q);
              const matchAssigner = (t.assignerName || '').toLowerCase().includes(q);
              if (!matchName && !matchProj && !matchNotes && !matchAssigner) return false;
            }
            return true;
          });

          return (
            <div className="space-y-4 text-slate-800 p-1">
              {/* Info Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm border border-primary/20 shrink-0">
                    {viewingKpiPerson.name?.charAt(0)?.toUpperCase() || 'N'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{viewingKpiPerson.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <span className="font-mono text-primary font-bold">{viewingKpiPerson.code}</span>
                      <span>•</span>
                      <span>{viewingKpiPerson.role}</span>
                      {viewingKpiPerson.phone && (
                        <>
                          <span>•</span>
                          <span>{viewingKpiPerson.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningToPerson(viewingKpiPerson);
                      setQuickTaskName('');
                      setQuickTaskProject(viewingKpiPerson.assignedProjects?.[0]?.code || (projects[0]?.code || 'COMPANY'));
                      setQuickTaskDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
                      setQuickTaskPriority('Medium');
                      setQuickTaskNotes('');
                      setIsQuickAssignModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
                    title="Giao việc nhanh trực tiếp cho nhân sự này"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                    <span>Giao việc nhanh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportIndividualKpi(viewingKpiPerson, kpi)}
                    className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    title="Xuất file Excel báo cáo KPI"
                  >
                    <span className="material-symbols-outlined text-[16px]">file_download</span>
                    <span>Xuất KPI Excel</span>
                  </button>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div 
                  onClick={() => setKpiFilterTab('all')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    kpiFilterTab === 'all' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng số việc</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">assignment</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">{kpi.totalCount}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Tiến độ TB: <span className="font-bold text-primary">{kpi.avgProgress}%</span></div>
                </div>

                <div 
                  onClick={() => setKpiFilterTab('completed')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    kpiFilterTab === 'completed' ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase">Đã hoàn thành</span>
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">task_alt</span>
                  </div>
                  <div className="text-xl font-black text-emerald-600 mt-1">{kpi.completedCount}</div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Tỷ lệ: <span className="font-bold">{kpi.percent}%</span></div>
                </div>

                <div 
                  onClick={() => setKpiFilterTab('pending')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    kpiFilterTab === 'pending' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-600 uppercase">Chưa hoàn thành</span>
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">pending_actions</span>
                  </div>
                  <div className="text-xl font-black text-amber-600 mt-1">{kpi.pendingCount}</div>
                  <div className="text-[10px] text-amber-700 font-medium mt-0.5">Đang thực hiện</div>
                </div>

                <div 
                  onClick={() => setKpiFilterTab('overdue')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    kpiFilterTab === 'overdue' ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-600 uppercase">Quá hạn</span>
                    <span className="material-symbols-outlined text-rose-600 text-[18px]">warning</span>
                  </div>
                  <div className="text-xl font-black text-rose-600 mt-1">{kpi.overdueCount}</div>
                  <div className="text-[10px] text-rose-700 font-medium mt-0.5">Cần đôn đốc xử lý</div>
                </div>
              </div>

              {/* Progress Bar Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">Mức độ hoàn thành công việc (KPI)</span>
                  <span className="text-primary font-extrabold">{kpi.completedCount} / {kpi.totalCount} ({kpi.percent}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${kpi.percent}%` }} 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    title={`Đã hoàn thành: ${kpi.percent}%`}
                  />
                </div>
              </div>

              {/* Search & Tabs Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto custom-scrollbar">
                  {[
                    { id: 'all', label: `Tất cả (${kpi.totalCount})` },
                    { id: 'pending', label: `Chưa xong (${kpi.pendingCount})` },
                    { id: 'completed', label: `Đã xong (${kpi.completedCount})` },
                    { id: 'overdue', label: `Quá hạn (${kpi.overdueCount})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setKpiFilterTab(tab.id as any)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        kpiFilterTab === tab.id
                          ? 'bg-white text-primary shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
                  <input
                    type="text"
                    value={kpiSearch}
                    onChange={(e) => setKpiSearch(e.target.value)}
                    placeholder="Tìm tên CV, dự án, ghi chú..."
                    className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-slate-50 transition-all focus:outline-none"
                  />
                </div>
              </div>

              {/* Task Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-[42vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200 shadow-xs z-10">
                    <tr>
                      <th className="p-2.5 text-center w-10">STT</th>
                      <th className="p-2.5">Dự án</th>
                      <th className="p-2.5 min-w-[180px]">Tên công việc</th>
                      <th className="p-2.5 text-center w-28">Tiến độ</th>
                      <th className="p-2.5 whitespace-nowrap">Trạng thái</th>
                      <th className="p-2.5 whitespace-nowrap">Hạn hoàn thành</th>
                      <th className="p-2.5 whitespace-nowrap">Người giao việc</th>
                      <th className="p-2.5 text-center w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic font-medium">
                          Không có công việc nào theo bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t: any, idx: number) => {
                        const isDone = t.isDone || t.status === 'Hoàn thành' || (t.progress !== undefined && t.progress >= 1);
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOverdue = !isDone && t.dueDate && String(t.dueDate).split('T')[0] < todayStr;
                        const progVal = isDone ? 100 : Math.round((t.progress || 0) * 100);

                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 inline-block max-w-[140px] truncate" title={t.projectName || t.projectCode}>
                                {t.projectCode || t.projectName || '-'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 leading-snug">{t.name}</div>
                              {t.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{t.notes}</div>}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-14 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div style={{ width: `${progVal}%` }} className={`h-full ${isDone ? 'bg-emerald-500' : progVal > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                </div>
                                <span className="font-bold text-[11px] text-slate-700">{progVal}%</span>
                              </div>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                progVal > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {t.status || (isDone ? 'Hoàn thành' : 'Chưa làm')}
                              </span>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              {t.dueDate ? (
                                <span className={`text-[11px] font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                                  {isOverdue && <span className="material-symbols-outlined text-[13px]">warning</span>}
                                  {t.dueDate}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap text-slate-600 text-xs font-medium">
                              {t.assignerName || '-'}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingKpiPerson(null);
                                  const targetProj = projects.find(p => p.code === t.projectCode || p.name === t.projectName);
                                  const pId = targetProj ? targetProj.id : t.projectCode;
                                  window.location.href = `#/projects/${encodeURIComponent(pId)}/tasks?taskId=${encodeURIComponent(t.id)}&highlight=${encodeURIComponent(t.name)}`;
                                }}
                                className="inline-flex items-center justify-center p-1 rounded-lg bg-blue-50 hover:bg-primary hover:text-white text-primary border border-blue-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
                                title="Mở chi tiết trên tab công việc"
                              >
                                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingKpiPerson(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal Giao Việc Nhanh Trực Tiếp */}
      <Modal
        size="md"
        isOpen={isQuickAssignModalOpen}
        onClose={() => setIsQuickAssignModalOpen(false)}
        title={`Giao việc nhanh cho: ${assigningToPerson?.name || ''}`}
      >
        <form onSubmit={handleSaveQuickTask} className="space-y-3 p-1 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Người nhận việc:</span>
              <span className="font-extrabold text-primary text-sm">{assigningToPerson?.name}</span>
              <span className="font-mono text-slate-500 font-semibold">({assigningToPerson?.code})</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Người giao: <span className="font-bold text-slate-700">{user?.name || user?.username || 'Quản trị viên'}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Dự án / Nơi thực hiện <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={quickTaskProject}
              onChange={(e) => setQuickTaskProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-semibold"
            >
              <option value="COMPANY">Nội bộ Công ty / Văn phòng</option>
              {projects.map(p => (
                <option key={p.code || p.id} value={p.code || p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên công việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Kiểm tra bản vẽ thi công tầng 2, Lắp đặt tủ nguồn..."
              value={quickTaskName}
              onChange={(e) => setQuickTaskName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hạn hoàn thành</label>
              <input
                type="date"
                value={quickTaskDueDate}
                onChange={(e) => setQuickTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mức độ ưu tiên</label>
              <CustomSelect
                value={quickTaskPriority}
                onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-xs"
              >
                <option value="Low">Thấp</option>
                <option value="Medium">Bình thường</option>
                <option value="High">Ưu tiên cao / Gấp</option>
              </CustomSelect>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Ghi chú / Yêu cầu chi tiết</label>
            <textarea
              rows={3}
              placeholder="Nhập nội dung mô tả chi tiết, hướng dẫn thực hiện..."
              value={quickTaskNotes}
              onChange={(e) => setQuickTaskNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickAssignModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingQuickTask}
              className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>{savingQuickTask ? 'Đang giao việc...' : 'Xác nhận giao việc'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
