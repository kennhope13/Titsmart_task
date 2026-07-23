import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Task, Material, Issue, Engineer, NotificationItem, ActivityLog, IssueStatus, TaskStatus } from '../types';
import rawExcelData from './excelSeedData.json';

const isRomanOrSection = (stt: string, volume: number, unit: string) => {
  if (!stt) return volume === 0 && !unit;
  const clean = stt.trim().toUpperCase();
  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/;
  return romanRegex.test(clean) || (volume === 0 && (!unit || unit.trim() === ''));
};

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
    message: 'Hệ thống đã sẵn sàng hoạt động trên thiết bị di động.',
    timestamp: 'Vừa xong',
    read: false,
    type: 'system',
    icon: 'folder_open',
  },
];

const seedActivityLogs: ActivityLog[] = [
  {
    id: 'act-1',
    user: 'Hệ thống Khởi tạo',
    action: 'Đã thiết lập ứng dụng di động thành công',
    project: 'Mobile App',
    timestamp: 'Vừa xong',
    icon: 'smartphone',
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
  isLoaded: boolean;

  // Actions
  loadState: () => Promise<void>;
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
}

const STORAGE_KEY = 'buildcore_pro_excel_db_v4';

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
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save state to AsyncStorage', e);
    }
  };

  return {
    projects: seedProjects,
    tasks: seedTasks,
    materials: seedMaterials,
    issues: seedIssues,
    engineers: seedEngineers,
    notifications: seedNotifications,
    activityLogs: seedActivityLogs,
    isLoaded: false,

    loadState: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
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

    addTask: (taskData) => {
      const newTask: Task = {
        ...taskData,
        id: 'tsk-new-' + Date.now(),
      };
      set((state) => {
        const nextTasks = [newTask, ...state.tasks];
        saveState({ tasks: nextTasks });
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
          },
          ...state.notifications,
        ];
        saveState({ tasks: nextTasks, notifications: nextNotifs });
        return { tasks: nextTasks, notifications: nextNotifs };
      });
    },

    updateTask: (id, updatedFields) => {
      set((state) => {
        const nextTasks = state.tasks.map((t) =>
          t.id === id ? { ...t, ...updatedFields } : t
        );
        saveState({ tasks: nextTasks });
        return { tasks: nextTasks };
      });
    },

    updateTaskProgress: (id, progress, isDone) => {
      set((state) => {
        const nextTasks = state.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                progress,
                isDone,
                status: (isDone ? 'Done' : progress > 0 ? 'In Progress' : 'Not Started') as TaskStatus,
              }
            : t
        );
        saveState({ tasks: nextTasks });
        return { tasks: nextTasks };
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
        };

        const nextNotifs = [newNotif, ...state.notifications];
        saveState({ tasks: nextTasks, notifications: nextNotifs });
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
        saveState({ engineers: nextEngineers });
        return { engineers: nextEngineers };
      });

      return newEngineer;
    },

    deleteTask: (id) => {
      set((state) => {
        const nextTasks = state.tasks.filter((t) => t.id !== id);
        saveState({ tasks: nextTasks });
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
                  author: 'Ban Quản Lý Dự Án',
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

    addProject: (projData) => {
      const newProj: Project = {
        ...projData,
        id: 'proj-' + Date.now(),
        issueTasksCount: 0,
      };
      set((state) => {
        const nextProjs = [newProj, ...state.projects];
        saveState({ projects: nextProjs });
        return { projects: nextProjs };
      });
    },
  };
});
