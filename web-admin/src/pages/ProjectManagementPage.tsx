import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { Project, Task } from '../types';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { OcrUploadPanel } from '../components/common/OcrUploadPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { WebOcrExtractedData } from '../services/webOcrService';

const todayStamp = () => new Date().toISOString().split('T')[0];

const TEXT = {
  unassigned: 'Chưa phân công',
  projectManagement: 'Tất cả dự án',
  projectSubtitle: 'Tổng quan thông tin và tiến độ của tất cả các dự án',
  searchProject: 'Tìm kiếm dự án...',
  createProject: 'Tạo dự án mới',
  active: '\u0110ang tri\u1ec3n khai',
  completed: 'Ho\u00e0n th\u00e0nh',
  onHold: 'T\u1ea1m d\u1eebng',
  noProjectFound: 'Kh\u00f4ng c\u00f3 d\u1ef1 \u00e1n ph\u00f9 h\u1ee3p',
  noProject: 'Ch\u01b0a c\u00f3 d\u1ef1 \u00e1n n\u00e0o',
  deleteProject: 'Xóa dự án',
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
  const progressMap = new Map<string, number>();

  tasks.forEach((task) => {
    if (!task.projectCode) return;
    const current = projectMap.get(task.projectCode);
    const isDone = task.isDone || task.progress >= 1;
    const taskProg = isDone ? 1 : (task.progress || 0);

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
      progressMap.set(task.projectCode, task.isSectionHeader ? 0 : taskProg);
      return;
    }
    if (task.isSectionHeader) return;
    current.totalTasks += 1;
    current.completedTasks += isDone ? 1 : 0;
    current.issueTasksCount += task.issue ? 1 : 0;
    progressMap.set(task.projectCode, (progressMap.get(task.projectCode) || 0) + taskProg);
  });
  return Array.from(projectMap.values()).map((project) => ({
    ...project,
    progressPercent: project.totalTasks > 0 ? Math.round(((progressMap.get(project.code) || 0) / project.totalTasks) * 100) : 0,
  }));
};

export const ProjectManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
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
    updateEngineer,
    logActivity,
    materialPlans,
    purchasingPlans,
    expenses,
    laborPayrolls,
    updateProject,
  } = useRealtimeStore();

  const [searchQuery, setSearchQuery] = useState('');

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjContractValue, setNewProjContractValue] = useState('');
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);
  const [pendingProjectTasks, setPendingProjectTasks] = useState<NonNullable<WebOcrExtractedData['tableTasks']>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const toggleEngineerId = (id: string) => {
    setSelectedEngineerIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastState(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const resolveProjectMemberNames = (project: Project) => {
    const codeMatch = (project.code || '').trim();
    const nameMatch = (project.name || '').trim();

    const matches = (mp: { code?: string; name?: string }) => {
      const mpCode = (mp.code || '').trim();
      const mpName = (mp.name || '').trim();
      if (codeMatch && mpCode && codeMatch === mpCode) return true;
      if (!codeMatch && nameMatch && mpName && nameMatch === mpName) return true;
      return false;
    };

    const memberFromManaged = engineers
      .filter((eng) => eng.managedProjects?.some(matches))
      .map((eng) => eng.name);

    const memberFromAssigned = engineers
      .filter((eng) => eng.memberProjects?.some(matches))
      .map((eng) => eng.name);

    const memberFromProjectCodes = engineers
      .filter((eng) => Array.isArray(eng.projectCodes) && eng.projectCodes.some(c => codeMatch && (c || '').trim() === codeMatch))
      .map((eng) => eng.name);

    const combined = Array.from(new Set([...memberFromManaged, ...memberFromAssigned, ...memberFromProjectCodes]));
    if (combined.length > 0) return combined;
    if (project.managerName && project.managerName !== TEXT.unassigned) return [project.managerName];
    return [];
  };

  const displayProjects = useMemo(() => {
    const merged = [...projects, ...deriveProjectsFromTasks(tasks).filter((derived) => !projects.some((project) => project.code === derived.code))];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((project) => {
      const memberNames = resolveProjectMemberNames(project).join(' ');
      return [project.name, project.code, project.location, project.client, project.managerName, memberNames]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [projects, tasks, searchQuery, engineers]);

  const enhancedProjects = useMemo(() => {
    return displayProjects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
      const totalTasks = projectTasks.length || project.totalTasks;
      const completedTasks = projectTasks.filter((task) => task.isDone || task.progress >= 1).length || project.completedTasks;
      const memberNames = resolveProjectMemberNames(project);

      let progress = project.progressPercent;
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
      const missingDocsCount = projMaterialPlans.filter((plan) => !plan.docCo).length + projMaterialPlans.filter((plan) => !plan.docCq).length;

      return {
        ...project,
        status: progress >= 100 ? 'completed' : project.status,
        totalTasks,
        completedTasks,
        progress,
        memberNames,
        totalMaterials,
        completedMaterials,
        materialProgress,
        totalCost,
        missingDocsCount
      };
    });
  }, [displayProjects, tasks, materialPlans, purchasingPlans, expenses, laborPayrolls]);

  const openProjectTasks = (project: Project) => navigate(`/projects/${project.id}`);

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

    setLoading(true);
    setLoadingMessage('Đang tạo dự án...');
    try {
    const code = newProjCode.trim() ? newProjCode.trim().toUpperCase() : slugProjectCode(newProjName);

    const selectedEngineers = engineers.filter(eng => selectedEngineerIds.includes(eng.id));
    const managerName = selectedEngineers.length > 0 ? selectedEngineers.map(e => e.name).join(', ') : TEXT.unassigned;

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
      managerId: selectedEngineerIds[0],
      managerName: managerName,
      members: selectedEngineerIds,
      memberIds: selectedEngineerIds,
      startDate: todayStamp(),
    };
    const createdProject = await addProject(newProject);
    if (!createdProject) {
      triggerToast(TEXT.createFailed, 'warning');
      return;
    }

    // Cập nhật projectCodes cho các kỹ sư được gán vào dự án
    if (selectedEngineerIds.length > 0) {
      for (const engId of selectedEngineerIds) {
        const eng = engineers.find(e => e.id === engId);
        if (eng) {
          const currentCodes = Array.isArray(eng.projectCodes) ? eng.projectCodes : [];
          if (!currentCodes.includes(code)) {
            await updateEngineer(engId, {
              name: eng.name,
              projectCodes: [...currentCodes, code]
            });
          }
        }
      }
    }

    if (pendingProjectTasks.length > 0) {
      let orderCounter = 0;
      let currentMainSectionId: string | undefined = undefined;
      let currentSubSectionId: string | undefined = undefined;
      const sttIdMap = new Map<string, string>();




      const tasksWithIds = pendingProjectTasks.map((item, index) => {
        const taskId = crypto.randomUUID();
        return {
          ...item,
          id: taskId,
        };
      });

      tasksWithIds.forEach(item => {
        if (item.stt) sttIdMap.set(item.stt.trim(), item.id);
      });

      const existingTaskKeys = new Set(tasks.filter((task) => task.projectCode === code).map((task) => `${task.parentId || 'root'}|${task.stt.trim()}|${task.name.trim().toLowerCase()}`));

      const importedTasks: Task[] = [];

      tasksWithIds.forEach((item, index) => {

        const sttVal = (item.stt || '').trim();
        if (!/[a-zA-ZÀ-ỹ]/.test(item.name || '')) return;
        const isSection = item.isSectionHeader;

        let parentId = undefined;
        if (isSection) {
          currentMainSectionId = item.id;
          currentSubSectionId = undefined;
        } else {
          let isSubFolder = false;
          const nextItem = pendingProjectTasks[index + 1];
          if (nextItem) {
            const nextStt = String(nextItem.stt || '').trim();
            if (nextStt && nextStt.startsWith(sttVal + '.')) {
              isSubFolder = true;
            }
          }
          if (isSubFolder) {
            parentId = currentMainSectionId;
            currentSubSectionId = item.id;
          } else {
            let foundDottedParent = false;
            if (sttVal.includes('.')) {
              const parts = sttVal.split('.');
              parts.pop();
              const parentStt = parts.join('.');
              if (sttIdMap.has(parentStt)) {
                parentId = sttIdMap.get(parentStt);
                foundDottedParent = true;
              }
            }
            if (!foundDottedParent) {
              parentId = currentSubSectionId || currentMainSectionId;
            }
          }
        }

        const key = `${parentId || 'root'}|${item.stt.trim()}|${item.name.trim().toLowerCase()}`;
        if (existingTaskKeys.has(key)) return;
        existingTaskKeys.add(key);

        importedTasks.push({
          id: item.id,
          parentId: parentId,
          stt: isSection ? (item.stt || '') : (item.stt || String(index + 1)),
          code: item.id,
          name: item.name,
          projectCode: code,
          projectName: newProject.name,
          volume: item.volume || 0,
          unit: item.unit || '',
          progress: 0,
          status: TEXT.taskStatus as Task['status'],
          purchaseStatus: isSection ? '' : TEXT.purchaseStatus,
          constrStatus: isSection ? '' : TEXT.constructionStatus,
          issue: '',
          issueStatus: '',
          isDone: false,
          isSectionHeader: isSection,
          sectionName: isSection ? item.name : (importedTasks.slice().reverse().find((t) => t.isSectionHeader)?.name || ''),
          notes: [item.notes, TEXT.importNote].filter(Boolean).join(' | '),
          assignedEngineerId: engineers[0]?.id || '',
          assignedEngineerName: engineers[0]?.name || '',
        });
      });

      if (importedTasks.length > 0) await addTasksBatch(importedTasks);

      const existingMaterialPlanKeys = new Set(
        materialPlans
          .filter((plan) => plan.projectCode === code)
          .map((plan) => `${String(plan.stt || '').trim()}|${String(plan.jobContent || '').trim().toLowerCase()}`)
      );

      for (const [index, item] of tasksWithIds.filter((item) => item.name?.trim()).entries()) {
        const key = `${String(item.stt || '').trim()}|${String(item.name || '').trim().toLowerCase()}`;
        if (existingMaterialPlanKeys.has(key)) continue;
        existingMaterialPlanKeys.add(key);

        const matchingTask = importedTasks.find(t => t.id === item.id);
        const rowId = item.id;
        const parentId = matchingTask ? matchingTask.parentId : undefined;
        const isSection = matchingTask ? matchingTask.isSectionHeader : false;

        const supplyScope = item.supplyScope === 'owner' ? 'owner' : item.supplyScope === 'contractor' ? 'contractor' : 'unknown';
        const supplyLabel = supplyScope === 'owner' ? 'Chủ đầu tư cung cấp' : supplyScope === 'contractor' ? 'Nhà thầu cung cấp' : '';
        const orderTag = `[order:${String(++orderCounter).padStart(5, '0')}]`;
        await addMaterialPlan({
          id: rowId,
          parentId: parentId,
          projectCode: code,
          stt: item.stt || String(index + 1),
          jobContent: item.name,
          unit: item.unit || '',
          contractVolume: item.volume || 0,
          techSpecModel: item.techSpecModel || '',
          techSpecOrigin: item.techSpecOrigin || '',
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
          notes: [orderTag, isSection ? '[section]' : '', supplyScope !== 'unknown' ? `[${supplyScope}]` : '', item.notes, supplyLabel, TEXT.materialSyncNote].filter(Boolean).join(' | '),
        });
      }

      const existingPurchasingKeys = new Set(
        purchasingPlans
          .filter((plan) => plan.projectCode === code)
          .map((plan) => `${String(plan.stt || '').trim()}|${String(plan.content || '').trim().toLowerCase()}`)
      );
      for (const [index, item] of tasksWithIds.filter((item) => item.name?.trim()).entries()) {
        const key = `${String(item.stt || '').trim()}|${String(item.name || '').trim().toLowerCase()}`;
        if (existingPurchasingKeys.has(key)) continue;
        existingPurchasingKeys.add(key);

        const matchingTask = importedTasks.find(t => t.id === item.id);
        const rowId = item.id;
        const parentId = matchingTask ? matchingTask.parentId : undefined;
        const isSection = matchingTask ? matchingTask.isSectionHeader : false;

        const orderTag = `[order:${String(++orderCounter).padStart(5, '0')}]`;
        await addPurchasingPlan({
          id: rowId,
          parentId: parentId,
          projectCode: code,
          stt: item.stt || String(index + 1),
          content: item.name,
          unit: item.unit || '',
          volumeContract: item.volume || 0,
          volumeOrder: item.volume || 0,
          unitPrice: item.unitPrice || 0,
          vatRate: item.vatRate !== undefined ? item.vatRate : 10,
          vatAmount: item.vatAmount || 0,
          totalAmount: item.totalAmount || 0,
          prepayPercent: 0,
          prepayAmount: 0,
          remainingAmount: item.totalAmount || 0,
          orderStatus: TEXT.purchaseStatus,
          contractStatus: 'Đã có phụ lục',
          invoiceStatus: 'Chưa xuất',
          notes: [orderTag, isSection ? '[section]' : '', item.notes, 'Đồng bộ từ phụ lục khi tạo dự án'].filter(Boolean).join(' | '),
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
    setSelectedEngineerIds([]);
    setPendingProjectTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const [editProjName, setEditProjName] = useState('');
  const [editProjLocation, setEditProjLocation] = useState('');
  const [editProjClient, setEditProjClient] = useState('');
  const [editProjContractValue, setEditProjContractValue] = useState('');
  const [editSelectedEngineerIds, setEditSelectedEngineerIds] = useState<string[]>([]);

  const toggleEditEngineerId = (id: string) => {
    setEditSelectedEngineerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openEditModal = (project: Project) => {
    setProjectToEdit(project);
    setEditProjName(project.name);
    setEditProjLocation(project.location || '');
    setEditProjClient(project.client || '');
    setEditProjContractValue(project.contractValue ? String(project.contractValue) : '');

    // Resolve engineers from the engineers array since database doesn't store project.members
    const assignedEngineers = engineers
      .filter(eng => Array.isArray(eng.projectCodes) && eng.projectCodes.includes(project.code))
      .map(eng => eng.id);

    const allMemberIds = Array.from(new Set([...(project.members || []), ...assignedEngineers]));
    setEditSelectedEngineerIds(allMemberIds);
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;
    if (!editProjName.trim()) return;

    setLoading(true);
    setLoadingMessage('Đang cập nhật dự án...');
    try {
      const selectedEngineers = engineers.filter(eng => editSelectedEngineerIds.includes(eng.id));
      const managerName = selectedEngineers.length > 0 ? selectedEngineers.map(e => e.name).join(', ') : TEXT.unassigned;

      const payload = {
        name: editProjName.trim(),
        location: editProjLocation.trim(),
        client: editProjClient.trim() || undefined,
        contractValue: Number(editProjContractValue) || undefined,
        managerId: editSelectedEngineerIds[0],
        managerName: managerName,
        members: editSelectedEngineerIds,
        memberIds: editSelectedEngineerIds,
      };

      await updateProject(projectToEdit.id, payload);

      // Update engineer project codes if members changed
      const oldMembers = Array.from(new Set([
        ...(projectToEdit.members || []),
        ...engineers.filter(eng => Array.isArray(eng.projectCodes) && eng.projectCodes.includes(projectToEdit.code)).map(eng => eng.id)
      ]));
      const addedMembers = editSelectedEngineerIds.filter(id => !oldMembers.includes(id));
      const removedMembers = oldMembers.filter(id => !editSelectedEngineerIds.includes(id));

      for (const id of addedMembers) {
        const eng = engineers.find(e => e.id === id);
        if (eng && (!eng.projectCodes || !eng.projectCodes.includes(projectToEdit.code))) {
          const newCodes = Array.isArray(eng.projectCodes) ? [...eng.projectCodes, projectToEdit.code] : [projectToEdit.code];
          await updateEngineer(id, { name: eng.name, projectCodes: newCodes });
        }
      }
      for (const id of removedMembers) {
        const eng = engineers.find(e => e.id === id);
        if (eng && eng.projectCodes && eng.projectCodes.includes(projectToEdit.code)) {
          const newCodes = eng.projectCodes.filter(c => c !== projectToEdit.code);
          await updateEngineer(id, { name: eng.name, projectCodes: newCodes });
        }
      }

      logActivity(`Cập nhật thông tin dự án: ${editProjName.trim()}`, editProjName.trim());
      triggerToast('Cập nhật dự án thành công', 'success');
      setProjectToEdit(null);
    } catch (error) {
      console.error(error);
      triggerToast('Lỗi khi cập nhật dự án', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setLoading(true);
    setLoadingMessage('Đang xóa dự án...');
    try {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      triggerToast(TEXT.deleted, 'success');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const statusLabel: Record<Project['status'], string> = { active: TEXT.active, completed: TEXT.completed, on_hold: TEXT.onHold };
  const statusTone: Record<Project['status'], string> = {
    active: 'project-status project-status--active',
    completed: 'project-status project-status--completed',
    on_hold: 'project-status project-status--hold',
  };

  return (
    <div className="project-management-page flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      <LoadingSpinner loading={loading} message={loadingMessage} />
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />

      <section className={`sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm pl-3 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-4`}>
        <div className="flex items-center gap-4">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2">{TEXT.projectManagement}</h1>
        </div>


          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-primary text-[13px] font-bold border border-blue-100 whitespace-nowrap">
            {displayProjects.length} dự án
          </span>
          <div className="relative w-full sm:w-64 flex items-center">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={TEXT.searchProject}
              className="w-full pl-9 pr-3 h-[38px] border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            />
          </div>
          { (user?.role === 'admin' || user?.role === 'pm') ? (
          <button
            type="button"
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-2.5 bg-primary text-white px-3.5 h-[38px] rounded-lg text-[13px] font-bold hover:opacity-90 active:scale-95 shadow-xs whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {TEXT.createProject}
          </button>
          ) : null}
        </div>
      </section>

      <div className="p-6">
        {enhancedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-slate-300">folder_open</span>
            <h3 className="mt-3 font-bold text-slate-700">{searchQuery ? TEXT.noProjectFound : TEXT.noProject}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {enhancedProjects.map((project, idx) => {
              const barColor = project.progress >= 100 ? 'bg-emerald-500'
                : project.progress >= 60 ? 'bg-blue-500'
                : project.progress >= 30 ? 'bg-amber-400' : 'bg-slate-300';
              const statusCfg = project.status === 'completed'
                ? { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' }
                : project.status === 'on_hold'
                  ? { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
                  : { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
              return (
                <div
                  key={project.id}
                  onClick={() => openProjectTasks(project)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openProjectTasks(project); }}
                  className="group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 overflow-hidden"
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${barColor}`} />

                  <div className="flex flex-col gap-3 p-4 flex-1">
                    {/* Header: số + tên */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 font-extrabold text-xs mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2">
                        <p className="font-bold text-primary text-sm leading-snug line-clamp-2" title={project.name}>
                          {project.name}
                        </p>
                      </div>
                    </div>

                    {/* Badge trạng thái */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusLabel[project.status]}
                      </span>
                      {project.location && (
                        <span className="text-[11px] text-slate-400 truncate">{project.location}</span>
                      )}
                    </div>

                    {/* Chủ đầu tư */}
                    {(project as any).client && (
                      <p className="text-[11px] text-slate-500 truncate">
                        <span className="font-semibold text-slate-400">CĐT: </span>
                        {(project as any).client}
                      </p>
                    )}

                    {/* Nhân sự dự án */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100/50">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 mr-0.5">Nhân sự:</span>
                        {project.memberNames?.length ? (
                          project.memberNames.map((name, i) => (
                            <div key={i} className="inline-flex items-center gap-2 bg-sky-50/50 border border-sky-100 rounded-full pr-2 pl-0.5 py-0.5">
                              <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[10px]">person</span>
                              </span>
                              <span className="text-[10px] font-semibold text-sky-700">
                                {name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="italic text-[11px] text-slate-400">Chưa có</span>
                        )}
                      </div>
                    </div>

                    {/* Tiến độ */}
                    <div className="mt-auto pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-400">Tiến độ</span>
                        <span className={`text-xs font-extrabold ${
                          project.progress >= 100 ? 'text-emerald-600'
                          : project.progress >= 60 ? 'text-blue-600'
                          : project.progress > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}>{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Nút sửa/xóa — hiện khi hover */}
                  {user?.role === 'admin' && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                        title="Sửa tên dự án"
                        className="rounded p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                        title={TEXT.deleteProject}
                        aria-label="Xóa dự án"
                        className="rounded p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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

      <Modal isOpen={Boolean(projectToEdit)} onClose={() => setProjectToEdit(null)} title="Cập nhật dự án">
        <form onSubmit={handleEditProject} className="space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên Dự án / Công trình mới *</label>
            <input required value={editProjName} onChange={(e) => setEditProjName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã Dự án</label>
              <input value={projectToEdit?.code || ''} disabled className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg cursor-not-allowed text-slate-500" title="Không thể đổi mã dự án sau khi tạo" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Địa điểm công trình</label>
              <input value={editProjLocation} onChange={(e) => setEditProjLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chủ đầu tư</label>
              <input value={editProjClient} onChange={(e) => setEditProjClient(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Giá trị hợp đồng</label>
              <input value={editProjContractValue} onChange={(e) => setEditProjContractValue(e.target.value)} inputMode="numeric" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nhân sự</label>
            <div className={`max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-slate-50 ${editSelectedEngineerIds.length === 0 ? 'border-red-200' : 'border-slate-200'}`}>
              {engineers.length === 0 && <p className="text-[11px] text-slate-400">Chưa có nhân sự nào.</p>}
              {engineers.filter(eng => eng.title !== 'Quản trị viên' && eng.title !== 'Quản lý dự án').map((eng) => (
                <label key={eng.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={editSelectedEngineerIds.includes(eng.id)} onChange={() => toggleEditEngineerId(eng.id)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                  <span className="font-semibold text-slate-700">{eng.name}</span>
                  <span className="text-slate-400">({eng.title || 'Nhân viên'})</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Người đầu tiên được chọn sẽ hiển thị dưới dạng Chỉ huy trưởng chính.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setProjectToEdit(null)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">{TEXT.cancel}</button>
            <button type="submit" disabled={!editProjName.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">Lưu thay đổi</button>
          </div>
        </form>
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
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nhân sự</label>
            <div className={`max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-slate-50 ${selectedEngineerIds.length === 0 ? 'border-red-200' : 'border-slate-200'}`}>
              {engineers.length === 0 && <p className="text-[11px] text-slate-400">Chưa có nhân sự nào.</p>}
              {engineers.filter(eng => eng.title !== 'Quản trị viên' && eng.title !== 'Quản lý dự án').map((eng) => (
                <label key={eng.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={selectedEngineerIds.includes(eng.id)} onChange={() => toggleEngineerId(eng.id)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                  <span className="font-semibold text-slate-700">{eng.name}</span>
                  <span className="text-slate-400">({eng.title || 'Nhân viên'})</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Người đầu tiên được chọn sẽ hiển thị dưới dạng Chỉ huy trưởng chính.</p>
          </div>
          {pendingProjectTasks.length > 0 && <p className="text-sm text-emerald-700 font-semibold">Khi lưu dự án, hệ thống sẽ đưa {pendingProjectTasks.length} dòng vào tab Công việc và KH Vật tư.</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">{TEXT.cancel}</button><button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90">{TEXT.create}</button></div>
        </form>
      </Modal>
    </div>
  );
};
