export type Permission = 'VIEW_PROJECT_DIAGRAM' 
  | 'VIEW_PROJECTS' | 'CREATE_PROJECTS' | 'EDIT_PROJECTS' | 'DELETE_PROJECTS'
  | 'VIEW_TASKS' | 'IMPORT_TASKS' | 'EDIT_TASKS' | 'ASSIGN_TASKS' | 'UPDATE_TASK_PROGRESS' | 'APPROVE_TASKS'
  | 'VIEW_MATERIALS' | 'IMPORT_MATERIALS' | 'EDIT_MATERIALS' | 'UPDATE_MATERIAL_STATUS'
  | 'VIEW_FINANCE' | 'EDIT_PRICES' | 'VIEW_PAYMENTS' | 'EDIT_PAYMENTS' | 'VIEW_EXPENSES' | 'EDIT_EXPENSES'
  | 'VIEW_DOCUMENTS' | 'MANAGE_DOCUMENTS'
  | 'VIEW_USERS' | 'MANAGE_USERS' | 'MANAGE_PERMISSIONS' | 'MANAGE_PAYROLL'
  | 'EXPORT_DATA' | 'MANAGE_INVENTORY' | 'VIEW_FIELD_LOGS' | 'MANAGE_FIELD_LOGS' | 'VIEW_ACTIVITY_LOG';

export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Chờ vật tư' | 'Chờ khách hàng' | 'Chờ nghiệm thu' | 'Hoàn thành' | 'Tạm dừng' | 'Chờ nhận việc';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export const PURCHASE_STATUS_OPTIONS = [
  'Không có hàng', 'Chưa đặt hàng', 'Đang đặt hàng', 'Đã đặt hàng', 'Đang giao', 'Đã có hàng', 'Hàng gia công',
];

export const CONSTRUCTION_STATUS_OPTIONS = [
  'Chưa thi công', 'Đang thi công', 'Đã hoàn thành',
];

export interface Task {
  id: string; stt: string; code: string; name: string;
  projectCode: string; projectName: string;
  volume: number; unit: string; progress: number;
  status: TaskStatus; purchaseStatus: string; constrStatus: string;
  issue?: string; issueStatus?: string; isDone: boolean;
  isSectionHeader?: boolean; sectionName?: string; parentId?: string;
  notes?: string; assignerId?: string; assignerName?: string;
  assignedEngineerId?: string; assignedEngineerName?: string;
  reviewerId?: string; reviewerName?: string;
  dueDate?: string; priority?: TaskPriority; createdAt?: string;
}

export interface Project {
  diagramUrl?: string; id: string; code: string; name: string;
  client?: string; location: string; contractValue?: number; notes?: string;
  progressPercent: number; status: 'active' | 'completed' | 'on_hold';
  activeTeams?: number; totalTasks: number; completedTasks: number;
  issueTasksCount: number; managerId?: string; memberIds?: string[];
  managerName: string; members?: string[];
  startDate?: string; endDate?: string;
}

export interface Material {
  id: string; stt?: number; code: string; name: string; englishName?: string;
  projectCode: string; projectName: string;
  volume: number; unit: string; unitPrice?: number; status: string; constrStatus?: string;
  supplier?: string; initialStock?: number; currentStock?: number;
  totalImport?: number; totalExport?: number; totalExpected?: number;
  category?: string; specs?: string; notes?: string; systemGroup?: string;
}

export interface InventoryTransaction {
  id: string; type: 'IMPORT' | 'EXPORT'; date: string;
  materialId: string; materialCode: string; materialName: string;
  specs?: string; category?: string; unit: string; quantity: number;
  sourceOrProject: string; receiverName?: string; notes?: string; createdAt: string;
}

export type IssueStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED';
export type IssuePriority = 'CRITICAL' | 'WARNING' | 'STANDARD';

export interface Issue {
  id: string; incidentCode: string; title: string;
  projectName: string; projectCode: string; location: string;
  reportedBy: string; reportedTime: string; description: string;
  photoUrl: string; status: IssueStatus; priority: IssuePriority;
  assignedTo: string; managerDirectives?: string;
  timelineLogs: Array<{ id: string; time: string; author: string; message: string; }>;
}

export interface Engineer {
  id: string; code?: string; name: string; title: string;
  role?: string; username?: string; password?: string; isLocked?: boolean;
  avatar: string; phone: string; email: string;
  managedProjects?: { code: string; name: string }[];
  memberProjects?: { code: string; name: string }[];
  projectCodes?: string[]; permissions?: Permission[];
}

export interface NotificationItem {
  id: string; title: string; message: string; timestamp: string;
  read: boolean; type: 'task_assigned' | 'issue_alert' | 'material_update' | 'system';
  icon?: string;
}

export interface ActivityLog {
  id: string; user: string; action: string; project: string;
  timestamp: string; icon: string; badgeBg: string; iconColor: string;
}

export interface ProjectMaterialPlan {
  id: string; parentId?: string; stt: string; projectCode: string;
  jobContent: string; unit: string; contractVolume: number;
  techSpecModel?: string; techSpecOrigin?: string; techSpecStatus?: string;
  progressStatus?: string; orderedVolume?: number; orderedStatus?: string;
  expectedDate?: string; issueContent?: string; issueStatus?: string;
  docCo?: boolean; docCq?: boolean; docFireInspection?: boolean;
  docStamp?: boolean; dispatchToSite?: boolean; dispatchDate?: string;
  supplyScope?: 'contractor' | 'owner' | 'unknown'; notes?: string;
}

export interface ProjectPurchasing {
  id: string; parentId?: string; materialPlanId?: string; stt: string;
  projectCode: string; content: string; unit: string;
  volumeContract: number; volumeOrder: number; unitPrice: number;
  vatRate: number; vatAmount: number; totalAmount: number;
  prepayPercent: number; prepayAmount: number; remainingAmount: number;
  orderStatus: string; contractStatus: string;
  paymentDate?: string; invoiceStatus?: string; notes?: string;
}

export interface ProjectExpense {
  id: string; stt: string; projectCode: string; date: string;
  content: string; description: string; spenderName?: string;
  unit: string; quantity: number; unitPrice: number;
  taxAmount?: number; totalAmount: number;
  incomeAmount?: number; balanceFund?: number;
  notes?: string; invoiceUrl?: string;
}

export interface LaborPayroll {
  id: string; stt: string; projectCode: string; date: string;
  content: string; description: string; workerName?: string;
  unit: string; quantity: number; unitPrice: number; totalAmount: number;
  bankAccount: string; bankInfo?: string;
  idCardFrontUrl?: string; idCardBackUrl?: string;
  paymentStatus: string; notes?: string;
}

export interface DocumentTrack {
  id: string; projectId?: string; stt: string;
  contractNo: string; contractName: string; projectCode?: string;
  company: string; receiverName: string; phone: string; address: string;
  sendDate: string; receiveDate?: string; docStatus: string;
  docType?: string; side?: string; contractValue: number;
  prepayPercent: number; prepayAmount: number; paymentStatus: string;
  isCompleted: boolean; notes?: string; fileUrls?: string[];
}

export interface FieldLog {
  id: string; projectCode: string; note: string;
  images: string[]; timestamp: string; taskId?: string;
}

// Status color helpers (mobile-compatible - return style objects instead of CSS classes)
export const getStatusColor = (status?: string): { bg: string; text: string; border: string } => {
  if (!status) return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
  const s = status.toLowerCase();
  if (s.includes('chưa') || s.includes('không')) return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  if (s.includes('đã') || s.includes('hoàn thành')) return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
  if (s.includes('đang')) return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
};

export const normalizeStatusText = (value?: string) => (value || '')
  .trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export const purchaseProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'khong co hang' || clean === 'chua dat hang') return 0;
  if (clean === 'dang dat hang') return 0.3;
  if (clean === 'da dat hang') return 0.6;
  if (clean === 'dang giao' || clean === 'dang giao hang') return 0.85;
  if (clean === 'da co hang' || clean === 'da nhan du' || clean === 'hang gia cong') return 1;
  return 0;
};

export const constructionProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'chua thi cong' || clean === 'dang vuong mac') return 0;
  if (clean === 'vuong mac') return 0.2;
  if (clean === 'da keo day' || clean === 'da lap thiet bi vao tu') return 0.2;
  if (clean === 'da lap tb + keo day') return 0.3;
  if (clean === 'dang ete') return 0.4;
  if (clean === 'dang thi cong') return 0.5;
  if (clean === 'da thi cong' || clean === 'da hoan thanh') return 1;
  return 0;
};

export const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);
