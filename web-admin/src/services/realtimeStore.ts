import { create } from 'zustand';
import { Project, Task, Material, Issue, Engineer, NotificationItem, ActivityLog, IssueStatus, TaskStatus, InventoryTransaction } from '../types';
import rawExcelData from './excelSeedData.json';

// Utility to check if STT or row is a section header (I, II, III...)
const isRomanOrSection = (stt: string, volume: number, unit: string) => {
  if (!stt) return volume === 0 && !unit;
  const clean = stt.trim().toUpperCase();
  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/;
  return romanRegex.test(clean) || (volume === 0 && (!unit || unit.trim() === ''));
};

// Seed Projects from Excel
const seedProjects: Project[] = Object.keys(rawExcelData).map((key) => {
  const sheet = (rawExcelData as any)[key];
  const items: any[] = sheet.items || [];
  const validSubItems = items.filter((i) => !isRomanOrSection(i.stt, i.volume || 0, i.unit));
  const completedCount = validSubItems.filter((i) => i.isDone || i.progress >= 1).length;
  const issueCount = items.filter((i) => i.issue && i.issue.trim().length > 0).length;
  const avgProgress = validSubItems.length > 0
    ? Math.round((validSubItems.reduce((acc, i) => acc + (i.progress || 0), 0) / validSubItems.length) * 100)
    : 0;

  return {
    id: `proj-${key.toLowerCase()}`,
    code: key,
    name: sheet.title || key,
    location: key === 'DAKRLAP' ? 'Đắc Nông' : key === 'PHƯỚC TÂN' ? 'Đồng Nai' : 'Cà Mau',
    progressPercent: avgProgress,
    status: 'active',
    activeTeams: 3,
    totalTasks: validSubItems.length,
    completedTasks: completedCount,
    issueTasksCount: issueCount,
    managerName: key === 'DAKRLAP' ? 'Kỹ sư Nam' : key === 'PHƯỚC TÂN' ? 'Kỹ sư Hùng' : 'Kỹ sư Lan',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
  };
});

// Seed Tasks from Excel with Section Heading Logic (I, II, III...)
const seedTasks: Task[] = [];
Object.keys(rawExcelData).forEach((key) => {
  const sheet = (rawExcelData as any)[key];
  const items: any[] = sheet.items || [];
  let currentSection = 'Mục chung';

  items.forEach((item, idx) => {
    const isSection = isRomanOrSection(item.stt, item.volume || 0, item.unit);
    if (isSection) {
      currentSection = `${item.stt ? item.stt + '. ' : ''}${item.name}`;
    }

    const isFinished = item.isDone || item.progress >= 1;
    const taskStatus: TaskStatus = isFinished
      ? 'Done'
      : item.progress > 0
      ? 'In Progress'
      : item.issue
      ? 'Review'
      : 'Not Started';

    seedTasks.push({
      id: `tsk-${key}-${idx + 1}`,
      stt: item.stt || `${idx + 1}`,
      code: `TSK-${key}-${idx + 1}`,
      name: item.name,
      projectCode: key,
      projectName: sheet.title,
      volume: item.volume || 0,
      unit: item.unit || '',
      progress: item.progress || 0,
      status: taskStatus,
      purchaseStatus: item.purchaseStatus || 'Chưa đặt hàng',
      constrStatus: item.constrStatus || 'Chưa thi công',
      issue: item.issue || '',
      issueStatus: item.issueStatus || '',
      isDone: isFinished,
      isSectionHeader: isSection,
      sectionName: currentSection,
      notes: item.notes || '',
      assignedEngineerId: idx % 3 === 0 ? 'eng-1' : idx % 3 === 1 ? 'eng-2' : 'eng-3',
      assignedEngineerName: idx % 3 === 0 ? 'Kỹ sư Nam' : idx % 3 === 1 ? 'Kỹ sư Hùng' : 'Kỹ sư Lan',
      dueDate: '2024-11-30',
      priority: item.issue ? 'High' : item.progress === 0 ? 'Medium' : 'Low',
      createdAt: '2023-10-01',
    });
  });
});

// Seed Materials
const seedMaterials: Material[] = seedTasks
  .filter((t) => !t.isSectionHeader && (t.volume > 0 || t.purchaseStatus))
  .slice(0, 40)
  .map((t, idx) => ({
    id: `mat-${idx + 1}`,
    code: `MAT-${100 + idx}`,
    name: t.name,
    englishName: t.name,
    projectName: t.projectName,
    projectCode: t.projectCode,
    volume: t.volume,
    unit: t.unit || 'bộ',
    unitPrice: 25.0,
    status: t.purchaseStatus || 'Chưa đặt hàng',
    constrStatus: t.constrStatus || 'Chưa thi công',
    supplier: 'Nhà cung cấp VTTB Điện',
  }));

// Seed Issues
const seedIssues: Issue[] = seedTasks
  .filter((t) => !t.isSectionHeader && t.issue && t.issue.trim().length > 0)
  .map((t, idx) => ({
    id: `iss-${idx + 1}`,
    incidentCode: `VM-${t.projectCode}-${idx + 1}`,
    title: t.issue || 'Vướng mắc thi công',
    projectName: t.projectName,
    projectCode: t.projectCode,
    location: `${t.projectName} - ${t.sectionName || t.stt}`,
    reportedBy: 'Kỹ sư Giám sát Hiện trường',
    reportedTime: 'Ghi nhận từ Excel Tiến độ',
    description: `Hạng mục "${t.name}" thuộc ${t.sectionName} đang vướng mắc: ${t.issue}`,
    photoUrl: idx % 2 === 0
      ? 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    status: (t.issueStatus ? 'PROCESSING' : 'OPEN') as IssueStatus,
    priority: 'CRITICAL',
    assignedTo: t.assignedEngineerName || 'Ban Quản Lý Dự Án',
    managerDirectives: t.issueStatus || 'Yêu cầu tập trung phối hợp tháo gỡ vướng mắc.',
    timelineLogs: [
      {
        id: `tl-${idx}-1`,
        time: 'Ghi nhận',
        author: 'File Excel Tiến độ',
        message: `Phát hiện vướng mắc/tồn đọng: ${t.issue}`,
      },
      ...(t.issueStatus
        ? [
            {
              id: `tl-${idx}-2`,
              time: 'Cập nhật',
              author: 'Chỉ đạo Xử lý',
              message: t.issueStatus,
            },
          ]
        : []),
    ],
  }));

const seedEngineers: Engineer[] = [
  { id: 'eng-1', name: 'Kỹ sư Nam', title: "Giám sát 110kV Đắc R'Lấp", avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', phone: '0903 123 456', email: 'nam.nguyen@buildcore.vn' },
  { id: 'eng-2', name: 'Kỹ sư Hùng', title: 'Chỉ huy 110kV Phước Tân', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', phone: '0912 987 654', email: 'hung.tran@buildcore.vn' },
  { id: 'eng-3', name: 'Kỹ sư Lan', title: 'Quản lý 220kV Năm Căn', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80', phone: '0988 555 777', email: 'lan.pham@buildcore.vn' },
];

const seedNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Đã nạp file tiến độ công trình',
    message: 'Đã phân nhóm Mục I, II, III... tự động từ file "bảng theo dõi tiến độ.xlsx".',
    timestamp: 'Vừa xong',
    read: false,
    type: 'system',
    icon: 'folder_open',
  },
];

const seedActivityLogs: ActivityLog[] = [
  {
    id: 'act-1',
    user: 'Hệ thống Excel Sync',
    action: 'Đã nạp và phân nhóm mục tiến độ từ',
    project: 'bảng theo dõi tiến độ.xlsx',
    timestamp: 'Vừa xong',
    icon: 'table_chart',
    badgeBg: 'bg-blue-50',
    iconColor: 'text-primary',
  },
];

interface RealtimeStoreState {
  projects: Project[];
  tasks: Task[];
  materials: Material[];
  issues: Issue[];
  engineers: Engineer[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  inventoryTransactions: InventoryTransaction[];

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
}

const STORAGE_KEY = 'buildcore_pro_excel_db_v4';

const loadSavedState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved state', e);
  }
  return null;
};

const savedState = loadSavedState();

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => {
  let channel: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('buildcore_excel_events');
    channel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_STATE') {
        const fresh = loadSavedState();
        if (fresh) set(fresh);
      }
    };
  }

  const persistAndNotify = (newState: Partial<RealtimeStoreState>) => {
    const current = get();
    const updated = {
      projects: newState.projects || current.projects,
      tasks: newState.tasks || current.tasks,
      materials: newState.materials || current.materials,
      issues: newState.issues || current.issues,
      engineers: newState.engineers || current.engineers,
      notifications: newState.notifications || current.notifications,
      activityLogs: newState.activityLogs || current.activityLogs,
      inventoryTransactions: newState.inventoryTransactions || current.inventoryTransactions,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      channel?.postMessage({ type: 'SYNC_STATE' });
    } catch (e) {
      console.error('Failed to save state', e);
    }
  };

  return {
    projects: savedState?.projects || seedProjects,
    tasks: savedState?.tasks || seedTasks,
    materials: savedState?.materials || seedMaterials,
    issues: savedState?.issues || seedIssues,
    engineers: savedState?.engineers || seedEngineers,
    notifications: savedState?.notifications || seedNotifications,
    activityLogs: savedState?.activityLogs || seedActivityLogs,
    inventoryTransactions: savedState?.inventoryTransactions || [],

    addTask: (taskData) => {
      const newTask: Task = {
        ...taskData,
        id: 'tsk-new-' + Date.now(),
      };
      set((state) => {
        const nextTasks = [newTask, ...state.tasks];
        persistAndNotify({ tasks: nextTasks });
        return { tasks: nextTasks };
      });
    },

    addTasksBatch: (batchData) => {
      const newTasks: Task[] = batchData.map((t, idx) => ({
        ...t,
        id: `tsk-imp-${Date.now()}-${idx}`,
      }));

      set((state) => {
        const nextTasks = [...newTasks, ...state.tasks];
        const nextNotifs: NotificationItem[] = [
          {
            id: 'notif-' + Date.now(),
            title: 'Import Excel thành công',
            message: `Đã nạp ${newTasks.length} hạng mục từ file Excel mới.`,
            timestamp: 'Vừa xong',
            read: false,
            type: 'system',
            icon: 'file_upload',
          },
          ...state.notifications,
        ];
        persistAndNotify({ tasks: nextTasks, notifications: nextNotifs });
        return { tasks: nextTasks, notifications: nextNotifs };
      });
    },

    updateTask: (id, updatedFields) => {
      set((state) => {
        let modifiedProjectCode = '';
        const nextTasks = state.tasks.map((t) => {
          if (t.id === id) {
            modifiedProjectCode = updatedFields.projectCode || t.projectCode;
            return { ...t, ...updatedFields };
          }
          return t;
        });

        const nextProjects = state.projects.map(p => {
          if (p.code === modifiedProjectCode) {
            const projectTasks = nextTasks.filter(t => t.projectCode === p.code && !t.isSectionHeader);
            if (projectTasks.length === 0) return p;
            
            const totalProgress = projectTasks.reduce((sum, t) => sum + (t.isDone ? 1 : (t.progress || 0)), 0);
            const completedCount = projectTasks.filter(t => t.isDone || t.progress >= 1).length;
            
            return {
              ...p,
              completedTasks: completedCount,
              progressPercent: Math.round((totalProgress / projectTasks.length) * 100)
            };
          }
          return p;
        });

        persistAndNotify({ tasks: nextTasks, projects: nextProjects });
        return { tasks: nextTasks, projects: nextProjects };
      });
    },

    updateTaskProgress: (id, progress, isDone) => {
      set((state) => {
        let modifiedProjectCode = '';
        const nextTasks = state.tasks.map((t) => {
          if (t.id === id) {
            modifiedProjectCode = t.projectCode;
            return {
              ...t,
              progress,
              isDone,
              status: (isDone ? 'Done' : progress > 0 ? 'In Progress' : 'Not Started') as TaskStatus,
            };
          }
          return t;
        });

        const nextProjects = state.projects.map(p => {
          if (p.code === modifiedProjectCode) {
            const projectTasks = nextTasks.filter(t => t.projectCode === p.code && !t.isSectionHeader);
            if (projectTasks.length === 0) return p;
            
            const totalProgress = projectTasks.reduce((sum, t) => sum + (t.isDone ? 1 : (t.progress || 0)), 0);
            const completedCount = projectTasks.filter(t => t.isDone || t.progress >= 1).length;
            
            return {
              ...p,
              completedTasks: completedCount,
              progressPercent: Math.round((totalProgress / projectTasks.length) * 100)
            };
          }
          return p;
        });

        persistAndNotify({ tasks: nextTasks, projects: nextProjects });
        return { tasks: nextTasks, projects: nextProjects };
      });
    },

    assignEngineer: (taskId, engineerId, engineerName) => {
      set((state) => {
        let taskName = '';
        const nextTasks = state.tasks.map((t) => {
          if (t.id === taskId) {
            taskName = t.name;
            return { ...t, assignedEngineerId: engineerId, assignedEngineerName: engineerName };
          }
          return t;
        });

        const newNotif: NotificationItem = {
          id: 'notif-assign-' + Date.now(),
          title: 'Phân công nhân sự',
          message: `Đã giao hạng mục "${taskName}" cho ${engineerName}.`,
          timestamp: 'Vừa xong',
          read: false,
          type: 'task_assigned',
          icon: 'person_add',
        };

        const nextNotifs = [newNotif, ...state.notifications];
        persistAndNotify({ tasks: nextTasks, notifications: nextNotifs });
        return { tasks: nextTasks, notifications: nextNotifs };
      });
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

    deleteTask: (id) => {
      set((state) => {
        const nextTasks = state.tasks.filter((t) => t.id !== id);
        persistAndNotify({ tasks: nextTasks });
        return { tasks: nextTasks };
      });
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
        
        // Update corresponding material's stock
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

    addProject: (projData) => {
      const newProj: Project = {
        ...projData,
        id: 'proj-' + Date.now(),
        issueTasksCount: 0,
      };
      set((state) => {
        const nextProjs = [newProj, ...state.projects];
        persistAndNotify({ projects: nextProjs });
        return { projects: nextProjs };
      });
    },
  };
});
