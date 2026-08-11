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
  createEngineer: (input: { name: string; phone?: string; email?: string; title?: string; projectCodes?: string[] }) => Promise<Engineer>;
  updateEngineer: (id: string, input: { name: string; phone?: string; title?: string; projectCodes?: string[] }) => Promise<Engineer>;
  deleteEngineer: (id: string) => Promise<void>;
  deleteTask: (id: string) => void;

  addMaterial: (mat: Omit<Material, 'id'>) => void;
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
  deleteProject: (id: string) => Promise<void>;

  // New Actions
  addMaterialPlan: (plan: Omit<ProjectMaterialPlan, 'id'>) => Promise<string | undefined>;
  updateMaterialPlan: (id: string, fields: Partial<ProjectMaterialPlan>) => Promise<void>;
  deleteMaterialPlan: (id: string) => void;

  addPurchasingPlan: (plan: Omit<ProjectPurchasing, 'id'>) => Promise<string | undefined>;
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
  
  addFieldLog: (input: { projectCode: string; note?: string; images: File[] }) => Promise<void>;
  deleteFieldLog: (id: string) => Promise<void>;
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
  isCompleted: Boolean(doc.isCompleted ?? doc.is_completed ?? false),
  notes: doc.notes || '',
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
        const filtered = Array.isArray(projects)
          ? projects.filter((p: any) => p.code !== 'COMPANY')
          : projects;
        set({ projects: filtered });
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
        const [materials, inventoryTransactions] = await Promise.all([
          api.materials.getAll(projectId),
          api.materials.getTransactions(),
        ]);
        set({
          materials: mergeMaterialsWithSeed(Array.isArray(materials) ? materials : [], projectId),
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

    fetchFieldLogs: async () => {
      try {
        const fieldLogs = await api.fieldLogs.getAll();
        set({ fieldLogs });
      } catch (e) {
        console.error('Failed to fetch field logs', e);
      }
    },

    fetchAccounting: async () => {
      const nextState: any = {};

      // Tải từng bảng độc lập — 1 bảng lỗi không ảnh hưởng bảng khác
      try {
        const materialPlans = await api.accounting.getMaterialPlans();
        if (Array.isArray(materialPlans)) nextState.materialPlans = materialPlans.map(normalizeMaterialPlan);
        console.log('[Accounting] Loaded material_plans:', materialPlans?.length || 0);
      } catch (e) { console.error('[Accounting] Failed material_plans', e); }

      try {
        const purchasingPlans = await api.accounting.getPurchasings();
        if (Array.isArray(purchasingPlans)) nextState.purchasingPlans = purchasingPlans.map(normalizePurchasingPlan);
        console.log('[Accounting] Loaded purchasing_plans:', purchasingPlans?.length || 0);
      } catch (e) { console.error('[Accounting] Failed purchasing_plans', e); }

      try {
        const expenses = await api.accounting.getExpenses();
        if (Array.isArray(expenses)) nextState.expenses = expenses;
      } catch (e) { console.error('[Accounting] Failed expenses', e); }

      try {
        const laborPayrolls = await api.accounting.getLaborPayrolls();
        if (Array.isArray(laborPayrolls)) nextState.laborPayrolls = laborPayrolls;
      } catch (e) { console.error('[Accounting] Failed labor_payrolls', e); }

      try {
        const documentTracks = await api.accounting.getDocumentTracks();
        if (Array.isArray(documentTracks)) nextState.documentTracks = documentTracks;
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
          const nextNotifs: NotificationItem[] = [
            {
              id: 'notif-' + Date.now(),
              title: 'Import Excel thành công',
              message: `Đã nạp ${createdTasks.length} hạng mục từ tập Excel.`,
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

    createEngineer: async (input) => {
      const created = await api.engineers.create({
        fullName: input.name,
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
        fullName: input.name,
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
        const created = await api.materials.createTransaction ? await (api.materials as any).create(newMat) : newMat; // Temporary fallback if create doesn't exist
        
        set((state) => {
          const nextMats = [created || newMat, ...state.materials];
          persistAndNotify({ materials: nextMats });
          return { materials: nextMats };
        });
      } catch (e) {
        console.error('Failed to add material', e);
      }
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

    deleteProject: async (id) => {
      try {
        const projectToDelete = get().projects.find((p) => p.id === id);
        if (!projectToDelete) return;

        await api.projects.delete(id);

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
      } catch (e) {
        console.error('Failed to delete project', e);
      }
    },

    addMaterialPlan: async (planData) => {
      try {
        const created = normalizeMaterialPlan(await api.accounting.createMaterialPlan(planData));
        set((state) => {
          const nextPlans = [created, ...state.materialPlans];
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
        const updated = normalizeMaterialPlan(await api.accounting.updateMaterialPlan(id, fields));
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
        const created = normalizePurchasingPlan(await api.accounting.createPurchasing(purData));
        set((state) => {
          const nextPurs = [created, ...state.purchasingPlans];
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
        const updated = normalizePurchasingPlan(await api.accounting.updatePurchasing(id, fields));
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
        const created = normalizeExpense(await api.accounting.createExpense(expData));
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
        const updated = normalizeExpense(await api.accounting.updateExpense(id, fields));
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
        const created = normalizeLaborPayroll(await api.accounting.createPayroll(payrollData));
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
        const updated = normalizeLaborPayroll(await api.accounting.updatePayroll(id, fields));
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
        const created = normalizeDocumentTrack(await api.accounting.createDocumentTrack(trackData));
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
        const updated = normalizeDocumentTrack(await api.accounting.updateDocumentTrack(id, fields));
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
    
    addFieldLog: async (input) => {
      try {
        const created = await api.fieldLogs.create(input);
        set((state) => {
          const nextLogs = [created, ...state.fieldLogs];
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
          persistAndNotify({ fieldLogs: nextLogs });
          return { fieldLogs: nextLogs };
        });
      } catch (e) {
        console.error('Failed to delete field log', e);
        throw e;
      }
    },

    logActivity: (action, project, user = 'Kỹ sư Nam') => {
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
          user,
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
      api.activityLogs.create({ user, action, project, icon, badgeBg, iconColor })
        .then((saved) => {
          // Thay thế bản optimistic bằng bản từ DB (có ID thật)
          set((state) => {
            const nextLogs = state.activityLogs.map((l) =>
              l.action === action && l.user === user && l.id.startsWith('act-')
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
      console.log('[Realtime] Đang đồng bộ dữ liệu...');
      const store = useRealtimeStore.getState();
      store.fetchProjects();
      store.fetchAccounting();
      // Refresh tasks, materials, issues cho tất cả projects
      store.fetchProjects().then(() => {
        const projects = useRealtimeStore.getState().projects;
        if (projects.length > 0) {
          store.fetchTasks(undefined);
          store.fetchMaterials(undefined);
          store.fetchIssues(undefined);
        }
      });
      store.fetchEngineers();
    }, 2000);
  };

  realtimeChannel = supabase
    .channel('realtime-all-tables')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'engineers' }, debouncedRefresh)
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
