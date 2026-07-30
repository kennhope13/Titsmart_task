import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Task, Material, Issue, Engineer, NotificationItem, ActivityLog, IssueStatus, TaskStatus, ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll, DocumentTrack, FieldLog } from '../types';
let memoryStorageValue: string | null = null;
let asyncStorageUnavailable = false;

const safeStorage = {
  getItem: async (key: string) => {
    if (asyncStorageUnavailable) return memoryStorageValue;
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      asyncStorageUnavailable = true;
      return memoryStorageValue;
    }
  },
  setItem: async (key: string, value: string) => {
    memoryStorageValue = value;
    if (asyncStorageUnavailable) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      asyncStorageUnavailable = true;
    }
  },
};

const isRomanOrSection = (stt: string, volume: number, unit: string) => {
  if (!stt) return volume === 0 && !unit;
  const clean = stt.trim().toUpperCase();
  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/;
  return romanRegex.test(clean) || (volume === 0 && (!unit || unit.trim() === ''));
};

interface RealtimeStoreState {
  projects: Project[];
  tasks: Task[];
  materials: Material[];
  issues: Issue[];
  engineers: Engineer[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  materialPlans: ProjectMaterialPlan[];
  purchasingPlans: ProjectPurchasing[];
  expenses: ProjectExpense[];
  laborPayrolls: LaborPayroll[];
  documentTracks: DocumentTrack[];
  fieldLogs: FieldLog[];
  isLoaded: boolean;

  // Actions
  loadState: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchTasks: (projectId?: string) => Promise<void>;
  fetchMaterials: (projectId?: string) => Promise<void>;
  fetchIssues: (projectId?: string) => Promise<void>;
  fetchEngineers: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
  fetchAccounting: () => Promise<void>;
  fetchFieldLogs: () => Promise<void>;
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

  addIssue: (issue: Omit<Issue, 'id'>) => void;
  updateIssueStatus: (id: string, status: IssueStatus) => void;
  addDirective: (issueId: string, directive: string) => void;

  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addProject: (proj: Omit<Project, 'id'>) => void;
  addFieldLog: (log: Omit<FieldLog, 'id'>) => void;
}

const STORAGE_KEY = 'buildcore_pro_excel_db_v5';

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => {
  const saveState = async (updatedState: Partial<RealtimeStoreState>) => {
    const current = get();
    const updated = {
      projects: updatedState.projects || current.projects,
      tasks: updatedState.tasks || current.tasks,
      materials: updatedState.materials || current.materials,
      issues: updatedState.issues || current.issues,
      engineers: updatedState.engineers || current.engineers,
      notifications: updatedState.notifications || current.notifications,
      activityLogs: updatedState.activityLogs || current.activityLogs,
      materialPlans: updatedState.materialPlans || current.materialPlans,
      purchasingPlans: updatedState.purchasingPlans || current.purchasingPlans,
      expenses: updatedState.expenses || current.expenses,
      laborPayrolls: updatedState.laborPayrolls || current.laborPayrolls,
      documentTracks: updatedState.documentTracks || current.documentTracks,
      fieldLogs: updatedState.fieldLogs || current.fieldLogs,
    };
    try {
      await safeStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      // Native storage can be unavailable in some dev builds; safeStorage keeps the app running.
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
    materialPlans: [],
    purchasingPlans: [],
    expenses: [],
    laborPayrolls: [],
    documentTracks: [],
    fieldLogs: [],
    isLoaded: false,

    fetchProjects: async () => {
      try {
        const { api } = await import('./api');
        const projects = await api.projects.getAll();
        if (Array.isArray(projects)) {
          set({ projects });
        } else {
          console.error('Projects API returned non-array:', projects);
        }
      } catch (e) {
        console.error('Failed to fetch projects', e);
      }
    },

    fetchTasks: async (projectId?: string) => {
      try {
        const { api } = await import('./api');
        const tasks = await api.tasks.getAll(projectId);
        if (Array.isArray(tasks)) {
          set({ tasks });
        } else {
          console.error('Tasks API returned non-array:', tasks);
        }
      } catch (e) {
        console.error('Failed to fetch tasks', e);
      }
    },

    fetchMaterials: async (projectId?: string) => {
      try {
        const { api } = await import('./api');
        const materials = await api.materials.getAll(projectId);
        if (Array.isArray(materials)) {
          set({ materials });
        } else {
          console.error('Materials API returned non-array:', materials);
        }
      } catch (e) {
        console.error('Failed to fetch materials', e);
      }
    },

    fetchIssues: async (projectId?: string) => {
      try {
        const { api } = await import('./api');
        const issues = await api.issues.getAll(projectId);
        if (Array.isArray(issues)) {
          set({ issues });
        } else {
          console.error('Issues API returned non-array:', issues);
        }
      } catch (e) {
        console.error('Failed to fetch issues', e);
      }
    },

    fetchEngineers: async () => {
      try {
        const { api } = await import('./api');
        const engineers = await api.engineers.getAll();
        if (Array.isArray(engineers)) {
          set({ engineers });
        } else {
          console.error('Engineers API returned non-array:', engineers);
        }
      } catch (e) {
        console.error('Failed to fetch engineers', e);
      }
    },

    fetchActivityLogs: async () => {
      try {
        const { api } = await import('./api');
        const activityLogs = await api.activityLogs.getAll();
        if (Array.isArray(activityLogs)) {
          set({ activityLogs });
        } else {
          console.error('ActivityLogs API returned non-array:', activityLogs);
        }
      } catch (e) {
        console.error('Failed to fetch activity logs', e);
      }
    },

    fetchFieldLogs: async () => {
      try {
        const { api } = await import('./api');
        const fieldLogs = await api.fieldLogs.getAll();
        if (Array.isArray(fieldLogs)) set({ fieldLogs });
      } catch (e) {
        console.error('Failed to fetch field logs', e);
      }
    },

    fetchAccounting: async () => {
      try {
        const { api } = await import('./api');
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

    loadState: async () => {
      try {
        const raw = await safeStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          set({ ...parsed, isLoaded: true });
        } else {
          set({ isLoaded: true });
        }
      } catch (e) {
        console.error('Failed to load state from AsyncStorage', e);
        set({ isLoaded: true });
      }
    },

    addTask: async (taskData) => {
      try {
        const { api } = await import('./api');
        const createdTask = await api.tasks.create(taskData);
        set((state) => {
          const nextTasks = [createdTask, ...state.tasks];
          saveState({ tasks: nextTasks });
          return { tasks: nextTasks };
        });
      } catch (e) {
        console.error('Failed to add task', e);
      }
    },

    addTasksBatch: async (batchData) => {
      try {
        const { api } = await import('./api');
        const createdTasks = await Promise.all(batchData.map(t => api.tasks.create(t)));
        set((state) => {
          const nextTasks = [...createdTasks, ...state.tasks];
          const nextNotifs: NotificationItem[] = [
            {
              id: 'notif-' + Date.now(),
              title: 'Import Excel thành công',
              message: `Đã nạp ${createdTasks.length} hạng mục từ tệp Excel.`,
              timestamp: 'Vừa xong',
              read: false,
              type: 'system',
            },
            ...state.notifications,
          ];
          saveState({ tasks: nextTasks, notifications: nextNotifs });
          return { tasks: nextTasks, notifications: nextNotifs };
        });
      } catch (e) {
        console.error('Failed to add tasks batch', e);
      }
    },

    updateTask: async (id, updatedFields) => {
      try {
        const { api } = await import('./api');
        const updatedTask = await api.tasks.update(id, updatedFields);
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === id ? updatedTask : t));
          saveState({ tasks: nextTasks });
          return { tasks: nextTasks };
        });
      } catch (e) {
        console.error('Failed to update task', e);
      }
    },

    updateTaskProgress: async (id, progress, isDone) => {
      try {
        const { api } = await import('./api');
        const updatedTask = await api.tasks.update(id, {
          progress,
          isDone,
          status: (isDone ? 'Done' : progress > 0 ? 'In Progress' : 'Not Started') as TaskStatus,
        });
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === id ? updatedTask : t));
          saveState({ tasks: nextTasks });
          return { tasks: nextTasks };
        });
      } catch (e) {
        console.error('Failed to update task progress', e);
      }
    },

    assignEngineer: async (taskId, engineerId, engineerName) => {
      try {
        const { api } = await import('./api');
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
          };
          const nextNotifs = [newNotif, ...state.notifications];
          saveState({ tasks: nextTasks, notifications: nextNotifs });
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
        saveState({ engineers: nextEngineers });
        return { engineers: nextEngineers };
      });
      return newEngineer;
    },

    deleteTask: async (id) => {
      try {
        const { api } = await import('./api');
        await api.tasks.delete(id);
        set((state) => {
          const nextTasks = state.tasks.filter((t) => t.id !== id);
          saveState({ tasks: nextTasks });
          return { tasks: nextTasks };
        });
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
        saveState({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    updateMaterial: (id, updatedFields) => {
      set((state) => {
        const nextMats = state.materials.map((m) => (m.id === id ? { ...m, ...updatedFields } : m));
        saveState({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    updateMaterialStatus: (id, status) => {
      set((state) => {
        const nextMats = state.materials.map((m) => (m.id === id ? { ...m, status } : m));
        saveState({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    deleteMaterial: (id) => {
      set((state) => {
        const nextMats = state.materials.filter((m) => m.id !== id);
        saveState({ materials: nextMats });
        return { materials: nextMats };
      });
    },

    addIssue: (issueData) => {
      const newIssue: Issue = {
        ...issueData,
        id: 'iss-' + Date.now(),
      };
      set((state) => {
        const nextIssues = [newIssue, ...state.issues];
        saveState({ issues: nextIssues });
        return { issues: nextIssues };
      });
    },

    updateIssueStatus: (id, status: IssueStatus) => {
      set((state) => {
        const nextIssues = state.issues.map((i) => (i.id === id ? { ...i, status } : i));
        saveState({ issues: nextIssues });
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
                  author: 'Ban Quản lý Dự án',
                  message: directive,
                },
                ...i.timelineLogs,
              ],
            };
          }
          return i;
        });
        saveState({ issues: nextIssues });
        return { issues: nextIssues };
      });
    },

    markNotificationRead: (id) => {
      set((state) => {
        const nextNotifs = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        saveState({ notifications: nextNotifs });
        return { notifications: nextNotifs };
      });
    },

    clearNotifications: () => {
      set((state) => {
        saveState({ notifications: [] });
        return { notifications: [] };
      });
    },

    addProject: async (projData) => {
      try {
        const { api } = await import('./api');
        const createdProj = await api.projects.create(projData);
        set((state) => {
          const nextProjs = [createdProj, ...state.projects];
          saveState({ projects: nextProjs });
          return { projects: nextProjs };
        });
      } catch (e) {
        console.error('Failed to add project', e);
      }
    },

    addFieldLog: async (logData) => {
      try {
        const { api } = await import('./api');
        const createdLog = await api.fieldLogs.create(logData);
        const nextLog = { ...logData, ...createdLog, id: createdLog?.id || 'fl-' + Date.now() } as FieldLog;
        set((state) => {
          const nextLogs = [nextLog, ...state.fieldLogs];
          saveState({ fieldLogs: nextLogs });
          return { fieldLogs: nextLogs };
        });
      } catch (e) {
        console.error('Failed to add field log', e);
      }
    },
  };
});



