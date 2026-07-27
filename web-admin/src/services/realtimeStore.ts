import { create } from 'zustand';
import {
  Project,
  Task,
  Material,
  Issue,
  Engineer,
  NotificationItem,
  ActivityLog,
  IssueStatus,
  TaskStatus,
  InventoryTransaction,
  ProjectMaterialPlan,
  ProjectPurchasing,
  ProjectExpense,
  LaborPayroll,
  DocumentTrack
} from '../types';
import { api } from './api';

// Utility to check if STT or row is a section header (I, II, III...)
const isRomanOrSection = (stt: string, volume: number, unit: string) => {
  if (!stt) return volume === 0 && !unit;
  const clean = stt.trim().toUpperCase();
  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/;
  return romanRegex.test(clean) || (volume === 0 && (!unit || unit.trim() === ''));
};

const normalizeStatusText = (value?: string) => (value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0111/g, 'd');

const purchaseProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'khong co hang' || clean === 'chua dat hang') return 0;
  if (clean === 'dang dat hang') return 0.3;
  if (clean === 'da dat hang') return 0.6;
  if (clean === 'dang giao') return 0.85;
  if (clean === 'da co hang' || clean === 'hang gia cong') return 1;
  return 0;
};

const constructionProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'chua thi cong' || clean === 'dang vuong mac') return 0;
  if (clean === 'vuong mac') return 0.2;
  if (clean === 'da keo day' || clean === 'da lap thiet bi vao tu') return 0.4;
  if (clean === 'dang thi cong') return 0.5;
  if (clean === 'da lap tb + keo day') return 0.6;
  if (clean === 'dang ete') return 0.8;
  if (clean === 'da thi cong') return 1;
  return 0;
};

const calculateTaskProgressFromStatuses = (purchaseStatus?: string, constrStatus?: string) => {
  const progress = purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5;
  return Math.max(0, Math.min(1, Number(progress.toFixed(4))));
};

const taskStatusFromProgress = (task: Pick<Task, 'isSectionHeader' | 'issue' | 'issueStatus'>, progress: number): TaskStatus => {
  if (task.isSectionHeader) return 'Not Started';
  if (progress >= 1) return 'Done';
  if (task.issue || task.issueStatus) return 'Review';
  return progress > 0 ? 'In Progress' : 'Not Started';
};

const withAutoProgress = (task: Task): Task => {
  if (task.isSectionHeader) {
    return { ...task, progress: 0, isDone: false, status: 'Not Started' };
  }

  const progress = calculateTaskProgressFromStatuses(task.purchaseStatus, task.constrStatus);
  return {
    ...task,
    progress,
    isDone: progress >= 1,
    status: taskStatusFromProgress(task, progress),
  };
};

const recalculateProjectsFromTasks = (projects: Project[], tasks: Task[], projectCodes?: string[]) => {
  const targetCodes = projectCodes ? new Set(projectCodes.filter(Boolean)) : null;
  return projects.map((project) => {
    if (targetCodes && !targetCodes.has(project.code)) return project;

    const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
    if (projectTasks.length === 0) {
      return { ...project, totalTasks: 0, completedTasks: 0, progressPercent: 0 };
    }

    const totalProgress = projectTasks.reduce((sum, task) => sum + (task.isDone ? 1 : task.progress || 0), 0);
    const completedTasks = projectTasks.filter((task) => task.isDone || task.progress >= 1).length;

    return {
      ...project,
      totalTasks: projectTasks.length,
      completedTasks,
      progressPercent: Math.round((totalProgress / projectTasks.length) * 100),
    };
  });
};

interface RealtimeStoreState {
  projects: Project[];
  tasks: Task[];
  materials: Material[];
  issues: Issue[];
  engineers: Engineer[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  inventoryTransactions: InventoryTransaction[];
  materialPlans: ProjectMaterialPlan[];
  purchasingPlans: ProjectPurchasing[];
  expenses: ProjectExpense[];
  laborPayrolls: LaborPayroll[];
  documentTracks: DocumentTrack[];

  // Fetch Actions
  fetchProjects: () => Promise<void>;
  fetchTasks: (projectId?: string) => Promise<void>;
  fetchMaterials: (projectId?: string) => Promise<void>;
  fetchIssues: (projectId?: string) => Promise<void>;
  fetchEngineers: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
  fetchAccounting: () => Promise<void>;

  // Actions
  addTask: (task: Omit<Task, 'id'>) => void;
  addTasksBatch: (tasks: Omit<Task, 'id'>[]) => void;
  updateTask: (id: string, updatedFields: Partial<Task>) => void;
  updateTaskProgress: (id: string, progress: number, isDone: boolean) => void;
  assignEngineer: (taskId: string, engineerId: string, engineerName: string) => void;
  addEngineer: (engineer: Omit<Engineer, 'id'>) => Engineer;
  deleteTask: (id: string) => void;

  addMaterial: (mat: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, updatedFields: Partial<Material>) => void;
  updateMaterialStatus: (id: string, status: string) => void;
  deleteMaterial: (id: string) => void;

  addInventoryTransaction: (transaction: Omit<InventoryTransaction, 'id' | 'createdAt'>) => void;

  addIssue: (issue: Omit<Issue, 'id'>) => void;
  updateIssueStatus: (id: string, status: IssueStatus) => void;
  addDirective: (issueId: string, directive: string) => void;

  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addProject: (proj: Omit<Project, 'id'>) => void;

  // New Actions
  addMaterialPlan: (plan: Omit<ProjectMaterialPlan, 'id'>) => void;
  updateMaterialPlan: (id: string, fields: Partial<ProjectMaterialPlan>) => void;
  deleteMaterialPlan: (id: string) => void;

  addPurchasingPlan: (plan: Omit<ProjectPurchasing, 'id'>) => void;
  updatePurchasingPlan: (id: string, fields: Partial<ProjectPurchasing>) => void;
  deletePurchasingPlan: (id: string) => void;

  addExpense: (expense: Omit<ProjectExpense, 'id'>) => void;
  updateExpense: (id: string, fields: Partial<ProjectExpense>) => void;
  deleteExpense: (id: string) => void;

  addLaborPayroll: (payroll: Omit<LaborPayroll, 'id'>) => void;
  updateLaborPayroll: (id: string, fields: Partial<LaborPayroll>) => void;
  deleteLaborPayroll: (id: string) => void;

  addDocumentTrack: (track: Omit<DocumentTrack, 'id'>) => void;
  updateDocumentTrack: (id: string, fields: Partial<DocumentTrack>) => void;
  deleteDocumentTrack: (id: string) => void;
  logActivity: (action: string, project: string, user?: string) => void;
}

const STORAGE_KEY = 'buildcore_pro_excel_db_v6';

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => {
  let channel: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('buildcore_excel_events');
    channel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_STATE') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) set(JSON.parse(raw));
      }
    };
  }

  const persistAndNotify = (newState: Partial<RealtimeStoreState>) => {
    const current = get();
    const updated = {
      projects: newState.projects !== undefined ? newState.projects : current.projects,
      tasks: newState.tasks !== undefined ? newState.tasks : current.tasks,
      materials: newState.materials !== undefined ? newState.materials : current.materials,
      issues: newState.issues !== undefined ? newState.issues : current.issues,
      engineers: newState.engineers !== undefined ? newState.engineers : current.engineers,
      notifications: newState.notifications !== undefined ? newState.notifications : current.notifications,
      activityLogs: newState.activityLogs !== undefined ? newState.activityLogs : current.activityLogs,
      inventoryTransactions: newState.inventoryTransactions !== undefined ? newState.inventoryTransactions : current.inventoryTransactions,
      materialPlans: newState.materialPlans !== undefined ? newState.materialPlans : current.materialPlans,
      purchasingPlans: newState.purchasingPlans !== undefined ? newState.purchasingPlans : current.purchasingPlans,
      expenses: newState.expenses !== undefined ? newState.expenses : current.expenses,
      laborPayrolls: newState.laborPayrolls !== undefined ? newState.laborPayrolls : current.laborPayrolls,
      documentTracks: newState.documentTracks !== undefined ? newState.documentTracks : current.documentTracks,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      channel?.postMessage({ type: 'SYNC_STATE' });
    } catch (e) {
      console.error('Failed to save state', e);
    }
  };

  return {
    projects: [],
    tasks: [],
    materials: [],
    issues: [],
    engineers: [],
    notifications: [],
    activityLogs: [],
    inventoryTransactions: [],
    materialPlans: [],
    purchasingPlans: [],
    expenses: [],
    laborPayrolls: [],
    documentTracks: [],

    fetchProjects: async () => {
      try {
        const projects = await api.projects.getAll();
        set({ projects });
      } catch (e) {
        console.error('Failed to fetch projects', e);
      }
    },

    fetchTasks: async (projectId) => {
      try {
        const tasks = await api.tasks.getAll(projectId);
        set({ tasks });
      } catch (e) {
        console.error('Failed to fetch tasks', e);
      }
    },

    fetchMaterials: async (projectId) => {
      try {
        const materials = await api.materials.getAll(projectId);
        set({ materials });
      } catch (e) {
        console.error('Failed to fetch materials', e);
      }
    },

    fetchIssues: async (projectId) => {
      try {
        const issues = await api.issues.getAll(projectId);
        set({ issues });
      } catch (e) {
        console.error('Failed to fetch issues', e);
      }
    },

    fetchEngineers: async () => {
      try {
        const engineers = await api.engineers.getAll();
        set({ engineers });
      } catch (e) {
        console.error('Failed to fetch engineers', e);
      }
    },

    fetchActivityLogs: async () => {
      try {
        const activityLogs = await api.activityLogs.getAll();
        set({ activityLogs });
      } catch (e) {
        console.error('Failed to fetch activity logs', e);
      }
    },

    fetchAccounting: async () => {
      try {
        const [materialPlans, purchasingPlans, expenses, laborPayrolls, documentTracks] = await Promise.all([
          api.accounting.getMaterialPlans(),
          api.accounting.getPurchasings(),
          api.accounting.getExpenses(),
          api.accounting.getPayrolls(),
          api.accounting.getDocumentTracks()
        ]);
        
        const nextState: any = {};
        if (Array.isArray(materialPlans)) nextState.materialPlans = materialPlans;
        if (Array.isArray(purchasingPlans)) nextState.purchasingPlans = purchasingPlans;
        if (Array.isArray(expenses)) nextState.expenses = expenses;
        if (Array.isArray(laborPayrolls)) nextState.laborPayrolls = laborPayrolls;
        if (Array.isArray(documentTracks)) nextState.documentTracks = documentTracks;
        
        set(nextState);
      } catch (e) {
        console.error('Failed to fetch accounting', e);
      }
    },

    addTask: async (taskData) => {
      try {
        const createdTask = await api.tasks.create(taskData);
        set((state) => {
          const nextTasks = [createdTask, ...state.tasks];
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, [createdTask.projectCode]);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        get().logActivity('Đã tạo thủ công hạng mục công việc: ' + createdTask.name, createdTask.projectName || createdTask.projectCode);
      } catch (e) {
        console.error('Failed to add task', e);
      }
    },

    addTasksBatch: async (batchData) => {
      try {
        const createdTasks = await Promise.all(batchData.map(t => api.tasks.create(t)));
        set((state) => {
          const nextTasks = [...createdTasks, ...state.tasks];
          const changedProjectCodes = Array.from(new Set(createdTasks.map((task) => task.projectCode)));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, changedProjectCodes);
          const nextNotifs: NotificationItem[] = [
            {
              id: 'notif-' + Date.now(),
              title: 'Import Excel thành công',
              message: `Đã nạp ${createdTasks.length} hạng mục từ tệp Excel.`,
              timestamp: 'Vừa xong',
              read: false,
              type: 'system',
              icon: 'file_upload',
            },
            ...state.notifications,
          ];
          persistAndNotify({ tasks: nextTasks, projects: nextProjects, notifications: nextNotifs });
          return { tasks: nextTasks, projects: nextProjects, notifications: nextNotifs };
        });
        if (createdTasks.length > 0) {
          get().logActivity(`Đã nhập khẩu ${createdTasks.length} hạng mục công việc từ file Excel`, createdTasks[0].projectName || 'Tiến độ', 'Excel Sync');
        }
      } catch (e) {
        console.error('Failed to add tasks batch', e);
      }
    },

    updateTask: async (id, updatedFields) => {
      try {
        const updatedTask = await api.tasks.update(id, updatedFields);
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === id ? updatedTask : t));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, [updatedTask.projectCode]);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        get().logActivity('Đã chỉnh sửa thông tin công việc: ' + updatedTask.name, updatedTask.projectName || updatedTask.projectCode);
      } catch (e) {
        console.error('Failed to update task', e);
      }
    },

    updateTaskProgress: async (id, progress, isDone) => {
      try {
        const updatedTask = await api.tasks.update(id, {
          progress,
          isDone,
          status: (isDone ? 'Done' : progress > 0 ? 'In Progress' : 'Not Started') as TaskStatus,
        });
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === id ? updatedTask : t));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, [updatedTask.projectCode]);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        get().logActivity(`Đã cập nhật tiến độ thi công thành ${Math.round(progress * 100)}%`, updatedTask.projectName || updatedTask.projectCode);
      } catch (e) {
        console.error('Failed to update task progress', e);
      }
    },

    assignEngineer: async (taskId, engineerId, engineerName) => {
      try {
        const updatedTask = await api.tasks.update(taskId, {
          assignedEngineerId: engineerId,
        });
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === taskId ? updatedTask : t));
          const newNotif: NotificationItem = {
            id: 'notif-assign-' + Date.now(),
            title: 'Phân công nhân sự',
            message: `Đã giao hạng mục "${updatedTask.name}" cho ${engineerName}.`,
            timestamp: 'Vừa xong',
            read: false,
            type: 'task_assigned',
            icon: 'person_add',
          };
          const nextNotifs = [newNotif, ...state.notifications];
          persistAndNotify({ tasks: nextTasks, notifications: nextNotifs });
          return { tasks: nextTasks, notifications: nextNotifs };
        });
      } catch (e) {
        console.error('Failed to assign engineer', e);
      }
    },

    addEngineer: (engineerData) => {
      const newEngineer: Engineer = {
        ...engineerData,
        id: 'eng-' + Date.now(),
      };
      set((state) => {
        const nextEngineers = [newEngineer, ...state.engineers];
        persistAndNotify({ engineers: nextEngineers });
        return { engineers: nextEngineers };
      });
      return newEngineer;
    },

    deleteTask: async (id) => {
      try {
        const taskToDelete = get().tasks.find(t => t.id === id);
        await api.tasks.delete(id);
        set((state) => {
          const nextTasks = state.tasks.filter((t) => t.id !== id);
          const projectCode = taskToDelete?.projectCode;
          const nextProjects = projectCode
            ? recalculateProjectsFromTasks(state.projects, nextTasks, [projectCode])
            : state.projects;
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        if (taskToDelete) {
          get().logActivity('Đã xóa công việc: ' + taskToDelete.name, taskToDelete.projectName || taskToDelete.projectCode);
        }
      } catch (e) {
        console.error('Failed to delete task', e);
      }
    },

    addMaterial: (matData) => {
      const newMat: Material = {
        ...matData,
        id: 'mat-' + Date.now(),
      };
      set((state) => {
        const nextMats = [newMat, ...state.materials];
        persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    updateMaterial: (id, updatedFields) => {
      set((state) => {
        const nextMats = state.materials.map((m) => (m.id === id ? { ...m, ...updatedFields } : m));
        persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    updateMaterialStatus: (id, status) => {
      set((state) => {
        const nextMats = state.materials.map((m) => (m.id === id ? { ...m, status } : m));
        persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    deleteMaterial: (id) => {
      set((state) => {
        const nextMats = state.materials.filter((m) => m.id !== id);
        persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    addInventoryTransaction: (transactionData) => {
      const newTransaction: InventoryTransaction = {
        ...transactionData,
        id: 'inv-' + Date.now(),
        createdAt: new Date().toISOString(),
      };

      set((state) => {
        const nextTransactions = [newTransaction, ...state.inventoryTransactions];
        const nextMats = state.materials.map(m => {
          if (m.id === transactionData.materialId) {
            let currentStock = m.currentStock || m.initialStock || 0;
            let totalImport = m.totalImport || 0;
            let totalExport = m.totalExport || 0;

            if (transactionData.type === 'IMPORT') {
              currentStock += transactionData.quantity;
              totalImport += transactionData.quantity;
            } else if (transactionData.type === 'EXPORT') {
              currentStock -= transactionData.quantity;
              totalExport += transactionData.quantity;
            }

            return { ...m, currentStock, totalImport, totalExport };
          }
          return m;
        });

        persistAndNotify({ inventoryTransactions: nextTransactions, materials: nextMats });
        return { inventoryTransactions: nextTransactions, materials: nextMats };
      });
    },

    addIssue: (issueData) => {
      const newIssue: Issue = {
        ...issueData,
        id: 'iss-' + Date.now(),
      };
      set((state) => {
        const nextIssues = [newIssue, ...state.issues];
        persistAndNotify({ issues: nextIssues });
        return { issues: nextIssues };
      });
    },

    updateIssueStatus: (id, status: IssueStatus) => {
      set((state) => {
        const nextIssues = state.issues.map((i) => (i.id === id ? { ...i, status } : i));
        persistAndNotify({ issues: nextIssues });
        return { issues: nextIssues };
      });
    },

    addDirective: (issueId, directive) => {
      set((state) => {
        const nextIssues = state.issues.map((i) => {
          if (i.id === issueId) {
            return {
              ...i,
              managerDirectives: directive,
              status: 'PROCESSING' as IssueStatus,
              timelineLogs: [
                {
                  id: 'tl-' + Date.now(),
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  author: 'Ban Quản Lý Dự Án',
                  message: directive,
                },
                ...i.timelineLogs,
              ],
            };
          }
          return i;
        });
        persistAndNotify({ issues: nextIssues });
        return { issues: nextIssues };
      });
    },

    markNotificationRead: (id) => {
      set((state) => {
        const nextNotifs = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        persistAndNotify({ notifications: nextNotifs });
        return { notifications: nextNotifs };
      });
    },

    clearNotifications: () => {
      set((state) => {
        persistAndNotify({ notifications: [] });
        return { notifications: [] };
      });
    },

    addProject: async (projData) => {
      try {
        const createdProj = await api.projects.create(projData);
        set((state) => {
          const nextProjs = [createdProj, ...state.projects];
          persistAndNotify({ projects: nextProjs });
          return { projects: nextProjs };
        });
      } catch (e) {
        console.error('Failed to add project', e);
      }
    },

    addMaterialPlan: async (planData) => {
      try {
        const created = await api.accounting.createMaterialPlan(planData);
        set((state) => {
          const nextPlans = [created, ...state.materialPlans];
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
      } catch (e) {
        console.error('Failed to add material plan', e);
      }
    },

    updateMaterialPlan: async (id, fields) => {
      try {
        const updated = await api.accounting.updateMaterialPlan(id, fields);
        set((state) => {
          const nextPlans = state.materialPlans.map((p) => (p.id === id ? updated : p));
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
      } catch (e) {
        console.error('Failed to update material plan', e);
      }
    },

    deleteMaterialPlan: async (id) => {
      try {
        await api.accounting.deleteMaterialPlan(id);
        set((state) => {
          const nextPlans = state.materialPlans.filter((p) => p.id !== id);
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
      } catch (e) {
        console.error('Failed to delete material plan', e);
      }
    },

    addPurchasingPlan: async (purData) => {
      try {
        const created = await api.accounting.createPurchasing(purData);
        set((state) => {
          const nextPurs = [created, ...state.purchasingPlans];
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
      } catch (e) {
        console.error('Failed to add purchasing plan', e);
      }
    },

    updatePurchasingPlan: async (id, fields) => {
      try {
        const updated = await api.accounting.updatePurchasing(id, fields);
        set((state) => {
          const nextPurs = state.purchasingPlans.map((p) => (p.id === id ? updated : p));
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
      } catch (e) {
        console.error('Failed to update purchasing plan', e);
      }
    },

    deletePurchasingPlan: async (id) => {
      try {
        await api.accounting.deletePurchasing(id);
        set((state) => {
          const nextPurs = state.purchasingPlans.filter((p) => p.id !== id);
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
      } catch (e) {
        console.error('Failed to delete purchasing plan', e);
      }
    },

    addExpense: async (expData) => {
      try {
        const created = await api.accounting.createExpense(expData);
        set((state) => {
          const nextExps = [created, ...state.expenses];
          persistAndNotify({ expenses: nextExps });
          return { expenses: nextExps };
        });
      } catch (e) {
        console.error('Failed to add expense', e);
      }
    },

    updateExpense: async (id, fields) => {
      try {
        const updated = await api.accounting.updateExpense(id, fields);
        set((state) => {
          const nextExps = state.expenses.map((e) => (e.id === id ? updated : e));
          persistAndNotify({ expenses: nextExps });
          return { expenses: nextExps };
        });
      } catch (e) {
        console.error('Failed to update expense', e);
      }
    },

    deleteExpense: async (id) => {
      try {
        await api.accounting.deleteExpense(id);
        set((state) => {
          const nextExps = state.expenses.filter((e) => e.id !== id);
          persistAndNotify({ expenses: nextExps });
          return { expenses: nextExps };
        });
      } catch (e) {
        console.error('Failed to delete expense', e);
      }
    },

    addLaborPayroll: async (payrollData) => {
      try {
        const created = await api.accounting.createPayroll(payrollData);
        set((state) => {
          const nextPayrolls = [created, ...state.laborPayrolls];
          persistAndNotify({ laborPayrolls: nextPayrolls });
          return { laborPayrolls: nextPayrolls };
        });
      } catch (e) {
        console.error('Failed to add payroll', e);
      }
    },

    updateLaborPayroll: async (id, fields) => {
      try {
        const updated = await api.accounting.updatePayroll(id, fields);
        set((state) => {
          const nextPayrolls = state.laborPayrolls.map((l) => (l.id === id ? updated : l));
          persistAndNotify({ laborPayrolls: nextPayrolls });
          return { laborPayrolls: nextPayrolls };
        });
      } catch (e) {
        console.error('Failed to update payroll', e);
      }
    },

    deleteLaborPayroll: async (id) => {
      try {
        await api.accounting.deletePayroll(id);
        set((state) => {
          const nextPayrolls = state.laborPayrolls.filter((l) => l.id !== id);
          persistAndNotify({ laborPayrolls: nextPayrolls });
          return { laborPayrolls: nextPayrolls };
        });
      } catch (e) {
        console.error('Failed to delete payroll', e);
      }
    },

    addDocumentTrack: async (trackData) => {
      try {
        const created = await api.accounting.createDocumentTrack(trackData);
        set((state) => {
          const nextTracks = [created, ...state.documentTracks];
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        console.error('Failed to add document track', e);
      }
    },

    updateDocumentTrack: async (id, fields) => {
      try {
        const updated = await api.accounting.updateDocumentTrack(id, fields);
        set((state) => {
          const nextTracks = state.documentTracks.map((d) => (d.id === id ? updated : d));
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        console.error('Failed to update document track', e);
      }
    },

    deleteDocumentTrack: async (id) => {
      try {
        await api.accounting.deleteDocumentTrack(id);
        set((state) => {
          const nextTracks = state.documentTracks.filter((d) => d.id !== id);
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        console.error('Failed to delete document track', e);
      }
    },

    logActivity: (action, project, user = 'Kỹ sư Nam') => {
      set((state) => {
        const newLog: ActivityLog = {
          id: 'act-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          user,
          action,
          project,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
          icon: action.toLowerCase().includes('tiến độ') ? 'trending_up' :
                action.toLowerCase().includes('chi') || action.toLowerCase().includes('lương') || action.toLowerCase().includes('hợp đồng') ? 'payments' :
                action.toLowerCase().includes('kho') || action.toLowerCase().includes('vật tư') ? 'warehouse' :
                action.toLowerCase().includes('hồ sơ') ? 'drafts' : 'history',
          badgeBg: action.toLowerCase().includes('tiến độ') ? 'bg-blue-50' :
                   action.toLowerCase().includes('chi') || action.toLowerCase().includes('lương') || action.toLowerCase().includes('hợp đồng') ? 'bg-emerald-50' :
                   action.toLowerCase().includes('kho') || action.toLowerCase().includes('vật tư') ? 'bg-amber-50' :
                   action.toLowerCase().includes('hồ sơ') ? 'bg-violet-50' : 'bg-slate-50',
          iconColor: action.toLowerCase().includes('tiến độ') ? 'text-blue-500' :
                     action.toLowerCase().includes('chi') || action.toLowerCase().includes('lương') || action.toLowerCase().includes('hợp đồng') ? 'text-emerald-500' :
                     action.toLowerCase().includes('kho') || action.toLowerCase().includes('vật tư') ? 'text-amber-500' :
                     action.toLowerCase().includes('hồ sơ') ? 'text-violet-500' : 'text-slate-500',
        };
        const nextLogs = [newLog, ...state.activityLogs].slice(0, 100);
        persistAndNotify({ activityLogs: nextLogs });
        return { activityLogs: nextLogs };
      });
    },
  };
});
