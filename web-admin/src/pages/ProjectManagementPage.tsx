import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { Project, Task } from '../types';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { OcrUploadPanel } from '../components/common/OcrUploadPanel';
import { WebOcrExtractedData } from '../services/webOcrService';

const todayStamp = () => new Date().toISOString().split('T')[0];

const slugProjectCode = (value: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return normalized || `PRJ_${Math.floor(Math.random() * 1000)}`;
};

const normalizeLabel = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0111\u0110]/g, 'd').toLowerCase();

const getImportedFieldValue = (data: WebOcrExtractedData, labels: string[]) => {
  const normalizedLabels = labels.map(normalizeLabel);
  return data.fields.find((field) => normalizedLabels.some((label) => normalizeLabel(field.label).includes(label)))?.value || '';
};

const deriveProjectsFromTasks = (tasks: Task[]): Project[] => {
  const projectMap = new Map<string, Project>();
  tasks.forEach((task) => {
    if (!task.projectCode) return;
    const current = projectMap.get(task.projectCode);
    const isDone = task.isDone || task.progress >= 1;
    if (!current) {
      projectMap.set(task.projectCode, {
        id: 'derived-' + task.projectCode,
        code: task.projectCode,
        name: task.projectName || task.projectCode,
        location: '',
        progressPercent: 0,
        status: 'active',
        totalTasks: task.isSectionHeader ? 0 : 1,
        completedTasks: !task.isSectionHeader && isDone ? 1 : 0,
        issueTasksCount: task.issue ? 1 : 0,
        managerName: 'Chưa phân công',
        activeTeams: 0,
      });
      return;
    }
    if (task.isSectionHeader) return;
    current.totalTasks += 1;
    current.completedTasks += isDone ? 1 : 0;
    current.issueTasksCount += task.issue ? 1 : 0;
  });
  return Array.from(projectMap.values()).map((project) => ({
    ...project,
    progressPercent: project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0,
  }));
};

export const ProjectManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, tasks, engineers, addProject, addTasksBatch, deleteProject, addEngineer, logActivity } = useRealtimeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjContractValue, setNewProjContractValue] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState(engineers[0]?.id || '');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerTitle, setNewManagerTitle] = useState('Chỉ huy trưởng công trình');
  const [pendingProjectTasks, setPendingProjectTasks] = useState<NonNullable<WebOcrExtractedData['tableTasks']>>([]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => setToastState({ show: true, message, type });

  const displayProjects = useMemo(() => {
    const merged = [...projects, ...deriveProjectsFromTasks(tasks).filter((derived) => !projects.some((project) => project.code === derived.code))];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((project) => [project.name, project.code, project.location, project.client, project.managerName].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [projects, tasks, searchQuery]);

  const openProjectTasks = (project: Project) => navigate(`/tasks?project=${encodeURIComponent(project.code)}`);

  const applyImportedProject = (data: WebOcrExtractedData) => {
    const projectName = data.projectName || getImportedFieldValue(data, ['cong trinh', 'ten cong trinh', 'du an', 'goi thau']);
    if (!projectName) {
      triggerToast('Không tìm thấy dòng Công trình/Dự án trong file. Hãy kiểm tra lại file hoặc nhập thủ công.', 'warning');
      return;
    }
    const location = data.location || getImportedFieldValue(data, ['dia diem cong trinh', 'dia diem xay dung', 'dia diem', 'vi tri', 'dia chi']);
    const client = getImportedFieldValue(data, ['chu dau tu', 'khach hang', 'ben giao thau']);
    const contractValue = getImportedFieldValue(data, ['gia tri hop dong', 'gia tri phu luc', 'tong gia tri']);
    setNewProjName(projectName);
    setNewProjCode(slugProjectCode(projectName));
    setNewProjLocation(location);
    setNewProjClient(client);
    setNewProjContractValue(contractValue.replace(/[^0-9]/g, ''));
    setPendingProjectTasks(data.tableTasks || []);
    setIsNewProjectModalOpen(true);
    triggerToast(`Đã lấy thông tin công trình vào form dự án${data.tableTasks?.length ? ` và ${data.tableTasks.length} đầu mục công việc` : ''}. Kiểm tra và lưu nếu đúng.`, 'info');
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProjName.trim()) return;
    const selectedManager = engineers.find((eng) => eng.id === newProjManagerId);
    const createdManager = newProjManagerId === '__NEW__' && newManagerName.trim()
      ? addEngineer({ name: newManagerName.trim(), title: newManagerTitle.trim() || 'Chỉ huy trưởng công trình', avatar: '', phone: '', email: '' })
      : null;
    const finalManager = createdManager || selectedManager;
    const code = newProjCode.trim() ? newProjCode.trim().toUpperCase() : slugProjectCode(newProjName);
    const newProject: Omit<Project, 'id'> = {
      code,
      name: newProjName.trim(),
      client: newProjClient.trim() || undefined,
      location: newProjLocation.trim(),
      contractValue: Number(newProjContractValue) || undefined,
      progressPercent: 0,
      status: 'active',
      activeTeams: 0,
      totalTasks: 0,
      completedTasks: 0,
      issueTasksCount: 0,
      managerName: finalManager?.name || 'Chưa phân công',
      members: finalManager?.id ? [finalManager.id] : [],
      startDate: todayStamp(),
    };
    const createdProject = await addProject(newProject);
    if (!createdProject) {
      triggerToast('Không tạo được dự án, nên chưa import đầu mục công việc.', 'warning');
      return;
    }

    if (pendingProjectTasks.length > 0) {
      const existingTaskKeys = new Set(tasks.filter((task) => task.projectCode === code).map((task) => `${task.stt.trim()}|${task.name.trim().toLowerCase()}`));
      const importedTasks: Omit<Task, 'id'>[] = pendingProjectTasks
        .filter((item) => {
          const key = `${item.stt.trim()}|${item.name.trim().toLowerCase()}`;
          if (existingTaskKeys.has(key)) return false;
          existingTaskKeys.add(key);
          return true;
        })
        .map((item, index) => ({
          stt: item.isSectionHeader ? (item.stt || '') : (item.stt || String(index + 1)),
          code: `TSK-PL-${Date.now()}-${index}`,
          name: item.name,
          projectCode: code,
          projectName: newProject.name,
          volume: item.volume || 0,
          unit: item.unit || '',
          progress: 0,
          status: 'Chưa làm',
          purchaseStatus: item.isSectionHeader ? '' : 'Chưa đặt hàng',
          constrStatus: item.isSectionHeader ? '' : 'Chưa thi công',
          issue: '',
          issueStatus: '',
          isDone: false,
          isSectionHeader: item.isSectionHeader,
          sectionName: item.sectionName || '',
          notes: [item.notes, 'Import từ phụ lục dự án'].filter(Boolean).join(' | '),
          assignedEngineerId: engineers[0]?.id || '',
          assignedEngineerName: engineers[0]?.name || '',
        }));
      if (importedTasks.length > 0) await addTasksBatch(importedTasks);
    }

    logActivity(`Tạo dự án mới: ${newProject.name}`, newProject.name);
    triggerToast(`Đã tạo dự án ${newProject.name}${pendingProjectTasks.length ? ' và import đầu mục công việc' : ''}`, 'success');
    setIsNewProjectModalOpen(false);
    setNewProjName('');
    setNewProjCode('');
    setNewProjLocation('');
    setNewProjClient('');
    setNewProjContractValue('');
    setNewProjManagerId(engineers[0]?.id || '');
    setNewManagerName('');
    setNewManagerTitle('Chỉ huy trưởng công trình');
    setPendingProjectTasks([]);
  };

  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    deleteProject(projectToDelete.id);
    setProjectToDelete(null);
    triggerToast('Đã xóa dự án', 'success');
  };

  const statusLabel: Record<Project['status'], string> = { active: 'Đang triển khai', completed: 'Hoàn thành', on_hold: 'Tạm dừng' };

  return (
    <div className="p-6 space-y-6">
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-800">Quản lý Dự án</h1><p className="text-sm text-slate-500 mt-1">Tổng quan thông tin và tiến độ của tất cả các dự án</p></div>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm dự án..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" /></div>
          <button type="button" onClick={() => setIsNewProjectModalOpen(true)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">add</span> T&#7841;o d&#7921; &#225;n m&#7899;i</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayProjects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
          const totalTasks = projectTasks.length || project.totalTasks;
          const completedTasks = projectTasks.filter((task) => task.isDone || task.progress >= 1).length || project.completedTasks;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progressPercent;
          return (
            <article key={project.id} onClick={() => openProjectTasks(project)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') openProjectTasks(project); }} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold text-slate-900 truncate">{project.name}</h2><p className="text-xs text-slate-500 mt-1">Mã: {project.code}</p></div><button type="button" onClick={(event) => { event.stopPropagation(); setProjectToDelete(project); }} className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center" title="Xóa dự án" aria-label={`Xóa dự án ${project.name}`}><span className="material-symbols-outlined text-[18px]">delete</span></button></div>
              <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Chủ đầu tư</span><span className="font-semibold text-slate-700 text-right">{project.client || 'Chưa cập nhật'}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Địa điểm</span><span className="font-semibold text-slate-700 text-right">{project.location || 'Chưa cập nhật'}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">PM phụ trách</span><span className="font-semibold text-slate-700 text-right">{project.managerName || 'Chưa phân công'}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Trạng thái</span><span className="font-semibold text-slate-700 text-right">{statusLabel[project.status]}</span></div></div>
              <div className="mt-4"><div className="flex items-center justify-between text-xs font-bold text-slate-600"><span>Tiến độ thi công</span><span>{progress}%</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div><div className="flex justify-between text-xs text-slate-500 mt-2"><span>Đã xong: {completedTasks}</span><span>Còn lại: {Math.max(0, totalTasks - completedTasks)} đầu việc</span></div></div>
            </article>
          );
        })}
      </div>
      {displayProjects.length === 0 && <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl"><span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span><h3 className="mt-3 font-bold text-slate-700">{searchQuery ? 'Không có dự án phù hợp' : 'Chưa có dự án nào'}</h3><p className="text-sm text-slate-500 mt-1">{searchQuery ? 'Xóa từ khóa tìm kiếm để xem lại toàn bộ dự án.' : 'Tạo dự án mới hoặc nhập file công trình để hiển thị tại đây.'}</p></div>}
      <Modal isOpen={Boolean(projectToDelete)} onClose={() => setProjectToDelete(null)} title="Xóa dự án"><div className="space-y-4"><p>Bạn chắc chắn muốn xóa dự án <strong>{projectToDelete?.name}</strong>?</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setProjectToDelete(null)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="button" onClick={handleDeleteProject} className="px-5 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Xóa dự án</button></div></div></Modal>
      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Nhập file / Khởi tạo Dự án"><form onSubmit={handleCreateProject} className="space-y-4"><div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"><OcrUploadPanel onExtracted={applyImportedProject} /><p className="mt-2 text-xs text-slate-500">Có thể nhập file để tự điền thông tin dự án và đầu mục công việc, hoặc bỏ qua phần này để nhập thủ công bên dưới.</p></div><div><label className="block font-bold text-slate-700 mb-1">Tên Dự án / Công trình mới *</label><input required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="VD: Trạm biến áp 110kV Phước Lý" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block font-bold text-slate-700 mb-1">Mã Dự án</label><input value={newProjCode} onChange={(e) => setNewProjCode(e.target.value)} placeholder="Tự sinh nếu bỏ trống" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div><div><label className="block font-bold text-slate-700 mb-1">Địa điểm công trình</label><input value={newProjLocation} onChange={(e) => setNewProjLocation(e.target.value)} placeholder="VD: Cần Giuộc, Long An" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block font-bold text-slate-700 mb-1">Chủ đầu tư</label><input value={newProjClient} onChange={(e) => setNewProjClient(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div><div><label className="block font-bold text-slate-700 mb-1">Giá trị hợp đồng</label><input value={newProjContractValue} onChange={(e) => setNewProjContractValue(e.target.value)} inputMode="numeric" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div></div><div><label className="block font-bold text-slate-700 mb-1">Chỉ huy trưởng</label><select value={newProjManagerId} onChange={(e) => setNewProjManagerId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:outline-none"><option value="">-- Chọn Chỉ huy trưởng --</option>{engineers.map((eng) => <option key={eng.id} value={eng.id}>{eng.name}</option>)}<option value="__NEW__">+ Thêm người mới...</option></select></div>{newProjManagerId === '__NEW__' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-blue-100 bg-blue-50 p-3"><div><label className="block font-bold text-slate-700 mb-1">Tên người mới *</label><input required value={newManagerName} onChange={(e) => setNewManagerName(e.target.value)} placeholder="VD: Kỹ sư Minh" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div><div><label className="block font-bold text-slate-700 mb-1">Chức danh</label><input value={newManagerTitle} onChange={(e) => setNewManagerTitle(e.target.value)} placeholder="VD: Chỉ huy trưởng công trình" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div></div>}{pendingProjectTasks.length > 0 && <p className="text-sm text-emerald-700 font-semibold">Khi lưu dự án, hệ thống sẽ đưa {pendingProjectTasks.length} dòng trong bảng vào tab Công việc.</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90">Tạo Dự án</button></div></form></Modal>
    </div>
  );
};
