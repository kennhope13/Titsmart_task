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
  DocumentTrack,
  FieldLog
} from '../types';
import { api } from './apiSupabase';
import { AuthUser, useAuthStore } from './authStore';

const getAuthUser = () => {
  try {
    const raw = localStorage.getItem('titsmart_auth_session');
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch {
    return null;
  }
};

const getAuditFields = () => {
  const user = getAuthUser();
  return {
    updatedBy: user?.name || user?.username || 'Hệ thống',
    updatedAt: new Date().toISOString(),
  };
};

const filterByProject = (items: any[], codeField: string) => {
  const user = getAuthUser();
  if (!user || !Array.isArray(items)) return items;

  // Admin & PM luôn xem được tất cả dự án
  if (
    user.username === 'admin' ||
    user.role === 'admin' ||
    user.role === 'pm' ||
    user.role === 'Quản trị viên' ||
    user.role === 'Quản lý dự án'
  ) {
    return items;
  }

  const assigned = Array.isArray(user.projectCodes) ? user.projectCodes : [];
  // Nếu chưa gán dự án nào trong mảng (mảng rỗng) → không xem dự án nào trừ các mục chung
  const assignedUpper = assigned.map(a => String(a || '').trim().toUpperCase()).filter(Boolean);
  const userEngId = (user as any).id || '';
  const userNameUpper = String(user.name || '').trim().toUpperCase();

  return items.filter(item => {
    // Check if user is explicit member/manager of this project item
    if (userEngId && Array.isArray(item.members) && item.members.includes(userEngId)) return true;
    if (userEngId && Array.isArray(item.memberIds) && item.memberIds.includes(userEngId)) return true;
    if (userNameUpper && item.managerName && String(item.managerName).toUpperCase().includes(userNameUpper)) return true;

    const val = String(item[codeField] || '').trim().toUpperCase();
    const itemId = String(item.id || '').trim().toUpperCase();
    const itemCode = String(item.code || '').trim().toUpperCase();
    const itemName = String(item.name || '').trim().toUpperCase();

    // Cho phép hiển thị các hồ sơ/mục chung nội bộ không gán mã dự án cụ thể hoặc mã COMPANY
    if (codeField !== 'code' && (!val || val === 'COMPANY' || val === 'OFFICE' || val === 'KHÁC')) return true;

    if (assignedUpper.length === 0) return false;

    return assignedUpper.some(assigned => {
      if (!assigned) return false;
      return (val && (val === assigned || assigned.includes(val) || val.includes(assigned))) || 
             (itemId && (itemId === assigned || assigned.includes(itemId) || itemId.includes(assigned))) || 
             (itemCode && (itemCode === assigned || assigned.includes(itemCode) || itemCode.includes(assigned))) ||
             (itemName && (itemName === assigned || assigned.includes(itemName) || itemName.includes(assigned)));
    });
  });
};
import { supabase } from '../lib/supabase';
import inventorySeedData from './inventorySeedData.json';

const inventorySeed = inventorySeedData as {
  materials: Material[];
  inventoryTransactions: InventoryTransaction[];
};

const seedMaterialsForProject = (projectId?: string) => (
  projectId
    ? inventorySeed.materials.filter((material) => material.projectCode === projectId)
    : inventorySeed.materials
);

const mergeMaterialsWithSeed = (materials: Material[], projectId?: string) => {
  const seen = new Set(materials.flatMap((material) => [
    material.id,
    material.code?.toLowerCase(),
  ].filter(Boolean)));

  const seed = seedMaterialsForProject(projectId).filter((material) => (
    !seen.has(material.id) && !seen.has(material.code.toLowerCase())
  ));

  return [...materials, ...seed];
};

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

const taskStatusFromProgress = (t: Pick<Task, 'isSectionHeader' | 'issue' | 'issueStatus' | 'status' | 'progress'>, progress: number): TaskStatus => {
  if (t.isSectionHeader) return 'Chưa làm';
  const isComplete = progress >= 1;
  if (isComplete || t.status === 'Hoàn thành') return 'Hoàn thành';
  if (t.issueStatus === 'OPEN' || t.issueStatus === 'PROCESSING') return 'Chờ nghiệm thu';
  return t.progress > 0 ? 'Đang làm' : 'Chưa làm';
};

const withAutoProgress = (task: Task): Task => {
  if (task.isSectionHeader) {
    const isComplete = task.progress >= 1;
    return { ...task, isDone: isComplete, status: isComplete ? 'Hoàn thành' : 'Chưa làm' };
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
  lastMutationTime: number;
  markMutation: () => void;
  isFetchingProjects: boolean;
  // State
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
  fieldLogs: FieldLog[];

  // Fetch Actions
  fetchProjects: () => Promise<void>;
  fetchTasks: (projectId?: string) => Promise<void>;
  fetchMaterials: (projectId?: string) => Promise<void>;
  fetchIssues: (projectId?: string) => Promise<void>;
  fetchEngineers: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
  fetchAccounting: () => Promise<void>;
  fetchFieldLogs: () => Promise<void>;

  // Actions
  addTask: (task: Omit<Task, 'id'>) => Promise<string | undefined>;
  addTasksBatch: (tasks: Omit<Task, 'id'>[]) => Promise<void>;
  updateTask: (id: string, updatedFields: Partial<Task>) => void;
  updateTaskProgress: (id: string, progress: number, isDone: boolean) => void;
  assignEngineer: (taskId: string, engineerId: string, engineerName: string) => void;
  addEngineer: (engineer: Omit<Engineer, 'id'>) => Engineer;
  createEngineer: (input: { name: string; phone?: string; email?: string; title?: string; role?: string; username?: string; password?: string; isLocked?: boolean; projectCodes?: string[]; permissions?: import('../types').Permission[] }) => Promise<Engineer>;
  updateEngineer: (id: string, input: { name: string; phone?: string; title?: string; role?: string; username?: string; password?: string; isLocked?: boolean; projectCodes?: string[]; permissions?: import('../types').Permission[] }) => Promise<Engineer>;
  deleteEngineer: (id: string) => Promise<void>;
  deleteTask: (id: string) => void;

  addMaterial: (mat: Omit<Material, 'id'>) => Promise<Material | void>;
  addMaterialsBatch: (mats: Omit<Material, 'id'>[]) => Promise<Material[]>;
  updateMaterial: (id: string, updatedFields: Partial<Material>) => void;
  updateMaterialStatus: (id: string, status: string) => void;
  deleteMaterial: (id: string) => void;
  setMaterials: (materials: Material[]) => void;

  addInventoryTransaction: (transaction: Omit<InventoryTransaction, 'id' | 'createdAt'>) => Promise<void>;
  addInventoryTransactionsBatch: (transactions: Omit<InventoryTransaction, 'id' | 'createdAt'>[]) => Promise<void>;

  addIssue: (issue: Omit<Issue, 'id'>) => void;
  updateIssueStatus: (id: string, status: IssueStatus) => void;
  addDirective: (issueId: string, directive: string) => void;

  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addProject: (proj: Omit<Project, 'id'>) => Promise<Project | undefined>;
  updateProject: (id: string, proj: Partial<Project>) => Promise<Project | undefined>;
  deleteProject: (id: string) => Promise<void>;

  // New Actions
  addMaterialPlan: (plan: Omit<ProjectMaterialPlan, 'id'> & { id?: string }, skipLog?: boolean) => Promise<string | undefined>;
  addMaterialPlansBatch: (plans: (Omit<ProjectMaterialPlan, 'id'> & { id?: string })[]) => Promise<ProjectMaterialPlan[]>;
  updateMaterialPlan: (id: string, fields: Partial<ProjectMaterialPlan>) => Promise<void>;
  deleteMaterialPlan: (id: string) => Promise<void>;
  addPurchasingPlan: (plan: Omit<ProjectPurchasing, 'id'> & { id?: string }, skipLog?: boolean) => Promise<string | undefined>;
  addPurchasingsBatch: (plans: (Omit<ProjectPurchasing, 'id'> & { id?: string })[]) => Promise<ProjectPurchasing[]>;
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
  
  addFieldLog: (input: { projectCode: string; note?: string; images: string[] }) => Promise<void>;
  deleteFieldLog: (id: string) => Promise<void>;
  updateFieldLog: (id: string, input: { note?: string; images?: string[]; existingImages?: string[] }) => Promise<void>;
  logActivity: (action: string, project: string, user?: string) => void;
}

const STORAGE_KEY = 'buildcore_pro_excel_db_v7';


const normalizeVietnamese = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase();

const isTempMaterialRef = (value?: string) => {
  const text = String(value || '').toLowerCase();
  return !text || text.startsWith('mat-temp-');
};

const findMaterialIndexForTransaction = (materials: Material[], txData: Partial<InventoryTransaction>) => (
  materials.findIndex((m) => {
    if (txData.materialId && !isTempMaterialRef(txData.materialId) && m.id === txData.materialId) return true;
    if (txData.materialCode && !isTempMaterialRef(txData.materialCode) && m.code.toLowerCase() === txData.materialCode.toLowerCase()) return true;

    const normName = normalizeVietnamese(m.name);
    const normSpecs = normalizeVietnamese(m.specs || m.englishName || '');
    const normTxName = normalizeVietnamese(txData.materialName || '');
    const normTxSpecs = normalizeVietnamese(txData.specs || '');
    return Boolean(normTxName) && normName === normTxName && normSpecs === normTxSpecs;
  })
);

const mergeInventoryTransactionIntoState = (
  materials: Material[],
  inventoryTransactions: InventoryTransaction[],
  txData: Omit<InventoryTransaction, 'id' | 'createdAt'>,
  persisted?: { material?: Material; transaction?: InventoryTransaction }
) => {
  const newTransaction: InventoryTransaction = persisted?.transaction || {
    ...txData,
    id: 'inv-' + Date.now(),
    createdAt: new Date().toISOString(),
  };

  let nextMats = [...materials];

  // Tìm vật tư trong local state theo thông tin từ DB (sau khi API trả về)
  let materialIndex = findMaterialIndexForTransaction(nextMats, persisted?.material ? {
    materialId: persisted.material.id,
    materialCode: persisted.material.code,
    materialName: persisted.material.name,
    specs: persisted.material.specs || persisted.material.englishName || '',
  } : txData);

  // Fallback: nếu không tìm thấy theo thông tin DB, thử tìm bằng ID gốc từ request
  // (tránh trường hợp vật tư seed có id='mat-xxx' không khớp UUID từ DB)
  if (materialIndex < 0 && persisted?.material && txData.materialId) {
    materialIndex = nextMats.findIndex((m) => m.id === txData.materialId);
  }

  if (persisted?.material) {
    nextMats = materialIndex >= 0
      // Cập nhật bản ghi hiện có (kể cả khi ID local khác UUID từ DB) với data mới nhất từ server
      ? nextMats.map((m, index) => index === materialIndex ? { ...m, ...persisted.material } : m)
      // Vật tư hoàn toàn mới (chưa có trong local state) — thêm vào đầu
      : [persisted.material, ...nextMats];
  } else if (materialIndex >= 0) {
    const matchedMat = nextMats[materialIndex];
    const totalImport = (matchedMat.totalImport || 0) + (txData.type === 'IMPORT' ? txData.quantity : 0);
    const totalExport = (matchedMat.totalExport || 0) + (txData.type === 'EXPORT' ? txData.quantity : 0);
    const currentStock = (matchedMat.initialStock || 0) + totalImport - totalExport;

    nextMats = nextMats.map((m, index) => index === materialIndex ? {
      ...m,
      totalImport,
      totalExport,
      currentStock,
    } : m);
  }

  const txMaterial = persisted?.material || nextMats[materialIndex];
  const finalTx: InventoryTransaction = txMaterial ? {
    ...newTransaction,
    materialId: txMaterial.id,
    materialCode: txMaterial.code,
    materialName: txMaterial.name,
    category: txMaterial.category || newTransaction.category || '',
    specs: txMaterial.specs || txMaterial.englishName || newTransaction.specs || '',
    unit: txMaterial.unit || newTransaction.unit || 'Cái',
  } : newTransaction;

  return {
    materials: nextMats,
    inventoryTransactions: [finalTx, ...inventoryTransactions],
  };
};

const deriveSupplyScope = (plan: any): 'contractor' | 'owner' | 'unknown' => {
  const explicit = plan.supplyScope ?? plan.supply_scope;
  if (explicit === 'contractor' || explicit === 'owner') return explicit;
  const text = normalizeVietnamese([plan.notes, plan.jobContent, plan.job_content, plan.content].filter(Boolean).join(' '));
  return 'unknown';
};

const normalizeMaterialPlan = (plan: any): ProjectMaterialPlan => ({
  id: plan.id,
  projectCode: plan.projectCode || plan.project?.code || '',
  stt: plan.stt || '',
  jobContent: plan.jobContent ?? plan.job_content ?? '',
  unit: plan.unit || '',
  contractVolume: Number(plan.contractVolume ?? plan.contract_volume ?? 0),
  techSpecModel: plan.techSpecModel ?? plan.tech_spec_model ?? '',
  techSpecOrigin: plan.techSpecOrigin ?? plan.tech_spec_origin ?? '',
  techSpecStatus: plan.techSpecStatus ?? plan.tech_spec_status ?? '',
  progressStatus: plan.progressStatus ?? plan.progress_status ?? '',
  orderedVolume: Number(plan.orderedVolume ?? plan.ordered_volume ?? 0),
  orderedStatus: plan.orderedStatus ?? plan.ordered_status ?? '',
  expectedDate: plan.expectedDate ?? plan.expected_date ?? '',
  issueContent: plan.issueContent ?? plan.issue_content ?? '',
  issueStatus: plan.issueStatus ?? plan.issue_status ?? '',
  docCo: Boolean(plan.docCo ?? plan.docCO ?? plan.doc_co ?? false),
  docCq: Boolean(plan.docCq ?? plan.docCQ ?? plan.doc_cq ?? false),
  docFireInspection: Boolean(plan.docFireInspection ?? plan.doc_fire_inspection ?? false),
  dispatchToSite: Boolean(plan.dispatchToSite ?? plan.dispatch_to_site ?? false),
  dispatchDate: plan.dispatchDate ?? plan.dispatch_date ?? '',
  supplyScope: deriveSupplyScope(plan),
  notes: plan.notes || '',
  parentId: plan.parentId ?? plan.parent_id ?? undefined,
  updatedBy: plan.updatedBy ?? plan.updated_by ?? undefined,
  updatedAt: plan.updatedAt ?? plan.updated_at ?? undefined,
});

const normalizePurchasingPlan = (plan: any): ProjectPurchasing => ({
  id: plan.id,
  projectCode: plan.projectCode || plan.project?.code || '',
  stt: plan.stt || '',
  content: plan.content || '',
  unit: plan.unit || '',
  volumeContract: Number(plan.volumeContract ?? plan.volume_contract ?? 0),
  volumeOrder: Number(plan.volumeOrder ?? plan.volume_order ?? 0),
  unitPrice: Number(plan.unitPrice ?? plan.unit_price ?? 0),
  vatRate: Number(plan.vatRate ?? plan.vat_rate ?? 0),
  vatAmount: Number(plan.vatAmount ?? plan.vat_amount ?? 0),
  totalAmount: Number(plan.totalAmount ?? plan.total_amount ?? 0),
  prepayPercent: Number(plan.prepayPercent ?? plan.prepay_percent ?? 0),
  prepayAmount: Number(plan.prepayAmount ?? plan.prepay_amount ?? 0),
  remainingAmount: Number(plan.remainingAmount ?? plan.remaining_amount ?? 0),
  orderStatus: plan.orderStatus ?? plan.order_status ?? '',
  contractStatus: plan.contractStatus ?? plan.contract_status ?? '',
  paymentDate: plan.paymentDate ?? plan.payment_date ?? '',
  invoiceStatus: plan.invoiceStatus ?? plan.invoice_status ?? '',
  notes: plan.notes || '',
  parentId: plan.parentId ?? plan.parent_id ?? undefined,
  updatedBy: plan.updatedBy ?? plan.updated_by ?? undefined,
  updatedAt: plan.updatedAt ?? plan.updated_at ?? undefined,
});

const normalizeExpense = (exp: any): ProjectExpense => ({
  id: exp.id,
  projectCode: exp.projectCode || exp.project?.code || '',
  stt: exp.stt || '',
  date: exp.date ?? exp.expenseDate ?? exp.expense_date ?? '',
  content: exp.content || '',
  description: exp.description || '',
  spenderName: exp.spenderName ?? exp.spender_name ?? '',
  unit: exp.unit || '',
  quantity: Number(exp.quantity || 0),
  unitPrice: Number(exp.unitPrice ?? exp.unit_price ?? 0),
  taxAmount: Number(exp.taxAmount ?? exp.tax_amount ?? 0),
  totalAmount: Number(exp.totalAmount ?? exp.total_amount ?? 0),
  incomeAmount: Number(exp.incomeAmount ?? exp.income_amount ?? 0),
  balanceFund: Number(exp.balanceFund ?? exp.balance_fund ?? 0),
  notes: exp.notes || '',
  invoiceUrl: exp.invoiceUrl ?? exp.invoice_url ?? '',
  updatedBy: exp.updatedBy ?? exp.updated_by ?? undefined,
  updatedAt: exp.updatedAt ?? exp.updated_at ?? undefined,
});

const normalizeLaborPayroll = (lab: any): LaborPayroll => ({
  id: lab.id,
  projectCode: lab.projectCode || lab.project?.code || '',
  stt: lab.stt || '',
  date: lab.date ?? lab.payrollDate ?? lab.payroll_date ?? '',
  workerName: lab.workerName ?? lab.worker_name ?? '',
  content: lab.content || '',
  description: lab.description || '',
  unit: lab.unit || '',
  quantity: Number(lab.quantity || 0),
  unitPrice: Number(lab.unitPrice ?? lab.unit_price ?? 0),
  totalAmount: Number(lab.totalAmount ?? lab.total_amount ?? 0),
  bankAccount: lab.bankAccount ?? lab.bank_account ?? '',
  bankInfo: lab.bankInfo ?? lab.bank_info ?? '',
  idCardFrontUrl: lab.idCardFrontUrl ?? lab.id_card_front_url ?? '',
  idCardBackUrl: lab.idCardBackUrl ?? lab.id_card_back_url ?? '',
  paymentStatus: lab.paymentStatus ?? lab.payment_status ?? '',
  notes: lab.notes || '',
  updatedBy: lab.updatedBy ?? lab.updated_by ?? undefined,
  updatedAt: lab.updatedAt ?? lab.updated_at ?? undefined,
});

const normalizeDocumentTrack = (doc: any): DocumentTrack => ({
  id: doc.id,
  projectId: doc.projectId ?? doc.project_id ?? undefined,
  projectCode: doc.projectCode || doc.project?.code || '',
  stt: doc.stt || '',
  contractNo: doc.contractNo ?? doc.contract_no ?? '',
  contractName: doc.contractName ?? doc.contract_name ?? '',
  company: doc.company || '',
  receiverName: doc.receiverName ?? doc.receiver_name ?? '',
  phone: doc.phone || '',
  address: doc.address || '',
  sendDate: doc.sendDate ?? doc.send_date ?? '',
  receiveDate: doc.receiveDate ?? doc.receive_date ?? '',
  docStatus: doc.docStatus ?? doc.doc_status ?? '',
  side: doc.side || '',
  contractValue: Number(doc.contractValue ?? doc.contract_value ?? 0),
  prepayPercent: Number(doc.prepayPercent ?? doc.prepay_percent ?? 0),
  prepayAmount: Number(doc.prepayAmount ?? doc.prepay_amount ?? 0),
  paymentStatus: doc.paymentStatus ?? doc.payment_status ?? '',
  isCompleted: !!(doc.isCompleted ?? doc.is_completed ?? false),
  notes: doc.notes || '',
  fileUrls: doc.fileUrls ?? doc.file_urls ?? [],
  docType: doc.docType ?? doc.doc_type ?? 'Giao',
  updatedBy: doc.updatedBy ?? doc.updated_by ?? undefined,
  updatedAt: doc.updatedAt ?? doc.updated_at ?? undefined,
});

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
    // Only persist lightweight session keys to localStorage to prevent QuotaExceeded / OOM renderer crash
    const lightweightSaved = {
      projects: newState.projects !== undefined ? newState.projects : current.projects,
      notifications: newState.notifications !== undefined ? newState.notifications : current.notifications,
      engineers: newState.engineers !== undefined ? newState.engineers : current.engineers,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightSaved));
      channel?.postMessage({ type: 'SYNC_STATE' });
    } catch (e) {
      console.warn('[Storage] Skipped localStorage write to prevent quota crash:', e);
    }
  };

  const loadSavedState = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const savedState = loadSavedState();

  return {
    lastMutationTime: 0,
    markMutation: () => set({ lastMutationTime: Date.now() }),
    isFetchingProjects: true, // default to true
    projects: savedState.projects || [],
    tasks: savedState.tasks || [],
    materials: savedState.materials || inventorySeed.materials,
    issues: savedState.issues || [],
    engineers: savedState.engineers || [],
    notifications: savedState.notifications || [],
    activityLogs: savedState.activityLogs || [],
    inventoryTransactions: savedState.inventoryTransactions || inventorySeed.inventoryTransactions,
    materialPlans: savedState.materialPlans || [],
    purchasingPlans: savedState.purchasingPlans || [],
    expenses: savedState.expenses || [],
    laborPayrolls: savedState.laborPayrolls || [],
    documentTracks: savedState.documentTracks || [],
    fieldLogs: savedState.fieldLogs || [],

    fetchProjects: async () => {
      try {
        if (get().projects.length === 0) {
          set({ isFetchingProjects: true });
        }
        const projects = await api.projects.getAll();
        // Lọc bỏ project nội bộ "Kho Công Ty" và "Văn phòng" khỏi danh sách dự án
        let filtered = Array.isArray(projects)
          ? projects.filter((p: any) => p.code !== 'COMPANY' && p.code !== 'OFFICE')
          : projects;
        
        filtered = filterByProject(filtered, 'code');
        set({ projects: filtered, isFetchingProjects: false });
      } catch (e) {
        console.error('Failed to fetch projects', e);
        set({ isFetchingProjects: false });
      }
    },

    fetchTasks: async (projectId) => {
      const fetchStartTime = Date.now();
      try {
        const tasks = await api.tasks.getAll(projectId);
        const currentTasksMap = new Map(get().tasks.map(t => [t.id, t]));
        const mergedTasks = filterByProject(tasks, 'projectCode').map((t: any) => {
          const existing = currentTasksMap.get(t.id);
          return {
            ...t,
            updatedBy: t.updatedBy || existing?.updatedBy,
            updatedAt: t.updatedAt || existing?.updatedAt,
          };
        });
        // Bảo vệ: không ghi đè nếu có mutation trong vòng 5 giây gần nhất
        const mutationGuard = get().lastMutationTime + 5000;
        if (mutationGuard > fetchStartTime) {
          console.log('[Realtime] Skipping tasks overwrite because local mutation occurred recently');
        } else {
          set({ tasks: mergedTasks });
        }
      } catch (e) {
        console.error('Failed to fetch tasks', e);
      }
    },

    fetchMaterials: async (projectId) => {
      try {
        const [materials, inventoryTransactions] = await Promise.all([
          api.materials.getAll(projectId),
          api.materials.getTransactions(),
        ]);
        let mats = mergeMaterialsWithSeed(Array.isArray(materials) ? materials : [], projectId);
        mats = filterByProject(mats, 'projectCode');
        set({
          materials: mats,
          inventoryTransactions: Array.isArray(inventoryTransactions) ? inventoryTransactions : get().inventoryTransactions,
        });
      } catch (e) {
        console.error('Failed to fetch materials', e);
        set({ materials: seedMaterialsForProject(projectId) });
      }
    },

    fetchIssues: async (projectId) => {
      try {
        const issues = await api.issues.getAll(projectId);
        set({ issues: filterByProject(issues, 'projectCode') });
      } catch (e) {
        console.error('Failed to fetch issues', e);
      }
    },

    fetchEngineers: async () => {
      try {
        const rawEngineers = await api.engineers.getAll();
        const engineers = rawEngineers.map((e: any) => {
          const codes = e.projectCodes || e.project_codes || [];
          const uniqueCodes = Array.from(new Set(Array.isArray(codes) ? codes : []));
          return { ...e, projectCodes: uniqueCodes };
        });

        set({ engineers });

        // Sync authStore if the logged-in user is updated
        const authStore = useAuthStore.getState();
        const currentUser = authStore.user;
        if (currentUser) {
          const matchedEngineer = engineers.find(
            (e: any) =>
              (e.email && e.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
              (e.username && e.username.toLowerCase() === currentUser.username?.toLowerCase())
          );
          if (matchedEngineer) {
            // Log the user out immediately if their account was locked by an Admin
            if (matchedEngineer.isLocked || matchedEngineer.is_locked) {
              authStore.logout();
              window.location.href = '/login';
              return;
            }

            const updatedUser = {
              ...currentUser,
              id: matchedEngineer.id || currentUser.id,
              projectCodes: matchedEngineer.projectCodes || [],
              permissions: matchedEngineer.permissions || currentUser.permissions,
              role: matchedEngineer.role === 'Quản trị viên' ? 'admin' :
                    matchedEngineer.role === 'Quản lý dự án' ? 'pm' :
                    matchedEngineer.role === 'Kỹ sư hiện trường' ? 'engineer' : 'staff',
              name: matchedEngineer.name || currentUser.name,
              title: matchedEngineer.title || currentUser.title,
            };
            
            // Only update if there's an actual change in projectCodes, permissions or role to avoid infinite loops
            if (JSON.stringify(currentUser.projectCodes) !== JSON.stringify(updatedUser.projectCodes) ||
                JSON.stringify(currentUser.permissions) !== JSON.stringify(updatedUser.permissions) ||
                currentUser.role !== updatedUser.role) {
              authStore.updateUser(updatedUser);
            }
          } else if (currentUser.username !== 'admin' && currentUser.email !== 'admin@titsmart.vn') {
            // User was deleted from the database!
            authStore.logout();
            window.location.href = '/login';
          }
        }
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

    fetchFieldLogs: async () => {
      try {
        const fieldLogs = await api.fieldLogs.getAll();
        set({ fieldLogs: filterByProject(fieldLogs, 'projectCode') });
      } catch (e) {
        console.error('Failed to fetch field logs', e);
      }
    },

    fetchAccounting: async () => {
      const fetchStartTime = Date.now();
      const nextState: any = {};

      // Tải từng bảng độc lập để 1 bảng lỗi không ảnh hưởng bảng khác
      try {
        const materialPlans = await api.accounting.getMaterialPlans();
        const mutationGuardMP = get().lastMutationTime + 5000;
        if (mutationGuardMP > fetchStartTime) {
          console.log('[Realtime] Skipping materialPlans overwrite because local mutation occurred recently');
        } else if (Array.isArray(materialPlans)) {
          nextState.materialPlans = filterByProject(materialPlans.map(normalizeMaterialPlan), 'projectCode');
        }
        console.log('[Accounting] Loaded material_plans:', materialPlans?.length || 0);
      } catch (e) { console.error('[Accounting] Failed material_plans', e); }

      try {
        const purchasingPlans = await api.accounting.getPurchasings();
        const mutationGuardPP = get().lastMutationTime + 5000;
        if (mutationGuardPP > fetchStartTime) {
          console.log('[Realtime] Skipping purchasingPlans overwrite because local mutation occurred recently');
        } else if (Array.isArray(purchasingPlans)) {
          nextState.purchasingPlans = filterByProject(purchasingPlans.map(normalizePurchasingPlan), 'projectCode');
        }
        console.log('[Accounting] Loaded purchasing_plans:', purchasingPlans?.length || 0);
      } catch (e) { console.error('[Accounting] Failed purchasing_plans', e); }

      try {
        const expenses = await api.accounting.getExpenses();
        if (Array.isArray(expenses)) nextState.expenses = filterByProject(expenses, 'projectCode');
      } catch (e) { console.error('[Accounting] Failed expenses', e); }

      try {
        const laborPayrolls = await api.accounting.getLaborPayrolls();
        if (Array.isArray(laborPayrolls)) nextState.laborPayrolls = filterByProject(laborPayrolls, 'projectCode');
      } catch (e) { console.error('[Accounting] Failed labor_payrolls', e); }

      try {
        const documentTracks = await api.accounting.getDocumentTracks();
        if (Array.isArray(documentTracks)) nextState.documentTracks = filterByProject(documentTracks, 'projectCode');
      } catch (e) { console.error('[Accounting] Failed document_tracks', e); }

      if (Object.keys(nextState).length > 0) {
        set(nextState);
        persistAndNotify(nextState);
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
        return createdTask.id;
      } catch (e) {
        console.error('Failed to add task', e);
        return undefined;
      }
    },

    addTasksBatch: async (batchData) => {
      try {
        const createdTasks = await api.tasks.createBatch(batchData);
        set((state) => {
          const nextTasks = [...createdTasks, ...state.tasks];
          const changedProjectCodes = Array.from(new Set(createdTasks.map((task: any) => task.projectCode)));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, changedProjectCodes);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        if (createdTasks.length > 0) {
          get().logActivity(`Đã nhập khẩu ${createdTasks.length} hạng mục công việc từ file Excel`, createdTasks[0].projectName || 'Tiến độ', 'Excel Sync');
        }
      } catch (e: any) {
        console.error('Failed to add tasks batch', e);
        alert('Lỗi DB khi lưu Công việc: ' + (e.message || JSON.stringify(e)));
      }
    },

    updateTask: async (id, updatedFields) => {
      get().markMutation();
      const audit = getAuditFields();
      const fieldsWithAudit = {
        updatedBy: audit.updatedBy,
        updatedAt: audit.updatedAt,
        ...updatedFields,
      };

      // Optimistic update
      set((state) => {
        const nextTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...fieldsWithAudit } : t));
        const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, state.tasks.find(t=>t.id===id)?.projectCode ? [state.tasks.find(t=>t.id===id)!.projectCode] : []);
        persistAndNotify({ tasks: nextTasks, projects: nextProjects });
        return { tasks: nextTasks, projects: nextProjects };
      });
      try {
        const updatedTask = await api.tasks.update(id, fieldsWithAudit);
        const mergedTask = {
          ...updatedTask,
          updatedBy: updatedTask.updatedBy || audit.updatedBy,
          updatedAt: updatedTask.updatedAt || audit.updatedAt,
        };
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === id ? mergedTask : t));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, [mergedTask.projectCode]);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        get().logActivity('Đã chỉnh sửa thông tin công việc', mergedTask.projectName || mergedTask.projectCode);
      } catch (e) {
        console.error('Failed to update task', e);
      }
    },

    updateTaskProgress: async (id, progress, isDone) => {
      get().markMutation();
      const audit = getAuditFields();
      const fieldsWithAudit = {
        progress,
        isDone,
        status: (isDone ? 'Done' : progress > 0 ? 'In Progress' : 'Not Started') as TaskStatus,
        updatedBy: audit.updatedBy,
        updatedAt: audit.updatedAt,
      };

      // Optimistic update
      set((state) => {
        const nextTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...fieldsWithAudit } : t));
        const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, state.tasks.find(t=>t.id===id)?.projectCode ? [state.tasks.find(t=>t.id===id)!.projectCode] : []);
        persistAndNotify({ tasks: nextTasks, projects: nextProjects });
        return { tasks: nextTasks, projects: nextProjects };
      });
      try {
        const updatedTask = await api.tasks.update(id, fieldsWithAudit);
        const mergedTask = {
          ...updatedTask,
          updatedBy: updatedTask.updatedBy || audit.updatedBy,
          updatedAt: updatedTask.updatedAt || audit.updatedAt,
        };
        set((state) => {
          const nextTasks = state.tasks.map((t) => (t.id === id ? mergedTask : t));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, [mergedTask.projectCode]);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
        });
        get().logActivity(`Đã cập nhật tiến độ thi công thành ${Math.round(progress * 100)}%`, mergedTask.projectName || mergedTask.projectCode);
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
          persistAndNotify({ tasks: nextTasks });
          return { tasks: nextTasks };
        });
        get().logActivity(`Phân công: Giao hạng mục "${updatedTask.name}" cho ${engineerName}`, updatedTask.projectName || updatedTask.projectCode);
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

    createEngineer: async (input) => {
      const created = await api.engineers.create({
          role: input.role,
          username: input.username,
          password: input.password,
          isLocked: input.isLocked,
        name: input.name,
        phone: input.phone,
        email: input.email,
        title: input.title,
        projectCodes: input.projectCodes,
          permissions: input.permissions,
      });
      // Nạp lại danh sách để đồng bộ managedProjects và id thật từ DB
      const engineers = await api.engineers.getAll();
      set(() => {
        persistAndNotify({ engineers });
        return { engineers };
      });
      get().logActivity('Đã thêm nhân sự: ' + input.name, input.name);
      return created;
    },

    updateEngineer: async (id, input) => {
      const existing = get().engineers.find(e => e.id === id);
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.username !== undefined) updateData.username = input.username;
      if (input.password !== undefined) updateData.password = input.password;
      if (input.isLocked !== undefined) updateData.isLocked = input.isLocked;
      
      if (input.projectCodes !== undefined) {
        updateData.projectCodes = input.projectCodes;
      } else if (existing?.projectCodes) {
        updateData.projectCodes = existing.projectCodes;
      }
      
      if (input.permissions !== undefined) {
        updateData.permissions = input.permissions;
      } else if (existing?.permissions) {
        updateData.permissions = existing.permissions;
      }

      const updated = await api.engineers.update(id, updateData);
      set((state) => {
        const nextEngineers = state.engineers.map((eng) => (eng.id === id ? { ...eng, ...updated } : eng));
        persistAndNotify({ engineers: nextEngineers });
        return { engineers: nextEngineers };
      });
      await get().fetchEngineers();
      get().logActivity('Đã cập nhật nhân sự: ' + (input.name || existing?.name || id), input.name || existing?.name || id);
      return updated;
    },

    deleteEngineer: async (id) => {
      await api.engineers.delete(id);
      const engineers = await api.engineers.getAll();
      set(() => {
        persistAndNotify({ engineers });
        return { engineers };
      });
      get().logActivity('Đã xóa nhân sự', 'Hệ thống');
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

    addMaterial: async (matData) => {
      try {
        const newMat: Material = {
          ...matData,
          id: 'mat-' + Date.now(),
        };
        
        let created = newMat;
        if (api.materials && (api.materials as any).create) {
           created = await (api.materials as any).create(newMat);
        }
        
        set((state) => {
          const nextMats = [created, ...state.materials];
          persistAndNotify({ materials: nextMats });
          return { materials: nextMats };
        });
        return created;
      } catch (e) {
        console.error('Failed to add material', e);
      }
    },

    addMaterialsBatch: async (matsData) => {
      try {
        const newMats = matsData.map((mat, index) => ({
          ...mat,
          id: 'mat-' + Date.now() + '-' + index,
        }));
        
        let createdMats = newMats;
        if (api.materials) {
          try {
            if ((api.materials as any).createBatch) {
              // Gửi mảng đúng thứ tự gốc (từ trên xuống dưới) cho backend.
              const result = await (api.materials as any).createBatch(newMats);
              if (Array.isArray(result) && result.length > 0) {
                createdMats = result;
              }
            } else {
              throw new Error("No createBatch method");
            }
          } catch (err) {
            console.warn('Backend createBatch failed, falling back to individual creates.', err);
            // Fallback to creating one by one from top to bottom
            if ((api.materials as any).create) {
              const results = [];
              for (const mat of newMats) {
                try {
                  const res = await (api.materials as any).create(mat);
                  results.push(res || mat);
                } catch (singleErr) {
                  console.error('Failed to create material individually', singleErr);
                  results.push(mat);
                }
              }
              createdMats = results;
            }
          }
        }
        
        set((state) => {
          // newMats are already in Top-To-Bottom order.
          // By spreading newMats before state.materials, the whole batch is inserted at the top in the correct order!
          const nextMats = [...createdMats, ...state.materials];
          get().logActivity('Thêm mới vật tư: ' + (createdMats.map(m=>m.name).join(', ') || 'Nhiều vật tư'), 'COMPANY');
          persistAndNotify({ materials: nextMats });
          return { materials: nextMats };
        });
        return createdMats;
      } catch (e) {
        console.error('Failed to add batch of materials', e);
        return [];
      }
    },

    updateMaterial: async (id, updatedFields) => {
      get().markMutation();
      // Optimistic update
      set((state) => {
        const nextMats = state.materials.map((m) => (m.id === id ? { ...m, ...updatedFields } : m));
        persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
      try {
        const updated = await api.materials.update(id, updatedFields);
        set((state) => {
          const nextMats = state.materials.map((m) => (m.id === id ? { ...m, ...updated } : m));
          get().logActivity('Cập nhật vật tư: ' + (updated.jobContent || id), 'COMPANY');
          persistAndNotify({ materials: nextMats });
          return { materials: nextMats };
        });
      } catch (e) {
        console.error('Failed to update material', e);
      }
    },

    updateMaterialStatus: async (id, status) => {
      get().markMutation();
      // Optimistic update
      set((state) => {
        const nextMats = state.materials.map((m) => (m.id === id ? { ...m, status } : m));
        persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
      try {
        const updated = await api.materials.update(id, { status });
        set((state) => {
          const nextMats = state.materials.map((m) => (m.id === id ? { ...m, ...updated } : m));
          get().logActivity('Cập nhật trạng thái vật tư: ' + (updated.jobContent || id), 'COMPANY');
          persistAndNotify({ materials: nextMats });
          return { materials: nextMats };
        });
      } catch (e) {
        console.error('Failed to update material status', e);
      }
    },

    deleteMaterial: async (id) => {
      // Xóa ở local trước để UI mượt mà (Optimistic Update) và dọn dẹp các dữ liệu bị kẹt
      set((state) => {
        const nextMats = state.materials.filter((m) => m.id !== id);
        const mat = state.materials.find(m=>m.id===id); get().logActivity('Xóa vật tư: ' + (mat?.name || id), 'COMPANY');
          persistAndNotify({ materials: nextMats });
        return { materials: nextMats };
      });
      try {
        await api.materials.delete(id);
      } catch (e) {
        console.warn('Failed to delete material from DB (might only exist locally)', e);
      }
    },

    setMaterials: (materialsList) => {
      set({ materials: materialsList });
      persistAndNotify({ materials: materialsList });
    },

    addInventoryTransaction: async (transactionData) => {
      try {
        const persisted = await api.materials.createTransaction(transactionData);
        set((state) => {
          const nextState = mergeInventoryTransactionIntoState(
            state.materials,
            state.inventoryTransactions,
            transactionData,
            persisted
          );
          persistAndNotify(nextState);
          return nextState;
        });
        // Đồng bộ lại toàn bộ dữ liệu kho từ DB để đảm bảo số tồn luôn chính xác
        try {
          const [freshMaterials, freshTransactions] = await Promise.all([
            api.materials.getAll(undefined),
            api.materials.getTransactions(),
          ]);
          if (Array.isArray(freshMaterials) && Array.isArray(freshTransactions)) {
            set({
              materials: mergeMaterialsWithSeed(freshMaterials),
              inventoryTransactions: freshTransactions,
            });
          }
        } catch (syncErr) {
          console.warn('Post-transaction sync failed, local state already updated', syncErr);
        }
      } catch (e) {
        console.error('Failed to persist inventory transaction, applying local fallback', e);
        set((state) => {
          const nextState = mergeInventoryTransactionIntoState(
            state.materials,
            state.inventoryTransactions,
            transactionData
          );
          persistAndNotify(nextState);
          return nextState;
        });
      }
    },

    addInventoryTransactionsBatch: async (batchData) => {
      const persistedResults: Array<{ material?: Material; transaction?: InventoryTransaction } | undefined> = [];
      for (const txData of batchData) {
        try {
          persistedResults.push(await api.materials.createTransaction(txData));
        } catch (e) {
          console.error('Failed to persist inventory transaction in batch, applying local fallback for row', e);
          persistedResults.push(undefined);
        }
      }

      set((state) => {
        let nextMaterials = state.materials;
        let nextTransactions = state.inventoryTransactions;

        batchData.forEach((txData, index) => {
          const nextState = mergeInventoryTransactionIntoState(
            nextMaterials,
            nextTransactions,
            txData,
            persistedResults[index]
          );
          nextMaterials = nextState.materials;
          nextTransactions = nextState.inventoryTransactions;
        });

        const nextState = { materials: nextMaterials, inventoryTransactions: nextTransactions };
        persistAndNotify(nextState);
        return nextState;
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
        const issue = state.issues.find(i=>i.id===id); get().logActivity('Cập nhật vấn đề: ' + (issue?.title || id), 'COMPANY');
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

    markNotificationRead: async (id) => {
      try {
        await api.notifications.markRead(id);
        set((state) => {
          const nextNotifs = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          persistAndNotify({ notifications: nextNotifs });
          return { notifications: nextNotifs };
        });
      } catch (e) {
        console.error('Failed to mark read', e);
      }
    },

    clearNotifications: async () => {
      try {
        await api.notifications.clear();
        set((state) => {
          persistAndNotify({ notifications: [] });
          return { notifications: [] };
        });
      } catch (e) {
        console.error('Failed to clear notifications', e);
      }
    },

    addNotification: async (notif) => {
      try {
        const createdNotif = await api.notifications.create(notif);
        set((state) => {
          const nextNotifs = [createdNotif, ...state.notifications];
          persistAndNotify({ notifications: nextNotifs });
          return { notifications: nextNotifs };
        });
      } catch (e) {
        console.error('Failed to add notification', e);
      }
    },

    fetchNotifications: async () => {
      try {
        const notifs = await api.notifications.getAll();
        set({ notifications: notifs });
      } catch (e) {
        console.error('Failed to fetch notifications', e);
      }
    },

    addProject: async (projData) => {
      try {
        const createdProj = await api.projects.create(projData);
        set((state) => {
          const nextProjs = [createdProj, ...state.projects];
          persistAndNotify({ projects: nextProjs });
          return { projects: nextProjs };
        });
        get().fetchEngineers();
        return createdProj;
      } catch (e) {
        console.error('Failed to add project', e);
      }
    },

      updateProject: async (id, projData) => { try { const updatedProj = await api.projects.update(id, projData); set((state) => { const nextProjs = state.projects.map((p) => (p.id === id ? { ...p, ...updatedProj } : p)); persistAndNotify({ projects: nextProjs }); return { projects: nextProjs }; }); return updatedProj; } catch (e) { console.error('Failed to update project', e); } },

    deleteProject: async (id) => {
      const projectToDelete = get().projects.find((p) => p.id === id);
      if (!projectToDelete) return;
      const projectCode = projectToDelete.code;

      // 1. Optimistic Update local state immediately so UI updates instantly
      set((state) => {
        const nextProjects = state.projects.filter((p) => p.id !== id);
        const nextTasks = state.tasks.filter((t) => t.projectCode !== projectCode);
        const nextMaterials = state.materials.filter((m) => m.projectCode !== projectCode);
        const nextIssues = state.issues.filter((i) => i.projectCode !== projectCode);
        const nextMaterialPlans = state.materialPlans.filter((p) => p.projectCode !== projectCode);
        const nextPurchasingPlans = state.purchasingPlans.filter((p) => p.projectCode !== projectCode);
        const nextExpenses = state.expenses.filter((e) => e.projectCode !== projectCode);
        const nextLaborPayrolls = state.laborPayrolls.filter((p) => p.projectCode !== projectCode);
        const nextFieldLogs = state.fieldLogs.filter((l) => l.projectCode !== projectCode);

        persistAndNotify({
          projects: nextProjects,
          tasks: nextTasks,
          materials: nextMaterials,
          issues: nextIssues,
          materialPlans: nextMaterialPlans,
          purchasingPlans: nextPurchasingPlans,
          expenses: nextExpenses,
          laborPayrolls: nextLaborPayrolls,
          fieldLogs: nextFieldLogs,
        });

        return {
          projects: nextProjects,
          tasks: nextTasks,
          materials: nextMaterials,
          issues: nextIssues,
          materialPlans: nextMaterialPlans,
          purchasingPlans: nextPurchasingPlans,
          expenses: nextExpenses,
          laborPayrolls: nextLaborPayrolls,
          fieldLogs: nextFieldLogs,
        };
      });

      // 2. Perform DB API calls in background
      try {
        await api.projects.delete(id);

        // Clean up project from assigned engineers
        const projectCodeStr = (projectToDelete.code || '').trim();
        const projectNameStr = (projectToDelete.name || '').trim();
        const affectedEngineers = get().engineers.filter(eng => {
          const hasManaged = eng.managedProjects?.some(p => p.code ? p.code.trim() === projectCodeStr : p.name.trim() === projectNameStr);
          const hasMember = eng.memberProjects?.some(p => p.code ? p.code.trim() === projectCodeStr : p.name.trim() === projectNameStr);
          const hasCode = Array.isArray(eng.projectCodes) && projectCodeStr && eng.projectCodes.some(c => c.trim() === projectCodeStr);
          return hasManaged || hasMember || hasCode;
        });

        if (affectedEngineers.length > 0) {
          await Promise.all(affectedEngineers.map(eng => {
            const keepProject = (p: any) => p.code ? p.code.trim() !== projectCodeStr : p.name.trim() !== projectNameStr;
            return api.engineers.update(eng.id, {
              managedProjects: eng.managedProjects?.filter(keepProject) || [],
              memberProjects: eng.memberProjects?.filter(keepProject) || [],
              projectCodes: Array.isArray(eng.projectCodes) && projectCodeStr ? eng.projectCodes.filter(c => c.trim() !== projectCodeStr) : (eng.projectCodes || [])
            });
          })).catch(err => console.warn('Clean up engineers failed', err));
        }

        get().logActivity('Đã xóa dự án: ' + projectToDelete.name, projectToDelete.name);
        get().fetchEngineers();
      } catch (e) {
        console.error('Failed to delete project from DB', e);
        throw e;
      }
    },
    addMaterialPlansBatch: async (plansData) => {
      try {
        const createdPlans = await api.accounting.createMaterialPlanBatch(plansData);
        set((state) => {
          const nextPlans = [...createdPlans, ...state.materialPlans];
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
        return createdPlans;
      } catch (e) {
        console.error('Failed to add material plans batch', e);
        return [];
      }
    },
    addPurchasingsBatch: async (plansData) => {
      try {
        const createdPurs = await api.accounting.createPurchasingBatch(plansData);
        set((state) => {
          const nextPurs = [...createdPurs, ...state.purchasingPlans];
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
        return createdPurs;
      } catch (e) {
        console.error('Failed to add purchasing plans batch', e);
        return [];
      }
    },
    addMaterialPlan: async (planData, skipLog?: boolean) => {
      try {
        const created = normalizeMaterialPlan(await api.accounting.createMaterialPlan(planData));
        set((state) => {
          const nextPlans = [created, ...state.materialPlans];
          if (!skipLog) get().logActivity('Thêm mới kế hoạch vật tư: ' + (created.jobContent || ''), 'COMPANY');
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
        return created.id;
      } catch (e) {
        console.error('Failed to add material plan', e);
        return undefined;
      }
    },

    updateMaterialPlan: async (id, fields) => {
      get().markMutation();
      const audit = getAuditFields();
      const fieldsWithAudit = { updatedBy: audit.updatedBy, updatedAt: audit.updatedAt, ...fields };
      const oldPlan = get().materialPlans.find((p) => p.id === id);
      // Optimistic update
      set((state) => {
        const nextPlans = state.materialPlans.map((p) => (p.id === id ? { ...p, ...fieldsWithAudit } : p));
        persistAndNotify({ materialPlans: nextPlans });
        return { materialPlans: nextPlans };
      });
      try {
        const updated = normalizeMaterialPlan(await api.accounting.updateMaterialPlan(id, fieldsWithAudit));
        const merged = {
          ...updated,
          updatedBy: updated.updatedBy || audit.updatedBy,
          updatedAt: updated.updatedAt || audit.updatedAt,
        };
        get().markMutation();
        set((state) => {
          const nextPlans = state.materialPlans.map((p) => (p.id === id ? merged : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== merged.stt) changes.push(`STT: "${oldPlan.stt || ''}" -> "${merged.stt || ''}"`);
            if (oldPlan.jobContent !== merged.jobContent) changes.push(`Nội dung: "${oldPlan.jobContent || ''}" -> "${merged.jobContent || ''}"`);
            if (oldPlan.contractVolume !== merged.contractVolume) changes.push(`Khối lượng: "${oldPlan.contractVolume || ''}" -> "${merged.contractVolume || ''}"`);
            if (oldPlan.unit !== merged.unit) changes.push(`ĐVT: "${oldPlan.unit || ''}" -> "${merged.unit || ''}"`);
            if (oldPlan.supplyScope !== merged.supplyScope) changes.push(`Phạm vi: "${oldPlan.supplyScope || ''}" -> "${merged.supplyScope || ''}"`);
            if (oldPlan.notes !== merged.notes) changes.push(`Ghi chú: "${oldPlan.notes || ''}" -> "${merged.notes || ''}"`);
          }
          const detailStr = changes.length > 0 ? ` |Detail:Dự án ${merged.projectCode}, Đầu mục ${merged.stt}: ${changes.join(', ')}` : '';
          
          get().logActivity('Cập nhật Kế hoạch vật tư: ' + (merged.jobContent || id) + detailStr, merged.projectCode || 'COMPANY');
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
        } catch (e: any) {
          console.error('Failed to update material plan', e);
          if (typeof window !== 'undefined') alert('Lỗi lưu vật tư: ' + (e.message || e.details || JSON.stringify(e)));
        }
    },

    deleteMaterialPlan: async (id) => {
      try {
        await api.accounting.deleteMaterialPlan(id);
        set((state) => {
          const nextPlans = state.materialPlans.filter((p) => p.id !== id);
          const plan = state.materialPlans.find(p=>p.id===id); get().logActivity('Xóa kế hoạch vật tư: ' + (plan?.jobContent || id), 'COMPANY');
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
      } catch (e) {
        console.error('Failed to delete material plan', e);
      }
    },

    addPurchasingPlan: async (purData, skipLog?: boolean) => {
      try {
        const created = normalizePurchasingPlan(await api.accounting.createPurchasing(purData));
        set((state) => {
          const nextPurs = [created, ...state.purchasingPlans];
          if (!skipLog) get().logActivity('Thêm mới kế hoạch mua sắm: ' + (created.content || ''), 'COMPANY');
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
        return created.id;
      } catch (e) {
        console.error('Failed to add purchasing plan', e);
        return undefined;
      }
    },

    updatePurchasingPlan: async (id, fields) => {
      get().markMutation();
      const audit = getAuditFields();
      const fieldsWithAudit = { updatedBy: audit.updatedBy, updatedAt: audit.updatedAt, ...fields };
      const oldPlan = get().purchasingPlans.find((p) => p.id === id);
      // Optimistic update
      set((state) => {
        const nextPurs = state.purchasingPlans.map((p) => (p.id === id ? { ...p, ...fieldsWithAudit } : p));
        persistAndNotify({ purchasingPlans: nextPurs });
        return { purchasingPlans: nextPurs };
      });
      try {
        const updated = normalizePurchasingPlan(await api.accounting.updatePurchasing(id, fieldsWithAudit));
        const merged = {
          ...updated,
          updatedBy: updated.updatedBy || audit.updatedBy,
          updatedAt: updated.updatedAt || audit.updatedAt,
        };
        set((state) => {
          const nextPurs = state.purchasingPlans.map((p) => (p.id === id ? merged : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== merged.stt) changes.push(`STT: "${oldPlan.stt || ''}" -> "${merged.stt || ''}"`);
            if (oldPlan.content !== merged.content) changes.push(`Nội dung: "${oldPlan.content || ''}" -> "${merged.content || ''}"`);
            if (oldPlan.volumeContract !== merged.volumeContract) changes.push(`KL: "${oldPlan.volumeContract || ''}" -> "${merged.volumeContract || ''}"`);
            if (oldPlan.unit !== merged.unit) changes.push(`ĐVT: "${oldPlan.unit || ''}" -> "${merged.unit || ''}"`);
            if (oldPlan.unitPrice !== merged.unitPrice) changes.push(`Đơn giá: "${oldPlan.unitPrice || ''}" -> "${merged.unitPrice || ''}"`);
            if (oldPlan.notes !== merged.notes) changes.push(`Ghi chú: "${oldPlan.notes || ''}" -> "${merged.notes || ''}"`);
          }
          const detailStr = changes.length > 0 ? ` |Detail:Dự án ${merged.projectCode}, Đầu mục ${merged.stt}: ${changes.join(', ')}` : '';
          
          get().logActivity('Cập nhật Mua hàng nhà thầu: ' + (merged.content || id) + detailStr, merged.projectCode || 'COMPANY');
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
      } catch (e: any) {
        console.error('Failed to update purchasing plan', e);
        if (typeof window !== 'undefined') alert('Lỗi lưu mua sắm: ' + (e.message || String(e)));
      }
    },

    deletePurchasingPlan: async (id) => {
      try {
        await api.accounting.deletePurchasing(id);
        set((state) => {
          const nextPurs = state.purchasingPlans.filter((p) => p.id !== id);
          const plan = state.purchasingPlans.find(p=>p.id===id); get().logActivity('Xóa kế hoạch mua sắm: ' + (plan?.content || id), 'COMPANY');
          persistAndNotify({ purchasingPlans: nextPurs });
          return { purchasingPlans: nextPurs };
        });
      } catch (e) {
        console.error('Failed to delete purchasing plan', e);
      }
    },

    addExpense: async (expData) => {
      try {
        const created = normalizeExpense(await api.accounting.createExpense(expData));
        set((state) => {
          const nextExps = [created, ...state.expenses];
          get().logActivity('Thêm mới chi phí: ' + (created.content || ''), 'COMPANY');
          persistAndNotify({ expenses: nextExps });
          return { expenses: nextExps };
        });
      } catch (e) {
        console.error('Failed to add expense', e);
        throw e;
      }
    },

    updateExpense: async (id, fields) => {
      try {
        const updated = normalizeExpense(await api.accounting.updateExpense(id, fields));
        set((state) => {
          const nextExps = state.expenses.map((e) => (e.id === id ? updated : e));
          get().logActivity('Cập nhật chi phí: ' + (updated.content || id), 'COMPANY');
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
          const exp = state.expenses.find(e=>e.id===id); get().logActivity('Xóa chi phí: ' + (exp?.content || id), 'COMPANY');
          persistAndNotify({ expenses: nextExps });
          return { expenses: nextExps };
        });
      } catch (e) {
        console.error('Failed to delete expense', e);
      }
    },

    addLaborPayroll: async (labData) => {
      try {
        const created = normalizeLaborPayroll(await api.accounting.createLaborPayroll(labData));
        set((state) => {
          const nextPayrolls = [created, ...state.laborPayrolls];
          get().logActivity('Thêm mới bảng lương: ' + (created.content || ''), 'COMPANY');
          persistAndNotify({ laborPayrolls: nextPayrolls });
          return { laborPayrolls: nextPayrolls };
        });
      } catch (e) {
        console.error('Failed to add payroll', e);
      }
    },

    updateLaborPayroll: async (id, fields) => {
      try {
        const updated = normalizeLaborPayroll(await api.accounting.updateLaborPayroll(id, fields));
        set((state) => {
          const nextPayrolls = state.laborPayrolls.map((l) => (l.id === id ? updated : l));
          get().logActivity('Cập nhật bảng lương: ' + (updated.content || id), 'COMPANY');
          persistAndNotify({ laborPayrolls: nextPayrolls });
          return { laborPayrolls: nextPayrolls };
        });
      } catch (e) {
        console.error('Failed to update payroll', e);
      }
    },

    deleteLaborPayroll: async (id) => {
      try {
        await api.accounting.deleteLaborPayroll(id);
        set((state) => {
          const nextPayrolls = state.laborPayrolls.filter((l) => l.id !== id);
          const pr = state.laborPayrolls.find(l=>l.id===id); get().logActivity('Xóa bảng lương: ' + (pr?.content || id), 'COMPANY');
          persistAndNotify({ laborPayrolls: nextPayrolls });
          return { laborPayrolls: nextPayrolls };
        });
      } catch (e) {
        console.error('Failed to delete payroll', e);
      }
    },

    addDocumentTrack: async (trackData) => {
      const tempId = `doc-${Date.now()}`;
      const audit = getAuditFields();
      const optimisticDoc: DocumentTrack = {
        ...trackData,
        ...audit,
        id: tempId,
        stt: trackData.stt || '',
        contractNo: trackData.contractNo || '',
        contractName: trackData.contractName || '',
        projectCode: trackData.projectCode || '',
        company: trackData.company || '',
        receiverName: trackData.receiverName || '',
        phone: trackData.phone || '',
        address: trackData.address || '',
        sendDate: trackData.sendDate || '',
        docStatus: trackData.docStatus || 'Chưa ký',
        contractValue: trackData.contractValue || 0,
        prepayPercent: trackData.prepayPercent || 0,
        prepayAmount: trackData.prepayAmount || 0,
        paymentStatus: trackData.paymentStatus || 'Chưa thanh toán',
        isCompleted: !!trackData.isCompleted,
        projectId: get().projects.find(p => p.code === trackData.projectCode)?.id
      };

      set((state) => {
        const nextTracks = [optimisticDoc, ...state.documentTracks];
        persistAndNotify({ documentTracks: nextTracks });
        return { documentTracks: nextTracks };
      });

      try {
        const created = normalizeDocumentTrack(await api.accounting.createDocumentTrack({ ...trackData, ...audit }));
        set((state) => {
          const nextTracks = state.documentTracks.map(d => d.id === tempId ? { ...audit, ...created } : d);
          get().logActivity('Thêm mới hồ sơ gửi đi: ' + (created.contractName || ''), 'COMPANY');
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        set((state) => {
          const nextTracks = state.documentTracks.filter(d => d.id !== tempId);
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
        console.error('Failed to add document track', e);
        throw e;
      }
    },

    updateDocumentTrack: async (id, fields) => {
      try {
        const audit = getAuditFields();
        const updated = normalizeDocumentTrack(await api.accounting.updateDocumentTrack(id, { ...fields, ...audit }));
        set((state) => {
          const nextTracks = state.documentTracks.map((d) => (d.id === id ? { ...d, ...fields, ...audit, ...updated } : d));
          get().logActivity('Cập nhật hồ sơ gửi đi: ' + (updated.contractName || id), 'COMPANY');
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        console.error('Failed to update document track', e);
        throw e;
      }
    },

    deleteDocumentTrack: async (id) => {
      try {
        await api.accounting.deleteDocumentTrack(id);
        set((state) => {
          const nextTracks = state.documentTracks.filter((d) => d.id !== id);
          const doc = state.documentTracks.find(d=>d.id===id); get().logActivity('Xóa hồ sơ gửi đi: ' + (doc?.contractName || id), 'COMPANY');
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        console.error('Failed to delete document track', e);
      }
    },
    
    updateFieldLog: async (id, input) => {
      try {
        const updated = await api.fieldLogs.update(id, input);
        set((state) => {
          const nextLogs = state.fieldLogs.map(l => l.id === id ? updated : l);
          get().logActivity('Cập nhật nhật ký hiện trường: ' + (updated.projectCode), 'COMPANY');
          persistAndNotify({ fieldLogs: nextLogs });
          return { fieldLogs: nextLogs };
        });
      } catch (e) {
        console.error('Failed to update field log', e);
        throw e;
      }
    },
    addFieldLog: async (input) => {
      try {
        const created = await api.fieldLogs.create(input);
        set((state) => {
          const nextLogs = [created, ...state.fieldLogs];
          get().logActivity('Thêm mới nhật ký hiện trường: ' + (created.projectCode), 'COMPANY');
          persistAndNotify({ fieldLogs: nextLogs });
          return { fieldLogs: nextLogs };
        });
      } catch (e) {
        console.error('Failed to add field log', e);
        throw e;
      }
    },

    deleteFieldLog: async (id) => {
      try {
        await api.fieldLogs.delete(id);
        set((state) => {
          const nextLogs = state.fieldLogs.filter((l) => l.id !== id);
          const log = state.fieldLogs.find(l=>l.id===id); get().logActivity('Xóa nhật ký hiện trường: ' + (log?.projectCode || id), 'COMPANY');
          persistAndNotify({ fieldLogs: nextLogs });
          return { fieldLogs: nextLogs };
        });
      } catch (e) {
        console.error('Failed to delete field log', e);
        throw e;
      }
    },

    logActivity: (action, project, user) => {
      const authUser = useAuthStore.getState().user;
      const actualUser = user || (authUser ? (authUser.name || authUser.username) : 'Hệ thống');

      const icon = action.toLowerCase().includes('tiến độ') ? 'trending_up' :
            action.toLowerCase().includes('chi') || action.toLowerCase().includes('lương') || action.toLowerCase().includes('hợp đồng') ? 'payments' :
            action.toLowerCase().includes('kho') || action.toLowerCase().includes('vật tư') ? 'warehouse' :
            action.toLowerCase().includes('hồ sơ') ? 'drafts' : 'history';
      const badgeBg = action.toLowerCase().includes('tiến độ') ? 'bg-blue-50' :
                 action.toLowerCase().includes('chi') || action.toLowerCase().includes('lương') || action.toLowerCase().includes('hợp đồng') ? 'bg-emerald-50' :
                 action.toLowerCase().includes('kho') || action.toLowerCase().includes('vật tư') ? 'bg-amber-50' :
                 action.toLowerCase().includes('hồ sơ') ? 'bg-violet-50' : 'bg-slate-50';
      const iconColor = action.toLowerCase().includes('tiến độ') ? 'text-blue-500' :
                   action.toLowerCase().includes('chi') || action.toLowerCase().includes('lương') || action.toLowerCase().includes('hợp đồng') ? 'text-emerald-500' :
                   action.toLowerCase().includes('kho') || action.toLowerCase().includes('vật tư') ? 'text-amber-500' :
                   action.toLowerCase().includes('hồ sơ') ? 'text-violet-500' : 'text-slate-500';

      // Optimistic update local state ngay lập tức
      set((state) => {
        const optimisticLog: ActivityLog = {
          id: 'act-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          user: actualUser,
          action,
          project,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
          icon,
          badgeBg,
          iconColor,
        };
        const nextLogs = [optimisticLog, ...state.activityLogs].slice(0, 100);
        persistAndNotify({ activityLogs: nextLogs });
        return { activityLogs: nextLogs };
      });

      // Lưu vào DB không đồng bộ (fire-and-forget)
      api.activityLogs.create({ user: actualUser, action, project, icon, badgeBg, iconColor })
        .then((saved) => {
          // Thay thế bản optimistic bằng bản từ DB (có ID thật)
          set((state) => {
            const nextLogs = state.activityLogs.map((l) =>
              l.action === action && l.user === actualUser && l.id.startsWith('act-')
                ? { ...l, id: saved.id, timestamp: saved.timestamp }
                : l
            );
            return { activityLogs: nextLogs };
          });
        })
        .catch((e) => console.warn('logActivity: failed to persist to DB', e));
    },
  };
});

// ==========================================
// SUPABASE REALTIME: Tự động đồng bộ dữ liệu giữa các thiết bị
// ==========================================
const REALTIME_TABLES = [
  'projects', 'tasks', 'materials', 'issues', 'engineers',
  'notifications', 'inventory_transactions',
  'material_plans', 'purchasing_plans', 'expenses',
  'labor_payrolls', 'document_tracks', 'field_logs'
];

let realtimeChannel: any = null;

export function setupRealtimeSync() {
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn('[Realtime] Failed to remove previous channel', e);
    }
    realtimeChannel = null;
  }

  // Debounce: gom nhiều thay đổi trong 4 giây thành 1 lần refresh và CHỈ fetch bảng bị đổi
  let changedTables = new Set<string>();
  let refreshTimeout: any = null;

  const debouncedRefresh = (payload?: any) => {
    if (payload && payload.table) {
      changedTables.add(payload.table);
    }
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      const store = useRealtimeStore.getState();
      // Nếu thao tác vừa diễn ra trên tab này (trong vòng 5s) -> Bỏ qua re-fetch
      if (Date.now() - store.lastMutationTime < 5000) {
        changedTables.clear();
        return;
      }

      const tables = Array.from(changedTables);
      changedTables.clear();
      console.log('[Realtime] Đã nhận tín hiệu thay đổi từ thiết bị khác. Cập nhật dữ liệu cho:', tables.length ? tables : 'ALL');
      
      if (tables.length === 0 || tables.includes('projects')) store.fetchProjects();
      if (tables.length === 0 || tables.includes('tasks')) store.fetchTasks(undefined);
      if (tables.length === 0 || tables.includes('materials') || tables.includes('inventory_transactions') || tables.includes('material_plans') || tables.includes('purchasing_plans')) store.fetchMaterials(undefined);
      if (tables.length === 0 || tables.includes('issues')) store.fetchIssues(undefined);
      if (tables.length === 0 || tables.includes('engineers')) store.fetchEngineers();
      if (tables.length === 0 || tables.includes('expenses') || tables.includes('labor_payrolls')) store.fetchAccounting();
      if (tables.length === 0 || tables.includes('field_logs')) store.fetchFieldLogs();
      if (tables.length === 0 || tables.includes('notifications')) store.fetchNotifications();
    }, 4000);
  };

  // Tạo 1 Channel tổng duy nhất lắng nghe tất cả các bảng
  const channel = supabase.channel('realtime-global-sync');

  REALTIME_TABLES.forEach((tableName) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: tableName }, debouncedRefresh);
  });

  channel.subscribe((status: string) => {
    console.log('[Realtime] Trạng thái kết nối (Single Channel):', status);
  });

  realtimeChannel = channel;
  console.log('[Realtime] Đã kích hoạt 1 kênh đồng bộ thời gian thực tối ưu duy nhất cho 14 bảng.');

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}

