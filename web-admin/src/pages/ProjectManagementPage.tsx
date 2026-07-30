import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { Project, Task } from '../types';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { OcrUploadPanel } from '../components/common/OcrUploadPanel';
import { WebOcrExtractedData } from '../services/webOcrService';

const todayStamp = () => new Date().toISOString().split('T')[0];

const TEXT = {
  unassigned: 'Ch\u01b0a ph\u00e2n c\u00f4ng',
  projectManagement: 'Qu\u1ea3n l\u00fd D\u1ef1 \u00e1n',
  projectSubtitle: 'T\u1ed5ng quan th\u00f4ng tin v\u00e0 ti\u1ebfn \u0111\u1ed9 c\u1ee7a t\u1ea5t c\u1ea3 c\u00e1c d\u1ef1 \u00e1n',
  searchProject: 'T\u00ecm ki\u1ebfm d\u1ef1 \u00e1n...',
  createProject: 'T\u1ea1o d\u1ef1 \u00e1n m\u1edbi',
  active: '\u0110ang tri\u1ec3n khai',
  completed: 'Ho\u00e0n th\u00e0nh',
  onHold: 'T\u1ea1m d\u1eebng',
  noProjectFound: 'Kh\u00f4ng c\u00f3 d\u1ef1 \u00e1n ph\u00f9 h\u1ee3p',
  noProject: 'Ch\u01b0a c\u00f3 d\u1ef1 \u00e1n n\u00e0o',
  deleteProject: 'X\u00f3a d\u1ef1 \u00e1n',
  cancel: 'H\u1ee7y',
  create: 'T\u1ea1o D\u1ef1 \u00e1n',
  importProjectTitle: 'Nh\u1eadp file / Kh\u1edfi t\u1ea1o D\u1ef1 \u00e1n',
  noProjectInFile: 'Kh\u00f4ng t\u00ecm th\u1ea5y d\u00f2ng C\u00f4ng tr\u00ecnh/D\u1ef1 \u00e1n trong file. H\u00e3y ki\u1ec3m tra l\u1ea1i file ho\u1eb7c nh\u1eadp th\u1ee7 c\u00f4ng.',
  importedToForm: '\u0110\u00e3 l\u1ea5y th\u00f4ng tin c\u00f4ng tr\u00ecnh v\u00e0o form d\u1ef1 \u00e1n. Ki\u1ec3m tra v\u00e0 l\u01b0u n\u1ebfu \u0111\u00fang.',
  createFailed: 'Kh\u00f4ng t\u1ea1o \u0111\u01b0\u1ee3c d\u1ef1 \u00e1n, n\u00ean ch\u01b0a import \u0111\u1ea7u m\u1ee5c.',
  created: '\u0110\u00e3 t\u1ea1o d\u1ef1 \u00e1n',
  deleted: '\u0110\u00e3 x\u00f3a d\u1ef1 \u00e1n',
  taskStatus: 'Ch\u01b0a l\u00e0m',
  purchaseStatus: 'Ch\u01b0a \u0111\u1eb7t h\u00e0ng',
  constructionStatus: 'Ch\u01b0a thi c\u00f4ng',
  importNote: 'Import t\u1eeb ph\u1ee5 l\u1ee5c d\u1ef1 \u00e1n',
  materialSyncNote: '\u0110\u1ed3ng b\u1ed9 t\u1eeb ph\u1ee5 l\u1ee5c khi t\u1ea1o d\u1ef1 \u00e1n',
};

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
        managerName: TEXT.unassigned,
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
  const {
    projects,
    tasks,
    engineers,
    addProject,
    addTasksBatch,
    addMaterialPlan,
    addPurchasingPlan,
    deleteProject,
    addEngineer,
    logActivity,
    materialPlans,
    purchasingPlans,
    expenses,
    laborPayrolls,
  } = useRealtimeStore();

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
  const [newManagerTitle, setNewManagerTitle] = useState('Ch\u1ec9 huy tr\u01b0\u1edfng c\u00f4ng tr\u00ecnh');
  const [pendingProjectTasks, setPendingProjectTasks] = useState<NonNullable<WebOcrExtractedData['tableTasks']>>([]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => setToastState({ show: true, message, type });

  const displayProjects = useMemo(() => {
    const merged = [...projects, ...deriveProjectsFromTasks(tasks).filter((derived) => !projects.some((project) => project.code === derived.code))];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((project) => [project.name, project.code, project.location, project.client, project.managerName].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [projects, tasks, searchQuery]);

  const enhancedProjects = useMemo(() => {
    return displayProjects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
      const totalTasks = projectTasks.length || project.totalTasks;
      const completedTasks = projectTasks.filter((task) => task.isDone || task.progress >= 1).length || project.completedTasks;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progressPercent;
      
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
      const missingDocsCount = projMaterialPlans.filter((plan) => !plan.docCo).length + projMaterialPlans.filter((plan) => !plan.docCq).length;

      return {
        ...project,
        totalTasks,
        completedTasks,
        progress,
        totalMaterials,
        completedMaterials,
        materialProgress,
        totalCost,
        missingDocsCount
      };
    });
  }, [displayProjects, tasks, materialPlans, purchasingPlans, expenses, laborPayrolls]);
  
  const openProjectTasks = (project: Project) => navigate(`/tasks?project=${encodeURIComponent(project.code)}`);

  const applyImportedProject = (data: WebOcrExtractedData) => {
    const projectName = data.projectName || getImportedFieldValue(data, ['cong trinh', 'ten cong trinh', 'du an', 'goi thau']);
    if (!projectName) {
      triggerToast(TEXT.noProjectInFile, 'warning');
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
    triggerToast(data.tableTasks?.length ? `${TEXT.importedToForm} (${data.tableTasks.length} \u0111\u1ea7u m\u1ee5c)` : TEXT.importedToForm, 'info');
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProjName.trim()) return;

    const selectedManager = engineers.find((eng) => eng.id === newProjManagerId);
    const createdManager = newProjManagerId === '__NEW__' && newManagerName.trim()
      ? addEngineer({ name: newManagerName.trim(), title: newManagerTitle.trim() || 'Ch\u1ec9 huy tr\u01b0\u1edfng c\u00f4ng tr\u00ecnh', avatar: '', phone: '', email: '' })
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
      managerName: finalManager?.name || TEXT.unassigned,
      members: finalManager?.id ? [finalManager.id] : [],
      startDate: todayStamp(),
    };

    const createdProject = await addProject(newProject);
    if (!createdProject) {
      triggerToast(TEXT.createFailed, 'warning');
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
          status: TEXT.taskStatus as Task['status'],
          purchaseStatus: item.isSectionHeader ? '' : TEXT.purchaseStatus,
          constrStatus: item.isSectionHeader ? '' : TEXT.constructionStatus,
          issue: '',
          issueStatus: '',
          isDone: false,
          isSectionHeader: item.isSectionHeader,
          sectionName: item.sectionName || '',
          notes: [item.notes, TEXT.importNote].filter(Boolean).join(' | '),
          assignedEngineerId: engineers[0]?.id || '',
          assignedEngineerName: engineers[0]?.name || '',
        }));
      if (importedTasks.length > 0) await addTasksBatch(importedTasks);

      const existingMaterialPlanKeys = new Set(
        materialPlans
          .filter((plan) => plan.projectCode === code)
          .map((plan) => `${String(plan.stt || '').trim()}|${String(plan.jobContent || '').trim().toLowerCase()}`)
      );

      for (const [index, item] of pendingProjectTasks.filter((item) => item.name?.trim()).entries()) {
        const key = `${String(item.stt || '').trim()}|${String(item.name || '').trim().toLowerCase()}`;
        if (existingMaterialPlanKeys.has(key)) continue;
        existingMaterialPlanKeys.add(key);
        const supplyScope = item.supplyScope === 'owner' ? 'owner' : item.supplyScope === 'contractor' ? 'contractor' : 'unknown';
        const supplyLabel = supplyScope === 'owner' ? 'Ch? ??u t? cung c?p' : supplyScope === 'contractor' ? 'Nh? th?u cung c?p' : '';
        await addMaterialPlan({
          projectCode: code,
          stt: item.stt || String(index + 1),
          jobContent: item.name,
          unit: '',
          contractVolume: 0,
          techSpecModel: '',
          techSpecOrigin: '',
          progressStatus: '',
          orderedVolume: 0,
          orderedStatus: '',
          expectedDate: '',
          issueContent: '',
          issueStatus: '',
          docCo: false,
          docCq: false,
          docFireInspection: false,
          dispatchToSite: false,
          supplyScope,
          notes: [item.isSectionHeader ? '[section]' : '', supplyScope !== 'unknown' ? `[${supplyScope}]` : '', item.notes, supplyLabel, TEXT.materialSyncNote].filter(Boolean).join(' | '),
        });
      }

      const existingPurchasingKeys = new Set(
        purchasingPlans
          .filter((plan) => plan.projectCode === code)
          .map((plan) => `${String(plan.stt || '').trim()}|${String(plan.content || '').trim().toLowerCase()}`)
      );

      for (const [index, item] of pendingProjectTasks.filter((item) => !item.isSectionHeader && item.name?.trim() && item.supplyScope === 'contractor').entries()) {
        const key = `${String(item.stt || '').trim()}|${String(item.name || '').trim().toLowerCase()}`;
        if (existingPurchasingKeys.has(key)) continue;
        existingPurchasingKeys.add(key);
        const totalBeforeVat = item.totalBeforeVat || ((item.volume || 0) * (item.unitPrice || 0));
        const computedVatAmount = item.vatAmount || (item.vatRate ? totalBeforeVat * item.vatRate / 100 : 0);
        const totalAmount = item.totalAmount || totalBeforeVat + computedVatAmount;
        await addPurchasingPlan({
          projectCode: code,
          stt: item.stt || String(index + 1),
          content: item.name,
          unit: item.unit || '',
          volumeContract: item.volume || 0,
          volumeOrder: 0,
          unitPrice: item.unitPrice || 0,
          vatRate: item.vatRate || 0,
          vatAmount: computedVatAmount,
          totalAmount,
          prepayPercent: 0,
          prepayAmount: 0,
          remainingAmount: totalAmount,
          orderStatus: TEXT.purchaseStatus,
          contractStatus: '\u0110\u00e3 c\u00f3 ph\u1ee5 l\u1ee5c',
          invoiceStatus: 'Ch\u01b0a xu\u1ea5t',
          notes: [item.notes, '\u0110\u1ed3ng b\u1ed9 t\u1eeb ph\u1ee5 l\u1ee5c khi t\u1ea1o d\u1ef1 \u00e1n'].filter(Boolean).join(' | '),
        });
      }
    }

    logActivity(`T\u1ea1o d\u1ef1 \u00e1n m\u1edbi: ${newProject.name}`, newProject.name);
    triggerToast(`${TEXT.created} ${newProject.name}${pendingProjectTasks.length ? ' v\u00e0 import \u0111\u1ea7u m\u1ee5c' : ''}`, 'success');
    setIsNewProjectModalOpen(false);
    setNewProjName('');
    setNewProjCode('');
    setNewProjLocation('');
    setNewProjClient('');
    setNewProjContractValue('');
    setNewProjManagerId(engineers[0]?.id || '');
    setNewManagerName('');
    setNewManagerTitle('Ch\u1ec9 huy tr\u01b0\u1edfng c\u00f4ng tr\u00ecnh');
    setPendingProjectTasks([]);
  };

  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    deleteProject(projectToDelete.id);
    setProjectToDelete(null);
    triggerToast(TEXT.deleted, 'success');
  };

  const statusLabel: Record<Project['status'], string> = { active: TEXT.active, completed: TEXT.completed, on_hold: TEXT.onHold };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50 relative">
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />

      <section className="border-b border-slate-200 bg-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">domain</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">{TEXT.projectManagement}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{TEXT.projectSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100 whitespace-nowrap">
            {displayProjects.length} dự án
          </span>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={TEXT.searchProject}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-slate-50/50"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 shadow-xs whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {TEXT.createProject}
          </button>
        </div>
      </section>

      <div className="p-6 space-y-6">
        {enhancedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
            <h3 className="mt-3 font-bold text-slate-700">{searchQuery ? TEXT.noProjectFound : TEXT.noProject}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enhancedProjects.map((project) => (
              <article key={project.id} onClick={() => openProjectTasks(project)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') openProjectTasks(project); }} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold text-slate-900 truncate">{project.name}</h2><p className="text-xs text-slate-500 mt-1">Ma: {project.code}</p></div><button type="button" onClick={(event) => { event.stopPropagation(); setProjectToDelete(project); }} className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center" title={TEXT.deleteProject} aria-label={TEXT.deleteProject}><span className="material-symbols-outlined text-[18px]">delete</span></button></div>
                <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Client</span><span className="font-semibold text-slate-700 text-right">{project.client || '-'}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Location</span><span className="font-semibold text-slate-700 text-right">{project.location || '-'}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">PM</span><span className="font-semibold text-slate-700 text-right">{project.managerName || '-'}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Status</span><span className="font-semibold text-slate-700 text-right">{statusLabel[project.status]}</span></div></div>
                <div className="mt-4"><div className="flex items-center justify-between text-xs font-bold text-slate-600"><span>Progress</span><span>{project.progress}%</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-primary" style={{ width: project.progress + '%' }} /></div><div className="flex justify-between text-xs text-slate-500 mt-2"><span>Done: {project.completedTasks}</span><span>Remain: {Math.max(0, project.totalTasks - project.completedTasks)}</span></div></div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(projectToDelete)} onClose={() => setProjectToDelete(null)} title={TEXT.deleteProject}>
        <div className="space-y-4">
          <p>Bạn chắc chắn muốn xóa dự án <strong>{projectToDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProjectToDelete(null)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">{TEXT.cancel}</button>
            <button type="button" onClick={handleDeleteProject} className="px-5 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">{TEXT.deleteProject}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title={TEXT.importProjectTitle}>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
            <OcrUploadPanel onExtracted={applyImportedProject} />
            <p className="mt-2 text-xs text-slate-500">Có thể nhập file để tự điền thông tin dự án và đầu mục công việc, hoặc nhập thủ công bên dưới.</p>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">Tên Dự án / Công trình mới *</label><input required value={newProjName} onChange={(event) => setNewProjName(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block font-bold text-slate-700 mb-1">Mã Dự án</label><input value={newProjCode} onChange={(event) => setNewProjCode(event.target.value)} placeholder="Tự sinh nếu bỏ trống" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div>
            <div><label className="block font-bold text-slate-700 mb-1">Địa điểm công trình</label><input value={newProjLocation} onChange={(event) => setNewProjLocation(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block font-bold text-slate-700 mb-1">Chủ đầu tư</label><input value={newProjClient} onChange={(event) => setNewProjClient(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div>
            <div><label className="block font-bold text-slate-700 mb-1">Giá trị hợp đồng</label><input value={newProjContractValue} onChange={(event) => setNewProjContractValue(event.target.value)} inputMode="numeric" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">Chỉ huy trưởng</label><select value={newProjManagerId} onChange={(event) => setNewProjManagerId(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:outline-none"><option value="">-- Chọn Chỉ huy trưởng --</option>{engineers.map((eng) => <option key={eng.id} value={eng.id}>{eng.name}</option>)}<option value="__NEW__">+ Thêm người mới...</option></select></div>
          {newProjManagerId === '__NEW__' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-blue-100 bg-blue-50 p-3"><div><label className="block font-bold text-slate-700 mb-1">Tên người mới *</label><input required value={newManagerName} onChange={(event) => setNewManagerName(event.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div><div><label className="block font-bold text-slate-700 mb-1">Chức danh</label><input value={newManagerTitle} onChange={(event) => setNewManagerTitle(event.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" /></div></div>}
          {pendingProjectTasks.length > 0 && <p className="text-sm text-emerald-700 font-semibold">Khi lưu dự án, hệ thống sẽ đưa {pendingProjectTasks.length} dòng vào tab Công việc và KH Vật tư.</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">{TEXT.cancel}</button><button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90">{TEXT.create}</button></div>
        </form>
      </Modal>
    </div>
  );
};





