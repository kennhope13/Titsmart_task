import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { OcrUploadPanel } from '../components/common/OcrUploadPanel';
import { WebOcrExtractedData } from '../services/webOcrService';
import { Task } from '../types';

// Convert integer to Roman numeral
const toRoman = (num: number): string => {
  if (num <= 0) return 'I';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  let n = num;
  for (const [letter, value] of lookup) {
    while (n >= value) {
      roman += letter;
      n -= value;
    }
  }
  return roman;
};

const fromRoman = (roman: string): number => {
  const values: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  return roman
    .toUpperCase()
    .split('')
    .reduce((total, char, index, chars) => {
      const value = values[char] || 0;
      const nextValue = values[chars[index + 1]] || 0;
      return total + (value < nextValue ? -value : value);
    }, 0);
};

const extractLeadingRomanNumber = (text: string): number | null => {
  const match = text.trim().match(/^([IVXLCDM]+)(?:[\s.)-]|$)/i);
  if (!match) return null;

  const roman = match[1].toUpperCase();
  return toRoman(fromRoman(roman)) === roman ? fromRoman(roman) : null;
};

type ImportFileFormat = 'xlsx' | 'csv' | 'pdf' | 'docx';
type ExportFileFormat = 'xlsx' | 'csv' | 'pdf' | 'docx';

const todayStamp = () => new Date().toISOString().split('T')[0];

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const normalizeStatusText = (value?: string) => (value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd');

const PURCHASE_STATUS_OPTIONS = [
  'Không có hàng',
  'Chưa đặt hàng',
  'Đang đặt hàng',
  'Đã đặt hàng',
  'Đang giao',
  'Đã có hàng',
  'Hàng gia công',
];

const CONSTRUCTION_STATUS_OPTIONS = [
  'Chưa thi công',
  'Đang thi công',
  'Đã thi công',
  'Vướng mắc',
  'Đã kéo dây',
  'Đã lắp thiết bị vào tủ',
  'Đã lắp TB + kéo dây',
  'Đang ETE',
];

const purchaseProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'khong co hang' || clean === 'chua dat hang') return 0;
  if (clean === 'dang dat hang') return 0.3;
  if (clean === 'da dat hang') return 0.6;
  if (clean === 'dang giao' || clean === 'dang giao hang') return 0.85;
  if (clean === 'da co hang' || clean === 'da nhan du' || clean === 'hang gia cong') return 1;
  return 0;
};

const constructionProgressScore = (status?: string) => {
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

const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);

const calculateAutoProgressRatio = (purchaseStatus?: string, constrStatus?: string) =>
  calculateAutoProgressPercent(purchaseStatus, constrStatus) / 100;

const taskStatusFromProgress = (progress: number): Task['status'] => (
  progress >= 1 ? 'Ho\u00e0n th\u00e0nh' : progress > 0 ? '\u0110ang l\u00e0m' : 'Ch\u01b0a l\u00e0m'
) as Task['status'];

const sttSortParts = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return [Number.POSITIVE_INFINITY];
  const parts = text.match(/\d+/g)?.map((part) => Number.parseInt(part, 10)) || [];
  return parts.length ? parts : [Number.POSITIVE_INFINITY];
};

const compareTaskStt = (a?: string, b?: string) => {
  const textA = String(a || '').trim();
  const textB = String(b || '').trim();
  
  const romanA = extractLeadingRomanNumber(textA);
  const romanB = extractLeadingRomanNumber(textB);
  
  if (romanA !== null && romanB !== null) {
    if (romanA !== romanB) return romanA - romanB;
  } else if (romanA !== null && romanB === null) {
    return -1;
  } else if (romanA === null && romanB !== null) {
    return 1;
  }

  const left = sttSortParts(textA);
  const right = sttSortParts(textB);
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  return textA.localeCompare(textB, 'vi', { numeric: true, sensitivity: 'base' });
};


const cleanNotes = (value?: string) => {
  return String(value || '')
    .replace(/\[order:[\d.]+\]/g, '')
    .replace(/\[section\]/gi, '')
    .replace(/\[contractor\]/gi, '')
    .replace(/\[owner\]/gi, '')
    .replace(/Nhà thầu cung cấp/gi, '')
    .replace(/Chủ đầu tư cung cấp/gi, '')
    .replace(/Import từ phụ lục dự án/gi, '')
    .replace(/Đồng bộ từ phụ lục khi tạo dự án/gi, '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .join(' | ');
};

// Helper function to truncate long text cleanly
const truncateText = (text: string, maxLength: number = 40): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const TaskManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedProjectFromUrl = searchParams.get('project') || '';
  const { tasks, projects, engineers, addTask, addTasksBatch, updateTask, addProject, addEngineer, assignEngineer, deleteTask, addMaterialPlan, addPurchasingPlan, materialPlans, purchasingPlans, deleteMaterialPlan, deletePurchasingPlan } = useRealtimeStore();

  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('all');
  const [selectedRomanSection, setSelectedRomanSection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Column Filters
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterProgress, setFilterProgress] = useState<string>('all');

  // Detailed Attribute Filters
  const [filterPurchase, setFilterPurchase] = useState<string>('all');
  const [filterConstr, setFilterConstr] = useState<string>('all');

  // Collapsed sections state: Set of sectionName strings that are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  // Custom Section Menu Popover state
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState<boolean>(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState<string>('');

  // File import/export menu state
  const [isImportMenuOpen, setIsImportMenuOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [currentImportFormat, setCurrentImportFormat] = useState<ImportFileFormat>('xlsx');

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);


  // Edit Task Modal state
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Task } | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const startEditing = (id: string, field: keyof Task, value: any) => {
    setEditingCell({ id, field });
    if (field === 'progress') {
      const n = Number(value || 0);
      setTempValue(n <= 1 ? Math.round(n * 100) : n);
    } else {
      setTempValue(value === undefined || value === null ? '' : value);
    }
  };

  const saveEditing = (task: Task) => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    let finalValue = tempValue;
    if (field === 'volume') {
      finalValue = Number(tempValue || 0);
    } else if (field === 'progress') {
      finalValue = Number(tempValue || 0) / 100;
    }
    const nextProgress = field === 'progress' ? finalValue : task.progress;
    
    updateTask(id, { 
      [field]: finalValue,
      ...(field === 'progress' ? {
        isDone: nextProgress >= 1,
        status: taskStatusFromProgress(task.isSectionHeader ? 0 : nextProgress),
      } : {})
    });
    setEditingCell(null);
  };
  const [editStt, setEditStt] = useState('');
  const [editName, setEditName] = useState('');
  const [editSectionName, setEditSectionName] = useState('');
  const [editCustomSection, setEditCustomSection] = useState('');
  const [editVolume, setEditVolume] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('cái');
  const [editPurchaseStatus, setEditPurchaseStatus] = useState('Chưa đặt hàng');
  const [editConstrStatus, setEditConstrStatus] = useState('Chưa thi công');
  const [editIssue, setEditIssue] = useState('');
  const [editIssueStatus, setEditIssueStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editEngineerId, setEditEngineerId] = useState(engineers[0]?.id || '');
  const [editParentId, setEditParentId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New task form state
  const [stt, setStt] = useState('');
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState(projects[0]?.code || 'DAKRLAP');
  const [sectionSelect, setSectionSelect] = useState<string>('default');
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [volume, setVolume] = useState<number>(1);
  const [unit, setUnit] = useState('ci');
  const [purchaseStatus, setPurchaseStatus] = useState('Chưa đặt hng');
  const [constrStatus, setConstrStatus] = useState('Chưa thi cng');
  const [engineerId, setEngineerId] = useState(engineers[0]?.id || '');
  const [isSectionHeader, setIsSectionHeader] = useState(false);
  const [ocrIssueDraft, setOcrIssueDraft] = useState('');
  const [parentIdSelect, setParentIdSelect] = useState<string>('default');

  // New project form state
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState(engineers[0]?.id || '');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerTitle, setNewManagerTitle] = useState('Chỉ huy trưởng cng trnh');

  useEffect(() => {
    if (!selectedProjectFromUrl) return;
    setSelectedProjectCode(selectedProjectFromUrl);
    setProjectCode(selectedProjectFromUrl);
  }, [selectedProjectFromUrl]);

  // Extract Unique Roman Numeral Sections for Filter & Dropdowns
  const activeTasksForProj = tasks.filter((t) => selectedProjectCode === 'all' || t.projectCode === selectedProjectCode);
  
  const rawSectionsList = tasks
    .filter((t) => projectCode === 'all' || t.projectCode === projectCode)
    .map((t) => t.sectionName)
    .filter((secName): secName is string => !!secName && secName.trim().length > 0);

  const uniqueSectionsForProj = Array.from(new Set(rawSectionsList));
  const currentProject = projects.find((project) => project.code === projectCode);
  const activeSectionName = sectionSelect === '__CUSTOM__'
    ? customSectionInput
    : sectionSelect !== 'default'
    ? sectionSelect
    : uniqueSectionsForProj[0] || '';

  const getNextRomanSectionPrefix = () => {
    const maxRomanNumber = uniqueSectionsForProj.reduce((max, sectionName) => {
      const romanNumber = extractLeadingRomanNumber(sectionName);
      return romanNumber ? Math.max(max, romanNumber) : max;
    }, 0);

    return `${toRoman(maxRomanNumber + 1)}. `;
  };

  const globalUniqueSections = Array.from(
    new Set(
      activeTasksForProj
        .map((t) => t.sectionName)
        .filter((secName): secName is string => !!secName && secName.trim().length > 0)
    )
  );

  // (Auto STT calculation removed per user request to force manual input)

  const handleAddSubtask = (parentTask: Task) => {
    if (selectedProjectCode !== 'all' && selectedProjectCode !== parentTask.projectCode) {
      setProjectCode(parentTask.projectCode);
    }
    setIsSectionHeader(false);
    setSectionSelect(parentTask.sectionName || 'default');
    setParentIdSelect(parentTask.id);
    setName('');
    
    setStt('');
    
    setOcrIssueDraft('');
    setIsNewTaskModalOpen(true);
  };

  // Open Edit Task Modal
  const handleOpenEditModal = (t: Task) => {
    setEditingTask(t);
    setEditStt(t.stt || '');
    setEditName(t.name || '');
    setEditSectionName(t.sectionName || '');
    setEditCustomSection('');
    setEditVolume(t.volume || 0);
    setEditUnit(t.unit || 'cái');
    setEditPurchaseStatus(t.purchaseStatus || 'Chưa đặt hàng');
    setEditConstrStatus(t.constrStatus || 'Chưa thi công');
    setEditIssue(t.issue || '');
    setEditIssueStatus(t.issueStatus || '');
    setEditNotes(t.notes || '');
    setEditEngineerId(t.assignedEngineerId || engineers[0]?.id || '');
    setEditParentId(t.parentId || '');
    setIsEditTaskModalOpen(true);
  };

  // Submit Save Edited Task
  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editName.trim()) return;

    const finalSection = editSectionName === '__CUSTOM__' ? editCustomSection : editSectionName;
    const eng = engineers.find((e) => e.id === editEngineerId);
    const nextProgress = editingTask.isSectionHeader ? editingTask.progress : calculateAutoProgressRatio(editPurchaseStatus, editConstrStatus);

    updateTask(editingTask.id, {
      stt: editStt,
      name: editName,
      sectionName: finalSection,
      volume: editVolume,
      unit: editUnit,
      purchaseStatus: editPurchaseStatus,
      constrStatus: editConstrStatus,
      progress: nextProgress,
      isDone: !editingTask.isSectionHeader && nextProgress >= 1,
      status: taskStatusFromProgress(!editingTask.isSectionHeader ? nextProgress : 0),
      issue: editIssue,
      issueStatus: editIssueStatus,
      notes: editNotes,
      assignedEngineerId: editEngineerId,
      assignedEngineerName: eng ? eng.name : editingTask.assignedEngineerName,
      parentId: editParentId || undefined,
    });

    setIsEditTaskModalOpen(false);
    setEditingTask(null);
  };


  const handleStartCustomSection = () => {
    setIsSectionHeader(true);
    setSectionSelect('default');
    setCustomSectionInput('');
    setName('');
    setStt('');
  };

  const openNewSectionModal = () => {
    if (selectedProjectCode !== 'all') {
      setProjectCode(selectedProjectCode);
    }
    setIsSectionHeader(true);
    setSectionSelect('default');
    setCustomSectionInput('');
    setName('');
    setStt('');
    setOcrIssueDraft('');
    setIsNewTaskModalOpen(true);
  };

  const openNewTaskModal = () => {
    if (selectedProjectCode !== 'all') {
      setProjectCode(selectedProjectCode);
    }
    setIsSectionHeader(false);
    setName('');
    setStt('');
    setOcrIssueDraft('');
    setParentIdSelect('default');
    setIsNewTaskModalOpen(true);
  };

  // ----------------------------------------------------------------
  // XÓA TASK KÈM XÓA MATERIALPLAN + PURCHASINGPLAN TƯƠNG ỨNG
  // ----------------------------------------------------------------
  const handleDeleteTask = (task: Task) => {
    // Xóa task
    deleteTask(task.id);

    // Tìm và xóa MaterialPlan khớp theo stt + tên + dự án
    const matchingMaterial = materialPlans.find(
      m => m.projectCode === task.projectCode &&
           m.stt?.trim() === (task.stt || '').trim() &&
           m.jobContent?.trim().toLowerCase() === (task.name || '').trim().toLowerCase()
    );
    if (matchingMaterial) {
      deleteMaterialPlan(matchingMaterial.id);
      // Xóa PurchasingPlan nếu có
      const matchingPurchasing = purchasingPlans.find(
        p => p.projectCode === task.projectCode &&
             p.stt?.trim() === (task.stt || '').trim() &&
             p.content?.trim().toLowerCase() === (task.name || '').trim().toLowerCase()
      );
      if (matchingPurchasing) deletePurchasingPlan(matchingPurchasing.id);
    }
  };


  const openImportPicker = (format: ImportFileFormat) => {
    setCurrentImportFormat(format);
    setIsImportMenuOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // Dynamic spreadsheet import handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentImportFormat === 'pdf' || currentImportFormat === 'docx') {
      triggerToast('Định dạng PDF/DOCX hiện dng để xuất file. Để nhập dữ liệu tiến độ vo bảng, vui lng dng Excel hoặc CSV.', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Reject if this is a Project Cost Plan / Material Plan / Doc tracking / Inventory workbook
        const forbiddenKeywords = ['KẾ HOẠCH VẬT TƯ', 'K HOẠCH VẬT TƯ', 'MUA SẮM HNG HA', 'CHI PH CT', 'LƯƠNG CNG NHẬT', 'THEO DI HỒ SƠ', 'HOSO', 'TỒN', 'NHẬP KHO', 'XUẤT KHO', 'TONKHO', 'NHAPKHO', 'XUATKHO', 'NHN SỰ', 'NHANSU'];
        const isForbiddenWorkbook = wb.SheetNames.some(name => 
          forbiddenKeywords.some(keyword => name.toUpperCase().includes(keyword))
        );
        if (isForbiddenWorkbook) {
          triggerToast('File ny thuộc phn hệ khc (Chi ph/Kho/Nhn sự/Hồ sơ). Vui lng khng nhập vo tab Tiến độ Cng việc!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const importedTasks: any[] = [];
        let createdProjectsCount = 0;

        wb.SheetNames.forEach((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
          if (!rows || rows.length === 0) return;

          const codeUpper = sheetName.toUpperCase().replace(/\s+/g, '_');
          const existingProj = projects.find((p) => p.code.toUpperCase() === codeUpper || p.name.toLowerCase() === sheetName.toLowerCase());

          if (!existingProj) {
            addProject({
              code: codeUpper,
              name: sheetName,
              location: 'Hiện trường mới',
              progressPercent: 0,
              status: 'active',
              activeTeams: 1,
              totalTasks: 0,
              completedTasks: 0,
              issueTasksCount: 0,
              managerName: 'Kỹ sư Nam',
              startDate: todayStamp(),
              endDate: '2025-12-31',
            });
            createdProjectsCount++;
          }

          const targetProjectCode = existingProj ? existingProj.code : codeUpper;

          let startRow = -1;
          let headerRow: any[] = [];
          for (let rIdx = 0; rIdx < Math.min(rows.length, 15); rIdx++) {
            const r = rows[rIdx];
            if (r && (r.includes('STT') || r.includes('stt') || r.includes('Stt') || r.some((cell: any) => String(cell).toLowerCase() === 'stt'))) {
              startRow = rIdx + 1;
              headerRow = r;
              break;
            }
          }

          if (startRow === -1) {
            triggerToast('Khng tm thấy dng tiu đề (STT) trong sheet ' + sheetName, 'warning');
            return;
          }

          const cleanText = (str: any) =>
            String(str || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/đ/g, 'd')
              .trim();

          const getColIdx = (headers: any[], keywords: string[], fallback: number) => {
            const idx = headers.findIndex((h) => {
              const cleaned = cleanText(h);
              return keywords.some((kw) => cleaned.includes(kw));
            });
            return idx >= 0 ? idx : fallback;
          };

          const headerString = headerRow.map(c => String(c || '').toLowerCase()).join('|');
          const isProgress = headerString.includes('nội dung cng việc') || headerString.includes('m tả') || headerString.includes('khối lượng') || headerString.includes('tiến độ') || headerString.includes('đơn vị');
          if (!isProgress) {
            triggerToast('File khng đng cấu trc Tiến độ Cng việc (thiếu cột Nội dung cng việc/Khối lượng/M tả)!', 'warning');
            return;
          }

          const sttCol = getColIdx(headerRow, ['stt'], 0);
          const nameCol = getColIdx(headerRow, ['noi dung', 'mo ta', 'dien giai', 'hang muc'], 1);
          const volCol = getColIdx(headerRow, ['khoi luong'], 2);
          const unitCol = getColIdx(headerRow, ['don vi', 'dvt'], 3);
          const progressCol = getColIdx(headerRow, ['tien do'], -1);
          const purchaseCol = getColIdx(headerRow, ['mua hang', 'vat tu', 'cung cap'], -1);
          const constrCol = getColIdx(headerRow, ['thi cong', 'xay lap'], -1);
          const issueCol = getColIdx(headerRow, ['vuong mac', 'su co', 'ton dong'], -1);
          const issueStatusCol = getColIdx(headerRow, ['trang thai xu ly', 'tt xu ly'], -1);
          const isDoneCol = getColIdx(headerRow, ['hoan thanh', 'da xong'], -1);

          let currentSection = 'Mục chung';
          let currentMainSectionId: string | undefined = undefined;
          let currentSubSectionId: string | undefined = undefined;
          const sttIdMap = new Map<string, string>();

          const isMainSectionName = (name: string): boolean => {
            const norm = name.toLowerCase();
            return norm.includes('phần vttb') || 
                   norm.includes('cung cấp') || 
                   norm.includes('chủ đầu tư') || 
                   norm.includes('nhà thầu') || 
                   norm.startsWith('phần ');
          };

          for (let i = startRow; i < rows.length; i++) {
            const r = rows[i];
            if (!r || (!r[nameCol] && !r[sttCol])) continue;

            const itemName = r[nameCol] || r[sttCol];
            if (!itemName || String(itemName).trim().length === 0) continue;
            if (!/[a-zA-ZÀ-ỹ]/.test(String(itemName))) continue;

            const sttVal = r[sttCol] ? String(r[sttCol]).trim() : '';
            const volVal = volCol >= 0 ? (typeof r[volCol] === 'number' ? r[volCol] : (parseFloat(r[volCol]) || 0)) : 0;
            const unitVal = unitCol >= 0 ? String(r[unitCol] || '').trim() : '';

            // Bỏ qua dng tiu đề phụ hoặc dng rc
            if (sttVal.toLowerCase() === 'stt' || String(itemName).toLowerCase().includes('mo ta cong viec moi thau')) continue;

            const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/i;
            const cleanUnitVal = unitVal.replace(/^[-–—_.\s]+$/, '').trim();
            const cleanStt = String(sttVal || '').trim().replace(/\.$/, '');
            const hasNoDot = !cleanStt.includes('.');
            const isRoman = romanRegex.test(cleanStt);
            const startsWithPhan = String(itemName || '').trim().toUpperCase().startsWith('PHẦN ');
            const hasNoVolumeAndUnit = (volVal === 0 || !volVal) && (!cleanUnitVal || cleanUnitVal === '');
            const isSection = startsWithPhan || (hasNoDot && isMainSectionName(itemName)) || (hasNoDot && hasNoVolumeAndUnit && isRoman);

            if (isSection) {
              currentSection = `${sttVal ? sttVal + '. ' : ''}${itemName}`;
            }

            const rawPurchaseStatus = purchaseCol >= 0 && r[purchaseCol] ? String(r[purchaseCol]) : 'Chưa đặt hàng';
            const rawConstrStatus = constrCol >= 0 && r[constrCol] ? String(r[constrCol]) : 'Chưa thi công';
            const rawProgress = progressCol >= 0 ? (typeof r[progressCol] === 'number' ? r[progressCol] : (parseFloat(r[progressCol]) || 0)) : 0;
            const importedProgress = rawProgress > 1 ? rawProgress / 100 : rawProgress;
            const autoProgress = calculateAutoProgressRatio(rawPurchaseStatus, rawConstrStatus);
            const finalProgress = progressCol >= 0 && rawProgress > 0 ? importedProgress : autoProgress;
            
            const taskId = crypto.randomUUID();
            if (sttVal) sttIdMap.set(sttVal, taskId);
            
            let parentId = undefined;
            if (isSection) {
               currentMainSectionId = taskId;
               currentSubSectionId = undefined;
            } else {
               let isSubFolder = false;
               const nextRow = rows[i + 1];
               if (nextRow) {
                 const nextStt = nextRow[sttCol] ? String(nextRow[sttCol]).trim() : '';
                 if (nextStt && nextStt.startsWith(sttVal + '.')) {
                   isSubFolder = true;
                 }
               }
               if (isSubFolder) {
                 parentId = currentMainSectionId;
                 currentSubSectionId = taskId;
               } else {
                 let foundDottedParent = false;
                 if (sttVal.includes('.')) {
                   const parts = sttVal.split('.');
                   parts.pop();
                   const parentStt = parts.join('.');
                   if (sttIdMap.has(parentStt)) {
                     parentId = sttIdMap.get(parentStt);
                     foundDottedParent = true;
                   }
                 }
                 if (!foundDottedParent) {
                   parentId = currentSubSectionId || currentMainSectionId;
                 }
               }
            }

            importedTasks.push({
              id: taskId,
              stt: sttVal || `${i - startRow + 1}`,
              code: taskId,
              name: String(itemName).trim(),
              projectCode: targetProjectCode,
              projectName: sheetName,
              volume: volVal,
              unit: unitVal,
              progress: finalProgress,
              status: (finalProgress >= 1 ? 'Hoàn thành' : finalProgress > 0 ? 'Đang làm' : 'Chưa làm'),
              purchaseStatus: rawPurchaseStatus,
              constrStatus: rawConstrStatus,
              issue: issueCol >= 0 && r[issueCol] ? String(r[issueCol]) : '',
              issueStatus: issueStatusCol >= 0 && r[issueStatusCol] ? String(r[issueStatusCol]) : '',
              isDone: isDoneCol >= 0 ? (r[isDoneCol] === true || normalizeStatusText(String(r[isDoneCol])) === 'da hoan thanh') : (finalProgress >= 1),
              isSectionHeader: isSection,
              sectionName: currentSection,
              parentId: parentId,
              notes: '',
              assignedEngineerId: engineers[0]?.id || '',
              assignedEngineerName: engineers[0]?.name || '',
            });
          }
        });

        if (importedTasks.length > 0) {
          addTasksBatch(importedTasks);
          triggerToast(`Đ nạp thnh cng ${importedTasks.length} hạng mục từ file Excel!`, 'success');
        }
      } catch (err) {
        console.error('Lỗi đọc file:', err);
        triggerToast('Khng đọc được file. Vui lng kiểm tra lại định dạng v cấu trc dữ liệu.', 'warning');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTaskExportData = () => displayTasks.map((t) => ({
    ['STT']: t.stt,
    ['ĐẦU MỤC CHA']: t.isSectionHeader ? '[TIÊU ĐỀ MỤC]' : t.sectionName || '',
    ['NỘI DUNG CÔNG VIỆC']: t.name,
    ['DỰ ÁN']: t.projectName,
    ['KHỐI LƯỢNG']: t.isSectionHeader ? '' : t.volume,
    ['ĐVT']: t.unit || '',
    ['TIẾN ĐỘ']: t.isSectionHeader ? '' : String(Math.round(t.progress * 100)) + '%',
    ['TÌNH TRẠNG MUA HÀNG']: t.purchaseStatus || '',
    ['TÌNH TRẠNG THI CÔNG']: t.constrStatus || '',
    ['VƯỚNG MẮC/ TỒN ĐỌNG']: t.issue || '',
    ['TT XỬ LÝ']: t.issueStatus || '',
    ['HOÀN THÀNH']: t.isDone ? 'Đã hoàn thành' : 'Chưa',
    ['GHI CHÚ']: t.notes || '',
  }));

  const handleExportFile = (format: ExportFileFormat) => {
    setIsExportMenuOpen(false);
    const exportData = getTaskExportData();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const baseFileName = `Tien_Do_Cong_Viec_${todayStamp()}`;

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu Tiến độ');
      XLSX.writeFile(workbook, `${baseFileName}.xlsx`);
      return;
    }

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      downloadBlob(`﻿${csv}`, `${baseFileName}.csv`, 'text/csv;charset=utf-8;');
      return;
    }

    if (format === 'pdf') {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.setFontSize(14);
      pdf.text('Tien Do Cong Viec', 12, 12);
      pdf.setFontSize(8);

      let y = 22;
      exportData.slice(0, 80).forEach((row, index) => {
        if (y > 190) {
          pdf.addPage();
          y = 14;
        }
        const line = `${index + 1}. ${row['STT']} | ${row['NỘI DUNG CÔNG VIỆC']} | ${row['DỰ ÁN']} | ${row['TIẾN ĐỘ']} | ${row['HOÀN THÀNH']}`;
        const wrapped = pdf.splitTextToSize(line, 270);
        pdf.text(wrapped, 12, y);
        y += Math.max(7, wrapped.length * 4);
      });
      pdf.save(`${baseFileName}.pdf`);
      return;
    }

    const rowsHtml = exportData.map((row) => (
      `<tr>${Object.values(row).map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`
    )).join('');
    const headerHtml = Object.keys(exportData[0] || {}).map((key) => `<th>${escapeHtml(key)}</th>`).join('');
    const docHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd5e1;padding:4px;text-align:left}th{background:#eff6ff}</style></head><body><h2>Tiến Độ Cng Việc</h2><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    downloadBlob(docHtml, `${baseFileName}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8;');
  };
  const applyOcrToNewTaskForm = (data: WebOcrExtractedData) => {
    const matchedProject = data.projectName
      ? projects.find((project) => {
          const projectName = project.name.toLowerCase();
          const ocrProjectName = data.projectName.toLowerCase();
          return projectName.includes(ocrProjectName) || ocrProjectName.includes(projectName) || project.code.toLowerCase() === ocrProjectName;
        })
      : null;

    const ocrName = data.taskName || data.materialName;
    if (ocrName) setName(ocrName);
    if (matchedProject) setProjectCode(matchedProject.code);
    if (data.quantity) {
      const normalizedQuantity = Number.parseFloat(data.quantity.replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(normalizedQuantity) && normalizedQuantity > 0) setVolume(normalizedQuantity);
    }
    if (data.unit) setUnit(data.unit);

    const isImage = data.sourceFileType?.startsWith('image/') || (!data.sourceFileType && !data.sourceFileName?.match(/\.(xlsx|xls|csv|txt|docx|pdf)$/i));
    const labelHeader = isImage ? 'OCR gốc:' : 'Nội dung tệp gốc:';

    const ocrNotes = [
      data.materialCode ? `M vật tư: ${data.materialCode}` : '',
      data.materialName ? `Vật tư: ${data.materialName}` : '',
      data.location ? `Địa điểm: ${data.location}` : '',
      data.dueDate ? `Hạn/Ngy: ${data.dueDate}` : '',
      data.note ? `Ghi ch: ${data.note}` : '',
      (isImage && data.rawText) ? `OCR gốc:\n${data.rawText}` : '',
    ].filter(Boolean).join('\n');

    setOcrIssueDraft(ocrNotes);
    setIsSectionHeader(false);
    triggerToast('Đ trch dữ liệu phụ lục vo form thm hạng mục. Kiểm tra lại trước khi lưu.', 'success');
  };
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const proj = projects.find((p) => p.code === projectCode);
    const eng = engineers.find((e) => e.id === engineerId);

    const finalSectionName = isSectionHeader ? name.trim() : activeSectionName.trim();
    if (!isSectionHeader && !finalSectionName) {
      triggerToast('Vui l\u00f2ng t\u1ea1o ho\u1eb7c ch\u1ecdn \u0110\u1ea7u m\u1ee5c cha tr\u01b0\u1edbc khi th\u00eam H\u1ea1ng m\u1ee5c nh\u1ecf.', 'warning');
      return;
    }

    const nextStt = String(tasks.filter(t => t.projectCode === projectCode).length + 1);
    const nextProgress = isSectionHeader ? 0 : calculateAutoProgressRatio(purchaseStatus, constrStatus);
    const createdSectionName = finalSectionName;
    const taskStt = stt || '';
    const taskParentId = parentIdSelect !== 'default' ? parentIdSelect : undefined;
    // Validate rằng parentId thực sự tồn tại trong tasks array (tránh FK error)
    const validatedParentId = taskParentId && tasks.find(t => t.id === taskParentId) ? taskParentId : undefined;

    const newTaskId = await addTask({
      stt: taskStt,
      code: `TSK-${Date.now()}`,
      name,
      projectCode,
      projectName: proj ? proj.name : projectCode,
      volume: isSectionHeader ? 0 : volume,
      unit: isSectionHeader ? '' : unit,
      progress: nextProgress,
      status: taskStatusFromProgress(isSectionHeader ? 0 : nextProgress),
      purchaseStatus: isSectionHeader ? '' : purchaseStatus,
      constrStatus: isSectionHeader ? '' : constrStatus,
      isDone: !isSectionHeader && nextProgress >= 1,
      isSectionHeader,
      sectionName: finalSectionName,
      parentId: validatedParentId,
      assignedEngineerId: engineerId,
      assignedEngineerName: eng?.name || '',
    });

    // ----------------------------------------------------------------
    // ĐỒNG BỘ SANG KẾ HOẠCH VẬT TƯ
    // ----------------------------------------------------------------
    if (!isSectionHeader) {
      // Kiểm tra đã có chưa — check theo cả STT lẫn tên để tránh false positive
      const existingMaterial = materialPlans.find(
        m => m.projectCode === projectCode &&
             m.stt?.trim() === taskStt.trim() &&
             m.jobContent?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!existingMaterial) {
        // Tìm section cha trong MaterialPlan theo sectionName
        const sectionInMaterial = materialPlans.find(
          m => m.projectCode === projectCode &&
               (String(m.notes || '').toLowerCase().includes('[section]') ||
                /^[IVXLCDM]+$/i.test(String(m.stt || '').trim())) &&
               m.jobContent?.trim().toLowerCase() === finalSectionName.trim().toLowerCase()
        );

        const normalizeVn = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
        const sectionIsContractor =
          (sectionInMaterial && (sectionInMaterial.supplyScope === 'contractor' || normalizeVn(sectionInMaterial.jobContent || '').includes('nha thau cung cap') || normalizeVn(sectionInMaterial.jobContent || '').includes('ben b cung cap'))) ||
          normalizeVn(finalSectionName).includes('nha thau cung cap') || normalizeVn(finalSectionName).includes('ben b cung cap');

        const sectionIsOwner =
          (sectionInMaterial && (sectionInMaterial.supplyScope === 'owner' || normalizeVn(sectionInMaterial.jobContent || '').includes('chu dau tu cung cap') || normalizeVn(sectionInMaterial.jobContent || '').includes('ben a cung cap'))) ||
          normalizeVn(finalSectionName).includes('chu dau tu cung cap') || normalizeVn(finalSectionName).includes('ben a cung cap');

        // Nếu chưa có section này trong MaterialPlan, tạo section trước
        let sectionMaterialId = sectionInMaterial?.id;
        let sectionPurchasingId: string | undefined = undefined;

        if (!sectionInMaterial && finalSectionName) {
          const sectionCount = materialPlans.filter(
            m => m.projectCode === projectCode &&
                 (String(m.notes || '').toLowerCase().includes('[section]') ||
                  /^[IVXLCDM]+$/i.test(String(m.stt || '').trim()))
          ).length;
          const sectionTask = tasks.find(
            t => t.projectCode === projectCode && t.isSectionHeader &&
                 (t.sectionName === finalSectionName || t.name === finalSectionName)
          );
          const sectionStt = sectionTask?.stt || '';
          sectionMaterialId = await addMaterialPlan({
            projectCode,
            stt: sectionStt,
            jobContent: finalSectionName,
            unit: '',
            contractVolume: 0,
            progressStatus: 'Chưa thi công',
            orderedVolume: 0,
            orderedStatus: 'Chưa đặt hàng',
            supplyScope: 'unknown',
            notes: sectionIsOwner ? '[section][owner]' : '[section]',
          }, true);
          
          sectionPurchasingId = await addPurchasingPlan({
            projectCode,
            stt: sectionStt,
            content: finalSectionName,
            unit: '',
            volumeContract: 0,
            volumeOrder: 0,
            unitPrice: 0,
            vatRate: 10,
            vatAmount: 0,
            totalAmount: 0,
            prepayPercent: 0,
            prepayAmount: 0,
            remainingAmount: 0,
            orderStatus: 'Chưa đặt hàng',
            contractStatus: 'Chưa ký',
            invoiceStatus: 'Chưa xuất',
            notes: sectionIsOwner ? '[section][owner]' : '[section]',
          }, true);
        }

        // Tìm section cha trong PurchasingPlan theo sectionName
        const sectionInPurchasing = sectionPurchasingId 
          ? { id: sectionPurchasingId } 
          : purchasingPlans.find(
              p => p.projectCode === projectCode &&
                   (String(p.notes || '').toLowerCase().includes('[section]') ||
                    /^[IVXLCDM]+$/i.test(String(p.stt || '').trim())) &&
                   p.content?.trim().toLowerCase() === finalSectionName.trim().toLowerCase()
            );

        // (Các biến sectionIsContractor và sectionIsOwner đã được định nghĩa ở trên)

        // Tìm item cha trong MaterialPlan tương ứng với task cha (để gắn parentId đúng)
        const parentTask = validatedParentId ? tasks.find(t => t.id === validatedParentId) : null;
        const parentMaterialPlan = parentTask ? materialPlans.find(
          m => m.projectCode === projectCode &&
               m.stt?.trim() === parentTask.stt.trim() &&
               m.jobContent?.trim().toLowerCase() === parentTask.name.trim().toLowerCase()
        ) : null;
        // Tìm item cha trong PurchasingPlan tương ứng với task cha
        const parentPurchasingPlan = parentTask ? purchasingPlans.find(
          p => p.projectCode === projectCode &&
               p.stt?.trim() === parentTask.stt.trim() &&
               p.content?.trim().toLowerCase() === parentTask.name.trim().toLowerCase()
        ) : null;

        const itemNotes = sectionIsContractor ? '[contractor]' : '';
        const itemSupplyScope: 'contractor' | 'unknown' = sectionIsContractor ? 'contractor' : 'unknown';

        // Tạo item trong MaterialPlan, gắn parentId vào item cha (nếu có) thay vì section header
        await addMaterialPlan({
          projectCode,
          stt: taskStt,
          jobContent: name,
          unit: unit,
          contractVolume: volume,
          progressStatus: 'Chưa thi công',
          orderedVolume: 0,
          orderedStatus: 'Chưa đặt hàng',
          supplyScope: itemSupplyScope,
          notes: itemNotes,
          parentId: parentMaterialPlan?.id || sectionMaterialId,
        }, true); // skipLog = true

        if (!sectionIsOwner) {
          // Tạo PurchasingPlan cho mọi hạng mục (trừ hạng mục của chủ đầu tư)
          await addPurchasingPlan({
            projectCode,
            stt: taskStt,
            content: name,
            unit: unit,
            volumeContract: volume,
            volumeOrder: 0,
            unitPrice: 0,
            vatRate: 10,
            vatAmount: 0,
            totalAmount: 0,
            prepayPercent: 0,
            prepayAmount: 0,
            remainingAmount: 0,
            orderStatus: 'Chưa đặt hàng',
            contractStatus: 'Chưa ký',
            invoiceStatus: 'Chưa xuất',
            notes: itemNotes,
            parentId: parentPurchasingPlan?.id || sectionInPurchasing?.id,
          }, true); // skipLog = true
        }
      }
    }

    setName('');
    setStt('');
    setOcrIssueDraft('');
    setCustomSectionInput('');

    if (isSectionHeader) {
      // Đồng bộ section header sang Kế hoạch Vật tư
      const existingSection = materialPlans.find(
        m => m.projectCode === projectCode &&
             (String(m.notes || '').toLowerCase().includes('[section]') || /^[IVXLCDM]+$/i.test(String(m.stt || '').trim())) &&
             m.jobContent?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!existingSection) {
        await addMaterialPlan({
          projectCode,
          stt: taskStt,
          jobContent: name,
          unit: '',
          contractVolume: 0,
          progressStatus: 'Chưa thi công',
          orderedVolume: 0,
          orderedStatus: 'Chưa đặt hàng',
          supplyScope: 'unknown',
          notes: '[section]',
        });
        // Đồng bộ section header sang Mua hàng
        await addPurchasingPlan({
          projectCode,
          stt: taskStt,
          content: name,
          unit: '',
          volumeContract: 0,
          volumeOrder: 0,
          unitPrice: 0,
          vatRate: 10,
          vatAmount: 0,
          totalAmount: 0,
          prepayPercent: 0,
          prepayAmount: 0,
          remainingAmount: 0,
          orderStatus: 'Chưa đặt hàng',
          contractStatus: 'Chưa ký',
          invoiceStatus: 'Chưa xuất',
          notes: '[section]',
        });
      }
      setIsSectionHeader(false);
      setSectionSelect(createdSectionName);
      triggerToast('Đã tạo Đầu mục lớn. Bạn có thể thêm Hạng mục nhỏ trong đầu mục này.', 'success');
      return;
    }

    setIsNewTaskModalOpen(false);
    setIsSectionHeader(false);
    setSectionSelect('default');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const code = newProjCode.trim() ? newProjCode.trim().toUpperCase() : 'PROJ-' + Math.floor(Math.random() * 1000);
    const selectedManager = engineers.find((eng) => eng.id === newProjManagerId);
    const createdManager =
      newProjManagerId === '__NEW__' && newManagerName.trim()
        ? addEngineer({
            name: newManagerName.trim(),
            title: newManagerTitle.trim() || 'Chỉ huy trưởng cng trnh',
            avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
            phone: '',
            email: '',
          })
        : null;

    const managerName = createdManager?.name || selectedManager?.name || 'Kỹ sư Nam';

    addProject({
      code,
      name: newProjName,
      location: newProjLocation || 'Hiện trường mới',
      progressPercent: 0,
      status: 'active',
      activeTeams: 1,
      totalTasks: 0,
      completedTasks: 0,
      issueTasksCount: 0,
      managerName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2025-12-31',
    });

    setIsNewProjectModalOpen(false);
    setSelectedProjectCode(code);
    setNewProjName('');
    setNewProjCode('');
    setNewProjLocation('');
    setNewProjManagerId(createdManager?.id || engineers[0]?.id || '');
    setNewManagerName('');
    setNewManagerTitle('Chỉ huy trưởng cng trnh');
  };

  const tasksForColumnFilters = tasks.filter((t) => selectedProjectCode === 'all' || t.projectCode === selectedProjectCode);
  const columnSections = Array.from(new Set(tasksForColumnFilters.map((t) => t.sectionName).filter((value): value is string => !!value && value.trim().length > 0))).sort((a, b) => a.localeCompare(b, 'vi'));
  const columnUnits = Array.from(new Set(tasksForColumnFilters.map((t) => t.unit).filter((value): value is string => !!value && value.trim().length > 0))).sort((a, b) => a.localeCompare(b, 'vi'));
  const columnPurchaseStatuses = Array.from(new Set(tasksForColumnFilters.map((t) => t.purchaseStatus).filter((value): value is string => !!value && value.trim().length > 0))).sort((a, b) => a.localeCompare(b, 'vi'));
  const columnConstrStatuses = Array.from(new Set(tasksForColumnFilters.map((t) => t.constrStatus).filter((value): value is string => !!value && value.trim().length > 0))).sort((a, b) => a.localeCompare(b, 'vi'));

  // Filter Tasks by Project and visible table columns
  const displayTasks = tasks.filter((t) => {
    const matchesProj = selectedProjectCode === 'all' || t.projectCode === selectedProjectCode;

    // Column Filters
    const pct = Math.round((t.progress || 0) * 100);
    const matchesSection = filterSection === 'all' || t.sectionName === filterSection;
    const matchesUnit = filterUnit === 'all' || t.unit === filterUnit;
    const matchesProgress =
      filterProgress === 'all'
        ? true
        : filterProgress === '0'
        ? pct === 0
        : filterProgress === '1-49'
        ? pct >= 1 && pct <= 49
        : filterProgress === '50-99'
        ? pct >= 50 && pct <= 99
        : pct >= 100;
    const matchesPurchase = filterPurchase === 'all' || t.purchaseStatus === filterPurchase;
    const matchesConstr = filterConstr === 'all' || t.constrStatus === filterConstr;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.issue && t.issue.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.sectionName && t.sectionName.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
      matchesProj &&
      matchesSection &&
      matchesUnit &&
      matchesProgress &&
      matchesPurchase &&
      matchesConstr &&
      matchesSearch
    );
  });

  const toRoman = (num: number): string => {
    const roman: Record<string, number> = {
      M: 1000, CM: 900, D: 500, CD: 400,
      C: 100, XC: 90, L: 50, XL: 40,
      X: 10, IX: 9, V: 5, IV: 4, I: 1
    };
    let str = '';
    for (let i of Object.keys(roman)) {
      let q = Math.floor(num / roman[i]);
      num -= q * roman[i];
      str += i.repeat(q);
    }
    return str;
  };

  const groupedTasks = React.useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    const order: string[] = [];
    displayTasks.forEach((t) => {
      const sec = t.sectionName || 'Khc';
      if (!groups[sec]) {
        groups[sec] = [];
        order.push(sec);
      }
      groups[sec].push(t);
    });

    order.sort((a, b) => {
      const leftHeader = groups[a].find((task) => task.isSectionHeader) || groups[a][0];
      const rightHeader = groups[b].find((task) => task.isSectionHeader) || groups[b][0];
      return compareTaskStt(leftHeader?.stt, rightHeader?.stt);
    });

    const flattened: any[] = [];
    order.forEach((sec, groupIndex) => {
      const sectionHeader = groups[sec].find(t => t.isSectionHeader);
      const items = groups[sec].filter(t => !t.isSectionHeader);
      
      const map = new Map<string, any>();
      const roots: any[] = [];
      items.forEach(t => map.set(t.id, { ...t, children: [] }));
      items.forEach(t => {
        if (t.parentId && map.has(t.parentId)) {
          map.get(t.parentId)!.children.push(map.get(t.id));
        } else {
          roots.push(map.get(t.id));
        }
      });
      
      const flattenTree = (nodes: any[], depth: number = 0, prefix: string = '', sectionKey: string = '') => {
        nodes.sort((a, b) => {
          const sttCompare = compareTaskStt(a.stt, b.stt);
          if (sttCompare !== 0) return sttCompare;
          return a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
        });
        nodes.forEach((node, idx) => {
          const currentNum = (idx + 1).toString();
          const computedStt = node.stt || (depth === 1 ? currentNum : (depth > 1 ? `${prefix}.${currentNum}` : currentNum));
          flattened.push({ ...node, depth, computedStt, _sectionKey: sectionKey });
          flattenTree(node.children, depth + 1, computedStt, sectionKey);
        });
      };
      
      if (sectionHeader) {
        flattened.push({ ...sectionHeader, depth: 0, computedStt: sectionHeader.stt || '', _sectionKey: sec });
      }
      flattenTree(roots, sectionHeader ? 1 : 0, '', sec);
    });
    return flattened;
  }, [displayTasks]);

  const totalPureItems = groupedTasks.filter((t) => !t.isSectionHeader).length;
  const completedPureItems = groupedTasks.filter((t) => !t.isSectionHeader && (t.isDone || t.progress >= 1)).length;

  const NotificationButton: React.FC = () => {
    const { notifications, markNotificationRead, clearNotifications } = useRealtimeStore();
    const [showNotifPopover, setShowNotifPopover] = React.useState(false);
    const unreadCount = notifications.filter((item) => !item.read).length;
    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowNotifPopover(!showNotifPopover)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors relative border border-slate-200"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>
        {showNotifPopover && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
              <button onClick={clearNotifications} className="text-[11px] text-primary font-bold hover:underline">Xóa tất cả</button>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">Không có thông báo nào</div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationRead(notification.id)}
                    className={`p-3 text-xs hover:bg-slate-50 cursor-pointer flex gap-3 ${!notification.read ? 'bg-blue-50/50 font-medium' : 'opacity-70'}`}
                  >
                    <span className="material-symbols-outlined text-primary text-base flex-shrink-0">{notification.icon || 'info'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-0.5">
                        <span className="font-bold text-slate-800 truncate">{notification.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{notification.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-tight">{notification.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-0 pt-0 pb-0 space-y-0 flex flex-col flex-1 overflow-hidden">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
        className="hidden"
      />

      <section className="task-management-screen bg-white border-y border-r border-slate-200 shadow-xs flex flex-col flex-1 overflow-hidden">
      {/* Page Header */}
      <div className="px-5 py-3 flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {selectedProjectFromUrl && (
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all hover:bg-slate-50"
              title="Quay lại tất cả dự án"
              aria-label="Quay lại tất cả dự án"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="truncate text-xl font-extrabold leading-tight tracking-tight text-slate-900">Quản lý Tiến độ Công việc</h2>
            {selectedProjectFromUrl && (
              <div className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <span className="truncate">Dự án: {currentProject?.name || selectedProjectFromUrl}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TOOLBAR BỘ LỌC */}
      <div className="px-3 py-3 space-y-3">
        {/* Row 1: DETAILED ATTRIBUTE FILTERS */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Lọc chi tiết:
            </span>



            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="h-8 w-44 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Dau muc cha: Tat ca</option>
              {columnSections.map((value) => (
                <option key={value} value={value}>{truncateText(value, 42)}</option>
              ))}
            </select>

            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">ĐVT: Tất cả</option>
              {columnUnits.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={filterProgress}
              onChange={(e) => setFilterProgress(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tien do: Tat ca</option>
              <option value="0">0%</option>
              <option value="1-49">1% - 49%</option>
              <option value="50-99">50% - 99%</option>
              <option value="100">100%</option>
            </select>

            <select
              value={filterPurchase}
              onChange={(e) => setFilterPurchase(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Mua hang: Tat ca</option>
              {columnPurchaseStatuses.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={filterConstr}
              onChange={(e) => setFilterConstr(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Thi cong: Tat ca</option>
              {columnConstrStatuses.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base text-emerald-700">download</span>
                <span>Xuất file</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                  {([
                    ['xlsx', 'Excel (.xlsx)', 'table_view'],
                    ['csv', 'CSV (.csv)', 'csv'],
                    ['pdf', 'PDF (.pdf)', 'picture_as_pdf'],
                    ['docx', 'Word (.docx)', 'description'],
                  ] as Array<[ExportFileFormat, string, string]>).map(([format, label, icon]) => (
                    <button
                      key={format}
                      onClick={() => handleExportFile(format)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-emerald-600">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Search */}
            <div className="relative w-full md:w-56">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Tm nhanh cng việc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Main Data Table */}
      <div className="border-t border-slate-200 flex flex-col flex-1 overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="min-w-[1060px] w-full text-left border-collapse text-[11px] table-fixed">
            <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="sticky left-0 z-20 py-2 px-1 w-[42px] bg-slate-50 bg-clip-padding text-center border-b border-r border-slate-200 whitespace-nowrap">STT</th>
                <th className="sticky left-[42px] z-20 py-2 px-2 w-[400px] min-w-[400px] bg-slate-50 bg-clip-padding border-b border-r border-slate-200 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">NỘI DUNG</th>
                <th className="py-2 px-1 w-[46px] min-w-[46px] max-w-[46px] text-right border-b border-slate-200 whitespace-nowrap">KL</th>
                <th className="py-2 px-1 w-[46px] min-w-[46px] max-w-[46px] text-center border-b border-slate-200 whitespace-nowrap">ĐVT</th>
                <th className="py-2 px-1 w-[46px] min-w-[46px] max-w-[46px] text-center border-b border-slate-200 whitespace-nowrap">%</th>
                <th className="py-2 px-1 w-[120px] text-center border-b border-slate-200 whitespace-nowrap">MUA HÀNG</th>
                <th className="py-2 px-1 w-[120px] text-center border-b border-slate-200 whitespace-nowrap">THI CÔNG</th>
                <th className="py-2 px-1 w-[115px] text-red-600 font-bold border-b border-slate-200 whitespace-nowrap">VƯỚNG MẮC</th>
                <th className="py-2 px-1 w-[82px] border-b border-slate-200 whitespace-nowrap">XỬ LÝ</th>
                <th className="py-2 px-1 w-[58px] text-center border-b border-slate-200 whitespace-nowrap">XONG</th>
                <th className="sticky right-0 z-20 bg-slate-50 bg-clip-padding py-2 px-1 w-full min-w-[120px] border-b border-l border-slate-200 whitespace-nowrap shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">GHI CHÚ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {groupedTasks.length === 0 ? (<tr><td colSpan={12} className="p-8 text-center text-slate-400 whitespace-nowrap">Không có hạng mục nào phù hợp với bộ lọc đã chọn</td></tr>) : (
                groupedTasks.filter((t) => {
                  if (t.isSectionHeader) return true;
                  return !collapsedSections.has(t._sectionKey || '');
                }).map((t, idx) => {
                  if (t.isSectionHeader) {
                    const isCollapsed = collapsedSections.has(t._sectionKey || '');
                    return (
                      <tr key={t.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                        <td onClick={() => handleOpenEditModal(t)} className="sticky left-0 z-10 py-2 px-1 bg-blue-50/90 border-r border-blue-200 text-center font-mono font-extrabold text-xs text-primary cursor-pointer hover:underline whitespace-nowrap">{t.computedStt || t.stt}</td>
                        <td colSpan={10} className="sticky left-[42px] z-10 py-2 px-2 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSection(t._sectionKey || ''); }}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                              title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                            >
                              <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                            </button>
                            <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                            <span onClick={() => handleOpenEditModal(t)} className="truncate cursor-pointer hover:underline flex-1">{t.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleAddSubtask(t); }} className="flex-shrink-0 p-0.5 rounded text-blue-300 hover:text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center" title="Thêm mục con"><span className="material-symbols-outlined text-base">add_circle</span></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t); }} className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-100 transition-colors inline-flex items-center" title="Xoá"><span className="material-symbols-outlined text-base">delete</span></button>
                          </div>
                        </td>
                        <td className="sticky right-0 z-10 bg-blue-50/90 border-l border-blue-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] py-2 px-1 text-slate-500 truncate" title={cleanNotes(t.notes)}>
                          {cleanNotes(t.notes)}
                        </td>
                      </tr>
                    );
                  }
                  const pct = Math.round((t.progress || 0) * 100);
                  const isFinished = t.isDone || pct >= 100;
                  const depth = (t as any).depth || 0;
                  const paddingLeft = depth > 1 ? `${(depth - 1) * 1.5}rem` : '0';
                  
                  let rowBg = 'bg-white';
                  let stickyBg = 'bg-white';
                  let fontStyle = 'font-bold text-slate-900';
                  let sttStyle = 'font-bold text-slate-400';
                  
                  if (depth === 1) {
                    rowBg = 'bg-slate-50';
                    stickyBg = 'bg-slate-50';
                    fontStyle = 'font-bold text-slate-900';
                    sttStyle = 'font-bold text-slate-600';
                  } else if (depth === 2) {
                    fontStyle = 'font-semibold text-slate-700';
                    sttStyle = 'font-semibold text-slate-400';
                  } else if (depth >= 3) {
                    fontStyle = 'font-medium text-slate-600 text-[10.5px]';
                    sttStyle = 'font-medium text-slate-400 text-[10.5px]';
                  }
                  
                  if (t.issue) {
                    rowBg = 'bg-amber-50/50';
                    stickyBg = 'bg-[#fffbeb]';
                  } else if (isFinished) {
                    rowBg = 'bg-emerald-50/40';
                    stickyBg = 'bg-[#ecfdf5]';
                  }
                  
                  const rowClass = `hover:bg-slate-100 transition-colors border-b border-slate-50 ${rowBg}`;

                  return (
                    <tr key={t.id} className={rowClass} onDoubleClick={() => handleOpenEditModal(t)}>
                      <td className={`sticky left-0 z-10 py-1.5 px-1 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 font-mono text-center whitespace-nowrap ${sttStyle}`}>
                        {editingCell?.id === t.id && editingCell?.field === 'stt' ? (
                          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 font-bold focus:outline-primary text-[10px]" />
                        ) : (
                          <span onClick={() => startEditing(t.id, 'stt', t.computedStt || t.stt)} className="cursor-pointer hover:bg-slate-200/50 block w-full px-1">{t.computedStt || t.stt || idx + 1}</span>
                        )}
                      </td>
                      <td className={`sticky left-[42px] z-10 py-1.5 px-2 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] leading-tight transition-colors truncate ${fontStyle}`} title={t.name}>
                        {editingCell?.id === t.id && editingCell?.field === 'name' ? (
                          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full border rounded px-1 py-0.5 bg-white text-slate-900 font-bold focus:outline-primary text-[10.5px]" />
                        ) : (
                          <div style={{ paddingLeft }} className="flex items-center gap-1">
                            {depth > 1 && <span className="material-symbols-outlined text-[12px] text-slate-400 flex-shrink-0">subdirectory_arrow_right</span>}
                            <span onClick={() => startEditing(t.id, 'name', t.name)} className="truncate flex-1 cursor-pointer hover:underline hover:text-blue-600 block">{t.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleAddSubtask(t); }} className="flex-shrink-0 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center" title="Thêm mục con"><span className="material-symbols-outlined text-[14px]">add_circle</span></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t); }} className="flex-shrink-0 p-0.5 rounded text-slate-300 hover:text-red-600 hover:bg-red-100 transition-colors inline-flex items-center" title="Xoá"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {editingCell?.id === t.id && editingCell?.field === 'volume' ? (
                          <input type="number" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full text-right border rounded px-0.5 py-0.5 bg-white text-slate-900 font-bold focus:outline-primary text-[10px]" />
                        ) : (
                          <span onClick={() => startEditing(t.id, 'volume', t.volume)} className="cursor-pointer hover:text-blue-600 hover:bg-slate-100 block w-full px-1">{t.volume ? t.volume.toLocaleString('vi-VN') : '-'}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono text-slate-500 whitespace-nowrap">
                        {editingCell?.id === t.id && editingCell?.field === 'unit' ? (
                          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 focus:outline-primary text-[10px]" />
                        ) : (
                          <span onClick={() => startEditing(t.id, 'unit', t.unit)} className="cursor-pointer hover:bg-slate-100 block w-full">{t.unit || '-'}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center whitespace-nowrap">
                        <span className={'inline-flex min-w-10 items-center justify-center px-1.5 py-0.5 font-mono font-bold text-[10px] rounded border ' + (isFinished ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : pct > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>{pct}%</span>
                      </td>
                      <td className="py-1.5 px-1 text-center whitespace-nowrap"><select value={t.purchaseStatus || 'Chưa đặt hàng'} onChange={(e) => { const nextPurchaseStatus = e.target.value; const nextProgress = calculateAutoProgressRatio(nextPurchaseStatus, t.constrStatus); updateTask(t.id, { purchaseStatus: nextPurchaseStatus, progress: nextProgress, isDone: nextProgress >= 1, status: nextProgress >= 1 ? 'Hoàn thành' : nextProgress > 0 ? 'Đang làm' : 'Chưa làm' }); }} className="w-full min-w-0 rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[10px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white">{PURCHASE_STATUS_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}</select></td>
                      <td className="py-1.5 px-1 text-center whitespace-nowrap"><select value={t.constrStatus || 'Chưa thi công'} onChange={(e) => { const nextConstrStatus = e.target.value; const nextProgress = calculateAutoProgressRatio(t.purchaseStatus, nextConstrStatus); updateTask(t.id, { constrStatus: nextConstrStatus, progress: nextProgress, isDone: nextProgress >= 1, status: nextProgress >= 1 ? 'Hoàn thành' : nextProgress > 0 ? 'Đang làm' : 'Chưa làm' }); }} className="w-full min-w-0 rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[10px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white">{CONSTRUCTION_STATUS_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}</select></td>
                      <td className="py-1.5 px-1 font-semibold text-red-600 truncate" title={t.issue || ''}>
                        {editingCell?.id === t.id && editingCell?.field === 'issue' ? (
                          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full border rounded px-0.5 py-0.5 bg-white text-red-600 font-bold focus:outline-primary text-[10px]" />
                        ) : (
                          <span onClick={() => startEditing(t.id, 'issue', t.issue)} className="cursor-pointer hover:underline hover:bg-slate-100 block w-full px-1">
                            {t.issue ? (<span className="inline-flex items-center gap-1 whitespace-nowrap truncate"><span className="material-symbols-outlined text-red-500 text-xs flex-shrink-0">warning</span><span className="truncate">{t.issue}</span></span>) : (<span className="text-slate-300">-</span>)}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-slate-600 truncate" title={t.issueStatus || ''}>
                        {editingCell?.id === t.id && editingCell?.field === 'issueStatus' ? (
                          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-600 font-bold focus:outline-primary text-[10px]" />
                        ) : (
                          <span onClick={() => startEditing(t.id, 'issueStatus', t.issueStatus)} className="cursor-pointer hover:underline hover:bg-slate-100 block w-full px-1">{t.issueStatus || <span className="text-slate-300">-</span>}</span>
                        )}
                      </td>
                      <td onClick={() => handleOpenEditModal(t)} className="py-1.5 px-1 text-center cursor-pointer"><span className={'material-symbols-outlined text-sm ' + (isFinished ? 'text-emerald-600' : 'text-slate-300')}>{isFinished ? 'check_circle' : 'radio_button_unchecked'}</span></td>
                      <td className={`sticky right-0 z-10 py-1.5 px-1 ${stickyBg} group-hover:bg-slate-100 border-l border-slate-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-slate-500 truncate`} title={cleanNotes(t.notes)}>
                        {editingCell?.id === t.id && editingCell?.field === 'notes' ? (
                          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={() => saveEditing(t)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(t); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-700 font-bold focus:outline-primary text-[10px]" />
                        ) : (
                          <span onClick={() => startEditing(t.id, 'notes', t.notes)} className="cursor-pointer hover:underline hover:bg-slate-100 block w-full px-1">{cleanNotes(t.notes) || <span className="text-slate-300">-</span>}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Footer */}
      </div>


      </section>
      {/* end-task-management-screen */}
      {/* EDIT TASK MODAL */}
      <Modal
        isOpen={isEditTaskModalOpen}
        onClose={() => setIsEditTaskModalOpen(false)}
        title={editingTask?.isSectionHeader ? 'Chỉnh sửa Đầu mục cha' : 'Chỉnh sửa Hạng mục Thi công'}
      >
        <form onSubmit={handleSaveEditTask} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold text-slate-700 mb-1">STT / Mã</label><input type="text" value={editStt} onChange={(e) => setEditStt(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono font-bold" /></div>
            <div className="col-span-2"><label className="block font-bold text-slate-700 mb-1">Dự án</label><input type="text" disabled value={editingTask?.projectName || ''} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-500 cursor-not-allowed" /></div>
          </div>
          {editingTask && !editingTask.isSectionHeader && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold text-slate-700 mb-1">Thuộc Đầu mục cha</label><select value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/50 font-bold text-primary">{uniqueSectionsForProj.map((sec) => (<option key={sec} value={sec}>{truncateText(sec, 55)}</option>))}<option value="__CUSTOM__">+ Nhập Đầu mục cha mới...</option></select>{editSectionName === '__CUSTOM__' && (<input type="text" required placeholder="VD: XIII. HỆ THỐNG ĐIỆN CHIẾU SÁNG" value={editCustomSection} onChange={(e) => setEditCustomSection(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold" />)}</div>
              <div><label className="block font-bold text-slate-700 mb-1">Thuộc Hạng mục cha (tuỳ chọn)</label><select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"><option value="">-- Không có --</option>{tasks.filter(t => t.projectCode === editingTask.projectCode && !t.isSectionHeader && t.sectionName === editSectionName && t.id !== editingTask.id).map(t => (<option key={t.id} value={t.id}>{truncateText(t.name, 40)}</option>))}</select></div>
            </div>
          )}
          <div><label className="block font-bold text-slate-700 mb-1">Nội dung Công việc *</label><textarea required rows={4} value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold" /></div>
          {editingTask && !editingTask.isSectionHeader && (<>
            <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Khối lượng</label><input type="number" value={editVolume} onChange={(e) => setEditVolume(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono" /></div><div><label className="block font-bold text-slate-700 mb-1">Đơn vị tính (ĐVT)</label><input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label><select value={editPurchaseStatus} onChange={(e) => setEditPurchaseStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{PURCHASE_STATUS_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}</select></div><div><label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label><select value={editConstrStatus} onChange={(e) => setEditConstrStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{CONSTRUCTION_STATUS_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}</select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-red-600 mb-1">Vướng mắc / Tồn đọng</label><input type="text" placeholder="VD: Thiếu vật tư cáp..." value={editIssue} onChange={(e) => setEditIssue(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-red-50/30 text-red-700 font-medium" /></div><div><label className="block font-bold text-slate-700 mb-1">Trạng thái xử lý</label><input type="text" placeholder="VD: Yêu cầu cấp bổ sung..." value={editIssueStatus} onChange={(e) => setEditIssueStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Ghi chú</label><input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Ghi chú thêm cho dòng công việc" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div><div><label className="block font-bold text-slate-700 mb-1">Kỹ sư phụ trách</label><select value={editEngineerId} onChange={(e) => setEditEngineerId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{engineers.map((eng) => (<option key={eng.id} value={eng.id}>{eng.name} ({eng.title})</option>))}</select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Tiến độ tự tính (%)</label><div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-800">{calculateAutoProgressPercent(editPurchaseStatus, editConstrStatus)}%</div></div><div><label className="block font-bold text-slate-700 mb-1">Hoàn thành</label><div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800">{calculateAutoProgressRatio(editPurchaseStatus, editConstrStatus) >= 1 ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</div></div></div>
          </>)}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100"><button type="button" onClick={() => setIsEditTaskModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Lưu Thay Đổi</button></div>
        </form>
      </Modal>

      {/* SLEEK NEW TASK MODAL */}
      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title={isSectionHeader ? 'Th\u00eam \u0110\u1ea7u m\u1ee5c l\u1edbn' : 'Th\u00eam H\u1ea1ng m\u1ee5c nh\u1ecf'} size="xl">
        <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{'Thu\u1ed9c D\u1ef1 \u00e1n'}</label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 truncate" title={currentProject?.name || projectCode}>
                {currentProject?.name || projectCode}
              </div>
            </div>
            {!isSectionHeader && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{'Thu\u1ed9c \u0110\u1ea7u m\u1ee5c cha'}</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={sectionSelect}
                    onChange={(e) => setSectionSelect(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/70 font-bold text-primary truncate"
                  >
                    <option value="default">-- Chon Dau muc cha --</option>
                    {uniqueSectionsForProj.map((sec) => (
                      <option key={sec} value={sec} title={sec}>
                        {truncateText(sec, 40)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleStartCustomSection}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-blue-300 bg-blue-50 text-primary rounded-md text-sm font-bold hover:bg-blue-100 transition-all"
                    title="Tao Dau muc lon moi"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isSectionHeader && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{'Thuộc Hạng mục cha (tuỳ chọn)'}</label>
                <select
                  value={parentIdSelect}
                  onChange={(e) => setParentIdSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold truncate"
                >
                  <option value="default">-- Không có --</option>
                  {activeTasksForProj
                    .filter((t) => !t.isSectionHeader && t.sectionName === sectionSelect)
                    .map((t) => (
                      <option key={t.id} value={t.id} title={t.name}>
                        {truncateText(t.name, 60)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-4 gap-3 ${!isSectionHeader ? "mt-3" : ""}`}>
            <div>
              <label className="block font-bold text-slate-700 mb-1">STT</label>
              <input
                type="text"
                required
                placeholder="Nhập STT"
                value={stt}
                onChange={(e) => setStt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
              />
            </div>
            <div className="col-span-3">
              <label className="block font-bold text-slate-700 mb-1">{isSectionHeader ? 'T\u00ean \u0110\u1ea7u m\u1ee5c cha *' : 'T\u00ean H\u1ea1ng m\u1ee5c / Thi\u1ebft b\u1ecb *'}</label>
              <input
                type="text"
                required
                placeholder={isSectionHeader ? 'VD: H\u1ec6 TH\u1ed0NG \u0110I\u1ec6N CHI\u1ebeU S\u00c1NG' : 'VD: May bom dien Q=54m3/h; H=30mH2O'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
              />
            </div>
          </div>

          {!isSectionHeader && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{'Kh\u1ed1i l\u01b0\u1ee3ng'}</label>
                  <input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{'\u0110\u01a1n v\u1ecb t\u00ednh (\u0110VT)'}</label>
                  <input type="text" placeholder="VD: cai, bo, m..." value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{'T\u00ecnh tr\u1ea1ng mua h\u00e0ng'}</label>
                  <select value={purchaseStatus} onChange={(e) => setPurchaseStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
                    {PURCHASE_STATUS_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{'T\u00ecnh tr\u1ea1ng thi c\u00f4ng'}</label>
                  <select value={constrStatus} onChange={(e) => setConstrStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
                    {CONSTRUCTION_STATUS_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{'K\u1ef9 s\u01b0 Ph\u1ee5 tr\u00e1ch'}</label>
                  <select value={engineerId} onChange={(e) => setEngineerId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
                    {engineers.map((eng) => (<option key={eng.id} value={eng.id}>{eng.name} ({eng.title})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{'Ti\u1ebfn \u0111\u1ed9 t\u1ef1 t\u00ednh (%)'}</label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-800">
                    {calculateAutoProgressPercent(purchaseStatus, constrStatus)}%
                  </div>
                </div>
              </div>
            </>
          )}

          {ocrIssueDraft && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">{'D\u1eef li\u1ec7u ph\u1ee5 l\u1ee5c / Ghi ch\u00fa'}</label>
              <textarea
                value={ocrIssueDraft}
                onChange={(e) => setOcrIssueDraft(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-slate-50 text-xs font-mono leading-5"
              />
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">
              Huy
            </button>
            <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">
              {isSectionHeader ? 'L\u01b0u \u0110\u1ea7u m\u1ee5c l\u1edbn' : 'L\u01b0u H\u1ea1ng m\u1ee5c nh\u1ecf'}
            </button>
          </div>
        </form>
      </Modal>

      {/* NEW PROJECT MODAL */}
      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Khởi tạo Dự n / Cng trnh Mới">
        <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tn Dự n / Cng trnh Mới *</label>
            <input
              type="text"
              required
              placeholder="VD: Trạm biến p 220kV C Mau"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">M Dự n</label>
              <input
                type="text"
                placeholder="VD: 220KV_CAMAU"
                value={newProjCode}
                onChange={(e) => setNewProjCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Địa điểm cng trnh</label>
              <input
                type="text"
                placeholder="VD: C Mau"
                value={newProjLocation}
                onChange={(e) => setNewProjLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chỉ huy trưởng</label>
            <select
              value={newProjManagerId}
              onChange={(e) => setNewProjManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            >
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
              <option value="__NEW__">+ Thm người mới...</option>
            </select>

            {newProjManagerId === '__NEW__' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tn người mới *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kỹ sư Minh"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức danh</label>
                  <input
                    type="text"
                    placeholder="VD: Chỉ huy trưởng cng trnh"
                    value={newManagerTitle}
                    onChange={(e) => setNewManagerTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  />
                </div>
              </div>
            )}
          </div><div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">
              Tạo Dự n
            </button>
          </div>
        </form>
      </Modal>
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
