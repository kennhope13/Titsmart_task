export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Chờ vật tư' | 'Chờ khách hàng' | 'Chờ nghiệm thu' | 'Hoàn thành' | 'Tạm dừng' | 'Chờ nhận việc';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export const PURCHASE_STATUS_OPTIONS = [
  'Không có hàng',
  'Chưa đặt hàng',
  'Đang đặt hàng',
  'Đã đặt hàng',
  'Đang giao',
  'Đã có hàng',
  'Hàng gia công',
];

export const CONSTRUCTION_STATUS_OPTIONS = [
  'Chưa thi công',
  'Đang thi công',
  'Đã hoàn thành',
];

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
  parentId?: string; // ID của mục cha (nếu là mục con)
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
  managerId?: string;
  memberIds?: string[];
  managerName: string;
  members?: string[]; // Danh sách thành viên (ID)
  startDate?: string;
  endDate?: string;
}

export interface Material {
  id: string;
  stt?: number;
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
  totalExpected?: number;
  category?: string;
  specs?: string;
  notes?: string;
  systemGroup?: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'IMPORT' | 'EXPORT';
  date: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specs?: string;
  category?: string;
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
  code?: string;
  name: string;
  title: string;
  role?: string;
  username?: string;
  password?: string;
  isLocked?: boolean;
  avatar: string;
  phone: string;
  email: string;
  managedProjects?: { code: string; name: string }[];
  memberProjects?: { code: string; name: string }[];
  projectCodes?: string[];
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
  parentId?: string;
  stt: string;
  projectCode: string;
  jobContent: string;
  unit: string;
  contractVolume: number;
  techSpecModel?: string;
  techSpecOrigin?: string;
  techSpecStatus?: string;
  progressStatus?: string;
  orderedVolume?: number;
  orderedStatus?: string;
  expectedDate?: string;
  issueContent?: string;
  issueStatus?: string;
  docCo?: boolean;
  docCq?: boolean;
  docFireInspection?: boolean;
  docStamp?: boolean;
  dispatchToSite?: boolean;
  dispatchDate?: string;
  supplyScope?: 'contractor' | 'owner' | 'unknown';
  notes?: string;
}

export interface ProjectPurchasing {
  id: string;
  parentId?: string;
  materialPlanId?: string;
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
  spenderName?: string;
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
  projectId?: string;
  stt: string;
  contractNo: string;
  contractName: string;
  projectCode?: string;
  company: string;
  receiverName: string;
  phone: string;
  address: string;
  sendDate: string;
  receiveDate?: string;
  docStatus: string;
  docType?: string; // 'Giao' | 'Nhận'
  side?: string;
  contractValue: number;
  prepayPercent: number;
  prepayAmount: number;
  paymentStatus: string;
  isCompleted: boolean;
  notes?: string;
  fileUrls?: string[];
}

export interface FieldLog {
  id: string;
  projectCode: string;
  note: string;
  images: string[]; // URL ảnh (đường dẫn /uploads/...)
  timestamp: string; // Thời điểm tạo báo cáo
  taskId?: string;
}

export const getTextColorStyle = (status?: string) => {
  if (!status) return "text-slate-700";
  const s = status.toLowerCase();
  if (s.includes("chưa") || s.includes("không")) return "text-red-600";
  if (s.includes("đã")) return "text-emerald-600";
  if (s.includes("đang")) return "text-amber-600";
  return "text-slate-700";
};

export const getStatusColorStyle = (status?: string) => {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-600";
  const s = status.toLowerCase();
  if (s.includes("không có") || s.includes("vướng mắc") || s.includes("hủy") || s.includes("chưa đáp ứng") || s.includes("chưa ký") || s.includes("chưa xuất") || s.includes("không cần")) return "border-red-200 bg-red-50 text-red-700";
  if (s.includes("đã có hàng") || s.includes("đã nhận") || s.includes("đã thi công") || s.includes("hoàn thành") || s.includes("đã ký") || s.includes("đã xuất") || (s.includes("đáp ứng") && !s.includes("chưa"))) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s.includes("đang đặt") || s.includes("đang giao") || s.includes("đang trình") || s.includes("đang kiểm") || s.includes("ete") || s.includes("xem xét") || s.includes("đang thương thảo")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (s.includes("đã đặt hàng") || s.includes("đang thi công")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (s.includes("gia công")) return "border-purple-200 bg-purple-50 text-purple-700";
  if (s.includes("kéo dây") && !s.includes("lắp")) return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (s.includes("lắp thiết bị")) return "border-teal-200 bg-teal-50 text-teal-700";
  if (s.includes("tb + kéo dây")) return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export const normalizeStatusText = (value?: string) => (value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d");

export const purchaseProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === "khong co hang" || clean === "chua dat hang") return 0;
  if (clean === "dang dat hang") return 0.3;
  if (clean === "da dat hang") return 0.6;
  if (clean === "dang giao" || clean === "dang giao hang") return 0.85;
  if (clean === "da co hang" || clean === "da nhan du" || clean === "hang gia cong") return 1;
  return 0;
};

export const constructionProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === "chua thi cong" || clean === "dang vuong mac") return 0;
  if (clean === "vuong mac") return 0.2;
  if (clean === "da keo day" || clean === "da lap thiet bi vao tu") return 0.2;
  if (clean === "da lap tb + keo day") return 0.3;
  if (clean === "dang ete") return 0.4;
  if (clean === "dang thi cong") return 0.5;
  if (clean === "da thi cong" || clean === "da hoan thanh") return 1;
  return 0;
};

export const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);

export const calculateAutoProgressRatio = (purchaseStatus?: string, constrStatus?: string) =>
  calculateAutoProgressPercent(purchaseStatus, constrStatus) / 100;




export const ISSUE_STATUS_OPTIONS = ["Không có", "Chưa xử lý", "Đang xử lý", "Đã xử lý xong"] as const;

export const getIssueStatusColorStyle = (status?: string) => {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-600";
  const s = status.toLowerCase();
  if (s === "chưa xử lý") return "border-red-200 bg-red-50 text-red-700";
  if (s === "đang xử lý") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "đã xử lý xong") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "không có") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-600";
};
