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

const filterByProject = (items: any[], codeField: string) => {
  const user = getAuthUser();
  if (!user || ['admin', 'pm', 'Quản trị viên', 'Quản lý dự án', 'Giám đốc'].includes(user.role) || !Array.isArray(items)) return items;
  const assigned = user.projectCodes || [];
  return items.filter(item => assigned.includes(item[codeField]));
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
  createEngineer: (input: { name: string; phone?: string; email?: string; title?: string; role?: string; username?: string; password?: string; isLocked?: boolean; projectCodes?: string[] }) => Promise<Engineer>;
  updateEngineer: (id: string, input: { name: string; phone?: string; title?: string; role?: string; username?: string; password?: string; isLocked?: boolean; projectCodes?: string[] }) => Promise<Engineer>;
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
  if (text.includes('chu dau tu cung cap') || text.includes('chu dau tu cap') || text.includes('[owner]')) return 'owner';
  if (text.includes('nha thau cung cap') || text.includes('do nha thau cung cap') || text.includes('[contractor]')) return 'contractor';
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
});

const normalizeDocumentTrack = (doc: any): DocumentTrack => ({
  id: doc.id,
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
  docType: doc.docType ?? doc.doc_type ?? 'Giao'
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
      fieldLogs: newState.fieldLogs !== undefined ? newState.fieldLogs : current.fieldLogs,
    };
    
    // Debounce localStorage persistence to prevent UI freezes during rapid sequential updates
    if ((window as any).__persistTimeout) {
      clearTimeout((window as any).__persistTimeout);
    }
    
    (window as any).__persistTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        channel?.postMessage({ type: 'SYNC_STATE' });
      } catch (e) {
        console.error('Failed to save state', e);
      }
    }, 500);
  };

  return {
    projects: [],
    tasks: [],
    materials: inventorySeed.materials,
    issues: [],
    engineers: [],
    notifications: [],
    activityLogs: [],
    inventoryTransactions: inventorySeed.inventoryTransactions,
    materialPlans: [],
    purchasingPlans: [],
    expenses: [],
    laborPayrolls: [],
    documentTracks: [],
    fieldLogs: [],

    fetchProjects: async () => {
      try {
        const projects = await api.projects.getAll();
        // Lọc bỏ project nội bộ "Kho Công Ty" khỏi danh sách dự án
        let filtered = Array.isArray(projects)
          ? projects.filter((p: any) => p.code !== 'COMPANY')
          : projects;
        
        filtered = filterByProject(filtered, 'code');
        set({ projects: filtered });
      } catch (e) {
        console.error('Failed to fetch projects', e);
      }
    },

    fetchTasks: async (projectId) => {
      try {
        const tasks = await api.tasks.getAll(projectId);
        set({ tasks: filterByProject(tasks, 'projectCode') });
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

        // Clean up ghost project codes (codes that don't exist in projects list)
        const currentProjects = get().projects;
        if (currentProjects.length > 0) {
          const validCodes = new Set(currentProjects.map(p => (p.code || '').trim()).filter(Boolean));
          let hasGhosts = false;
          
          for (const eng of engineers) {
            const originalLength = eng.projectCodes.length;
            eng.projectCodes = eng.projectCodes.filter((code: string) => {
              if (!code || !code.trim()) return false; // Remove empty codes
              return validCodes.has(code.trim());
            });
            
            if (eng.projectCodes.length !== originalLength) {
              hasGhosts = true;
              // Silently update backend in background
              api.engineers.update(eng.id, { projectCodes: eng.projectCodes }).catch(console.error);
            }
          }
          
          if (hasGhosts) {
            console.log('Cleaned up ghost project references from engineers.');
          }
        }

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
              projectCodes: matchedEngineer.projectCodes || [],
              role: matchedEngineer.role === 'Quản trị viên' ? 'admin' :
                    matchedEngineer.role === 'Quản lý dự án' ? 'pm' :
                    matchedEngineer.role === 'Kỹ sư hiện trường' ? 'engineer' : 'staff',
              name: matchedEngineer.name || currentUser.name,
              title: matchedEngineer.title || currentUser.title,
            };
            
            // Only update if there's an actual change in projectCodes or role to avoid infinite loops
            if (JSON.stringify(currentUser.projectCodes) !== JSON.stringify(updatedUser.projectCodes) ||
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
      const nextState: any = {};

      // Tải từng bảng độc lập — 1 bảng lỗi không ảnh hưởng bảng khác
      try {
        const materialPlans = await api.accounting.getMaterialPlans();
        if (Array.isArray(materialPlans)) nextState.materialPlans = filterByProject(materialPlans.map(normalizeMaterialPlan), 'projectCode');
        console.log('[Accounting] Loaded material_plans:', materialPlans?.length || 0);
      } catch (e) { console.error('[Accounting] Failed material_plans', e); }

      try {
        const purchasingPlans = await api.accounting.getPurchasings();
        if (Array.isArray(purchasingPlans)) nextState.purchasingPlans = filterByProject(purchasingPlans.map(normalizePurchasingPlan), 'projectCode');
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
        const createdTasks = await Promise.all(batchData.map(t => api.tasks.create(t)));
        set((state) => {
          const nextTasks = [...createdTasks, ...state.tasks];
          const changedProjectCodes = Array.from(new Set(createdTasks.map((task) => task.projectCode)));
          const nextProjects = recalculateProjectsFromTasks(state.projects, nextTasks, changedProjectCodes);
          persistAndNotify({ tasks: nextTasks, projects: nextProjects });
          return { tasks: nextTasks, projects: nextProjects };
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
      const updated = await api.engineers.update(id, {
          role: input.role,
          username: input.username,
          password: input.password,
          isLocked: input.isLocked,
        name: input.name,
        phone: input.phone,
        title: input.title,
        projectCodes: input.projectCodes,
      });
      const engineers = await api.engineers.getAll();
      set(() => {
        persistAndNotify({ engineers });
        return { engineers };
      });
      get().logActivity('Đã cập nhật nhân sự: ' + input.name, input.name);
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
        get().fetchEngineers();
        return createdProj;
      } catch (e) {
        console.error('Failed to add project', e);
      }
    },

      updateProject: async (id, projData) => { try { const updatedProj = await api.projects.update(id, projData); set((state) => { const nextProjs = state.projects.map((p) => (p.id === id ? { ...p, ...updatedProj } : p)); persistAndNotify({ projects: nextProjs }); return { projects: nextProjs }; }); return updatedProj; } catch (e) { console.error('Failed to update project', e); } },

  deleteProject: async (id) => {
      try {
        const projectToDelete = get().projects.find((p) => p.id === id);
        if (!projectToDelete) return;

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
          }));
        }

        set((state) => {
          const projectCode = projectToDelete.code;
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

        get().logActivity('Đã xóa dự án: ' + projectToDelete.name, projectToDelete.name);
        get().fetchEngineers();
      } catch (e) {
        console.error('Failed to delete project', e);
      }
    },

    addMaterialPlansBatch: async (plansData) => {
      try {
        const createdMatsRaw = await Promise.all(plansData.map(p => api.accounting.createMaterialPlan(p)));
        const createdMats = createdMatsRaw.map(r => r ? normalizeMaterialPlan(r) : null).filter(Boolean) as ProjectMaterialPlan[];
        set((state) => {
          const nextMats = [...createdMats, ...state.materialPlans];
          persistAndNotify({ materialPlans: nextMats });
          return { materialPlans: nextMats };
        });
        return createdMats;
      } catch (e) {
        console.error('Failed to add material plans batch', e);
        return [];
      }
    },
    addPurchasingsBatch: async (plansData) => {
      try {
        const createdPursRaw = await Promise.all(plansData.map(p => api.accounting.createPurchasing(p)));
        const createdPurs = createdPursRaw.map(r => r ? normalizePurchasingPlan(r) : null).filter(Boolean) as ProjectPurchasing[];
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
      try {
        const oldPlan = get().materialPlans.find((p) => p.id === id);
        const updated = normalizeMaterialPlan(await api.accounting.updateMaterialPlan(id, fields));
        set((state) => {
          const nextPlans = state.materialPlans.map((p) => (p.id === id ? updated : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== updated.stt) changes.push(`STT: "${oldPlan.stt || ''}" -> "${updated.stt || ''}"`);
            if (oldPlan.jobContent !== updated.jobContent) changes.push(`Nội dung: "${oldPlan.jobContent || ''}" -> "${updated.jobContent || ''}"`);
            if (oldPlan.contractVolume !== updated.contractVolume) changes.push(`Khối lượng: "${oldPlan.contractVolume || ''}" -> "${updated.contractVolume || ''}"`);
            if (oldPlan.unit !== updated.unit) changes.push(`ĐVT: "${oldPlan.unit || ''}" -> "${updated.unit || ''}"`);
            if (oldPlan.supplyScope !== updated.supplyScope) changes.push(`Phạm vi: "${oldPlan.supplyScope || ''}" -> "${updated.supplyScope || ''}"`);
            if (oldPlan.notes !== updated.notes) changes.push(`Ghi chú: "${oldPlan.notes || ''}" -> "${updated.notes || ''}"`);
          }
          const detailStr = changes.length > 0 ? ` |Detail:Dự án ${updated.projectCode}, Đầu mục ${updated.stt}: ${changes.join(', ')}` : '';
          
          get().logActivity('Cập nhật Kế hoạch vật tư: ' + (updated.jobContent || id) + detailStr, updated.projectCode || 'COMPANY');
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });
      } catch (e: any) {
        console.error('Failed to update material plan', e);
        if (typeof window !== 'undefined') alert('Lỗi lưu vật tư: ' + (e.message || String(e)));
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
      try {
        const oldPlan = get().purchasingPlans.find((p) => p.id === id);
        const updated = normalizePurchasingPlan(await api.accounting.updatePurchasing(id, fields));
        set((state) => {
          const nextPurs = state.purchasingPlans.map((p) => (p.id === id ? updated : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== updated.stt) changes.push(`STT: "${oldPlan.stt || ''}" -> "${updated.stt || ''}"`);
            if (oldPlan.content !== updated.content) changes.push(`Nội dung: "${oldPlan.content || ''}" -> "${updated.content || ''}"`);
            if (oldPlan.volumeContract !== updated.volumeContract) changes.push(`KL: "${oldPlan.volumeContract || ''}" -> "${updated.volumeContract || ''}"`);
            if (oldPlan.unit !== updated.unit) changes.push(`ĐVT: "${oldPlan.unit || ''}" -> "${updated.unit || ''}"`);
            if (oldPlan.unitPrice !== updated.unitPrice) changes.push(`Đơn giá: "${oldPlan.unitPrice || ''}" -> "${updated.unitPrice || ''}"`);
            if (oldPlan.notes !== updated.notes) changes.push(`Ghi chú: "${oldPlan.notes || ''}" -> "${updated.notes || ''}"`);
          }
          const detailStr = changes.length > 0 ? ` |Detail:Dự án ${updated.projectCode}, Đầu mục ${updated.stt}: ${changes.join(', ')}` : '';
          
          get().logActivity('Cập nhật Mua hàng nhà thầu: ' + (updated.content || id) + detailStr, updated.projectCode || 'COMPANY');
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
      try {
        const created = normalizeDocumentTrack(await api.accounting.createDocumentTrack(trackData));
        set((state) => {
          const nextTracks = [created, ...state.documentTracks];
          get().logActivity('Thêm mới hồ sơ gửi đi: ' + (created.contractName || ''), 'COMPANY');
          persistAndNotify({ documentTracks: nextTracks });
          return { documentTracks: nextTracks };
        });
      } catch (e) {
        console.error('Failed to add document track', e);
        throw e;
      }
    },

    updateDocumentTrack: async (id, fields) => {
      try {
        const updated = normalizeDocumentTrack(await api.accounting.updateDocumentTrack(id, fields));
        set((state) => {
          const nextTracks = state.documentTracks.map((d) => (d.id === id ? updated : d));
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
  'notifications', 'activity_logs', 'inventory_transactions',
  'material_plans', 'purchasing_plans', 'expenses',
  'labor_payrolls', 'document_tracks', 'field_logs'
];

let realtimeChannel: any = null;

export function setupRealtimeSync() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  // Debounce: gom nhiều thay đổi trong 2 giây thành 1 lần refresh
  let refreshTimeout: any = null;
  const debouncedRefresh = () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      console.log('[Realtime] Đã nhận tín hiệu thay đổi data. Tạm tắt auto-fetch để tiết kiệm Egress 5GB. Vui lòng F5 nếu cần.');
      // const store = useRealtimeStore.getState();
      // store.fetchProjects();
      // store.fetchAccounting();
      // store.fetchMaterials(undefined);
      // store.fetchTasks(undefined);
      // store.fetchIssues(undefined);
      // store.fetchEngineers();
      // store.fetchActivityLogs();
    }, 2000);
  };

  realtimeChannel = supabase
    .channel('realtime-all-tables')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'engineers' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_transactions' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'material_plans' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchasing_plans' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'labor_payrolls' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'document_tracks' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'field_logs' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, debouncedRefresh)
    .subscribe((status: string) => {
      console.log('[Realtime] Trạng thái kết nối:', status);
    });

  console.log('[Realtime] Đã bật đồng bộ tức thì cho tất cả bảng dữ liệu.');
}

