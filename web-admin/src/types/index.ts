export type TaskStatus = 'Not Started' | 'In Progress' | 'Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  stt: string;
  code: string;
  name: string;
  projectCode: string;
  projectName: string;
  volume: number;
  unit: string;
  progress: number;
  status: TaskStatus;
  purchaseStatus: string;
  constrStatus: string;
  issue?: string;
  issueStatus?: string;
  isDone: boolean;
  isSectionHeader?: boolean; // Cờ đánh dấu dòng Tiêu đề Mục (I, II, III...)
  sectionName?: string; // Tên phân mục cha
  notes?: string;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  dueDate?: string;
  priority?: TaskPriority;
  createdAt?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  location: string;
  progressPercent: number;
  status: 'active' | 'completed' | 'on_hold';
  activeTeams?: number;
  totalTasks: number;
  completedTasks: number;
  issueTasksCount: number;
  managerName: string;
  startDate?: string;
  endDate?: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  englishName?: string;
  projectCode: string;
  projectName: string;
  volume: number;
  unit: string;
  unitPrice?: number;
  status: string;
  constrStatus?: string;
  supplier?: string;
  // Bổ sung cho Quản lý kho
  initialStock?: number;
  currentStock?: number;
  totalImport?: number;
  totalExport?: number;
  category?: string;
  specs?: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'IMPORT' | 'EXPORT';
  date: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specs?: string;
  unit: string;
  quantity: number;
  sourceOrProject: string; // Nguồn Nhập hoặc Mã Dự Án xuất
  receiverName?: string; // Người Nhận (đối với xuất kho)
  notes?: string;
  createdAt: string;
}
export type IssueStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED';
export type IssuePriority = 'CRITICAL' | 'WARNING' | 'STANDARD';

export interface Issue {
  id: string;
  incidentCode: string;
  title: string;
  projectName: string;
  projectCode: string;
  location: string;
  reportedBy: string;
  reportedTime: string;
  description: string;
  photoUrl: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignedTo: string;
  managerDirectives?: string;
  timelineLogs: Array<{
    id: string;
    time: string;
    author: string;
    message: string;
  }>;
}

export interface Engineer {
  id: string;
  name: string;
  title: string;
  avatar: string;
  phone: string;
  email: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'task_assigned' | 'issue_alert' | 'material_update' | 'system';
  icon?: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  project: string;
  timestamp: string;
  icon: string;
  badgeBg: string;
  iconColor: string;
}
