export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Chờ vật tư' | 'Chờ khách hàng' | 'Chờ nghiệm thu' | 'Hoàn thành' | 'Tạm dừng';
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
  assignerId?: string;
  assignerName?: string;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  reviewerId?: string;
  reviewerName?: string;
  dueDate?: string;
  priority?: TaskPriority;
  createdAt?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client?: string; // Chủ đầu tư
  location: string;
  contractValue?: number; // Giá trị
  progressPercent: number;
  status: 'active' | 'completed' | 'on_hold';
  activeTeams?: number;
  totalTasks: number;
  completedTasks: number;
  issueTasksCount: number;
  managerName: string;
  members?: string[]; // Danh sách thành viên (ID)
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

export interface ProjectMaterialPlan {
  id: string;
  stt: string;
  projectCode: string;
  jobContent: string;
  unit: string;
  contractVolume: number;
  techSpecModel?: string;
  techSpecOrigin?: string;
  progressStatus?: string;
  orderedVolume?: number;
  orderedStatus?: string;
  expectedDate?: string;
  issueContent?: string;
  issueStatus?: string;
  docCo?: boolean;
  docCq?: boolean;
  docFireInspection?: boolean;
  dispatchToSite?: boolean;
  dispatchDate?: string;
  notes?: string;
}

export interface ProjectPurchasing {
  id: string;
  stt: string;
  projectCode: string;
  content: string;
  unit: string;
  volumeContract: number;
  volumeOrder: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  prepayPercent: number;
  prepayAmount: number;
  remainingAmount: number;
  orderStatus: string;
  contractStatus: string;
  paymentDate?: string;
  invoiceStatus?: string;
  notes?: string;
}

export interface ProjectExpense {
  id: string;
  stt: string;
  projectCode: string;
  date: string;
  content: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  totalAmount: number;
  incomeAmount?: number;
  balanceFund?: number;
  notes?: string;
  invoiceUrl?: string;
}

export interface LaborPayroll {
  id: string;
  stt: string;
  projectCode: string;
  date: string;
  content: string;
  description: string;
  workerName?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  bankAccount: string;
  bankInfo?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  paymentStatus: string;
  notes?: string;
}

export interface DocumentTrack {
  id: string;
  stt: string;
  contractNo: string;
  contractName: string;
  projectCode: string;
  company: string;
  receiverName: string;
  phone: string;
  address: string;
  sendDate: string;
  receiveDate?: string;
  docStatus: string;
  side?: string;
  contractValue: number;
  prepayPercent: number;
  prepayAmount: number;
  paymentStatus: string;
  isCompleted: boolean;
  notes?: string;
}

export interface FieldLog {
  id: string;
  projectCode: string;
  taskId: string;
  engineerId: string;
  timestamp: string; // Giờ báo cáo
  note: string;
  images: string[]; // Base64 hoặc URL
  gpsLocation?: { lat: number; lng: number; text?: string }; // Tọa độ
  statusUpdate: 'Đang làm' | 'Hoàn thành' | 'Vướng mắc';
}
