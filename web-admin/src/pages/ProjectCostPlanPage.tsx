import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useParams, useOutletContext } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { CostPlanSummaryTable } from './cost-plan/CostPlanSummaryTable';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { ImageUpload } from '../components/common/ImageUpload';
import { ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll , calculateAutoProgressRatio, PURCHASE_STATUS_OPTIONS } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { MaterialAndPurchasingTab } from './cost-plan/MaterialAndPurchasingTab';

import { DocumentCertificateTab } from './cost-plan/DocumentCertificateTab';
import { CustomSelect } from '@/components/common/CustomSelect';


const romanToNumber = (value?: string) => {
  const romanMap: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(normalized)) return null;
  let total = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const current = romanMap[normalized[index]] || 0;
    const next = romanMap[normalized[index + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total;
};

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

const sttSortValue = (value?: string) => {
  const raw = String(value || '').trim();
  const numeric = Number(raw.replace(',', '.'));
  if (Number.isFinite(numeric)) return numeric;
  const roman = romanToNumber(raw);
  if (roman !== null) return roman;
  const firstNumber = raw.match(/\d+/)?.[0];
  return firstNumber ? Number(firstNumber) : Number.MAX_SAFE_INTEGER;
};

const normalizePlanKey = (stt?: string, content?: string, _parentId?: string) =>
  `${String(stt || '').trim()}|${String(content || '').trim().toLowerCase()}`;

const isSectionMarker = (stt?: string, notes?: string) =>
  String(notes || '').toLowerCase().includes('[section]') || romanToNumber(stt) !== null;

const isAutoSyncedMaterialPlan = (plan?: ProjectMaterialPlan) => {
  const notes = String(plan?.notes || '').toLowerCase();
  return notes.includes('[section]') || notes.includes('đồng bộ') || notes.includes('dong bo');
};

const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => true;

const getSectionForMaterialPlan = (plan: ProjectMaterialPlan, allPlans: ProjectMaterialPlan[], visited = new Set<string>()) => {
  if (visited.has(plan.id)) return null;
  visited.add(plan.id);

  if (isSectionMarker(plan.stt, plan.notes)) return plan;
  
  if (plan.parentId) {
    const parent = allPlans.find(p => p.id === plan.parentId);
    if (parent) {
      if (isSectionMarker(parent.stt, parent.notes)) return parent;
      return getSectionForMaterialPlan(parent, allPlans, visited);
    }
  }
  
  const orderTagValue = (notes?: string): number | null => {
    const m = String(notes || '').match(/\[order:([\d.]+)\]/);
    return m ? parseFloat(m[1]) : null;
  };
  
  const myPos = orderTagValue(plan.notes);
  if (myPos === null) return null;
  
  const sections = allPlans.filter(p => isSectionMarker(p.stt, p.notes));
  let bestSec = null;
  let bestSecPos = -1;
  
  sections.forEach(sec => {
    const secPos = orderTagValue(sec.notes);
    if (secPos !== null && secPos <= myPos && secPos > bestSecPos) {
      bestSecPos = secPos;
      bestSec = sec;
    }
  });
  
  return bestSec;
};

const isEffectiveContractorPlan = (plan: ProjectMaterialPlan, allPlans: ProjectMaterialPlan[]) => {
  return true;
};

export const ProjectCostPlanPage: React.FC = () => {
  const {
    projects,
    materialPlans,
    purchasingPlans,
    expenses,
    laborPayrolls,
    tasks,
    engineers,
    addTask,
    addTasksBatch,
    addMaterialPlan,
    updateMaterialPlan,
    deleteMaterialPlan,
    addPurchasingPlan,
    updatePurchasingPlan,
    deletePurchasingPlan,
    addExpense,
    updateExpense,
    deleteExpense,
    addLaborPayroll,
    updateLaborPayroll,
    deleteLaborPayroll,
    activityLogs,
    deleteTask,
    updateTask,
  } = useRealtimeStore();

  const user = useAuthStore(state => state.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncingIdsRef = useRef<Set<string>>(new Set());






  // Pending tasks waiting for user confirmation before being created
  const [pendingTaskItems, setPendingTaskItems] = useState<Array<any>>([]);
  const [showCreateTaskConfirm, setShowCreateTaskConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    type: 'material' | 'purchasing' | 'expense' | 'labor';
    title: string;
    itemName: string;
  } | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleUpdatePurchasingPlanSync = async (id: string, updates: Partial<ProjectPurchasing>) => {
    const existing = purchasingPlans.find(p => p.id === id);
    if (!existing) return;

    const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const matchingMaterial = materialPlans.find(m => 
      (existing.materialPlanId && m.id === existing.materialPlanId) ||
      (m.projectCode === existing.projectCode && norm(m.stt) === norm(existing.stt) && norm(m.jobContent) === norm(existing.content))
    );

    if (matchingMaterial) {
      syncingIdsRef.current.add(matchingMaterial.id);
    }

    try {
      await updatePurchasingPlan(id, updates);

      if (updates.stt !== undefined || updates.content !== undefined || updates.unit !== undefined || updates.volumeContract !== undefined) {
        if (matchingMaterial) {
          triggerToast(`Đã đồng bộ sang Kế hoạch vật tư: ${matchingMaterial.jobContent}`, 'success');
          await updateMaterialPlan(matchingMaterial.id, {
            stt: updates.stt !== undefined ? updates.stt : matchingMaterial.stt,
            jobContent: updates.content !== undefined ? updates.content : matchingMaterial.jobContent,
            unit: updates.unit !== undefined ? updates.unit : matchingMaterial.unit,
            contractVolume: updates.volumeContract !== undefined ? updates.volumeContract : matchingMaterial.contractVolume
          });
        } else {
          triggerToast(`Không tìm thấy mục tương ứng trong Kế hoạch vật tư! (STT: ${existing.stt}, Nội dung: ${existing.content})`, 'warning');
        }

        const matchingTask = tasks.find(t => 
          t.projectCode === existing.projectCode && 
          norm(t.stt) === norm(existing.stt) && 
          norm(t.name) === norm(existing.content)
        );
        if (matchingTask) {
          updateTask(matchingTask.id, {
            stt: updates.stt !== undefined ? updates.stt : matchingTask.stt,
            name: updates.content !== undefined ? updates.content : matchingTask.name,
            unit: updates.unit !== undefined ? updates.unit : matchingTask.unit,
            volume: updates.volumeContract !== undefined ? updates.volumeContract : matchingTask.volume
          });
        }
      }

      // Đồng bộ trạng thái đặt hàng sang Kế hoạch Vật tư + Quản lý Công việc
      if (updates.orderStatus !== undefined) {
        if (matchingMaterial) {
          await updateMaterialPlan(matchingMaterial.id, { orderedStatus: updates.orderStatus || 'Chưa đặt hàng' });
        }

        const matchingTask = tasks.find(t => 
          t.projectCode === existing.projectCode && 
          norm(t.stt) === norm(existing.stt) && 
          norm(t.name) === norm(existing.content)
        );
        if (matchingTask) {
          const newPurch = updates.orderStatus || 'Chưa đặt hàng';
          const taskUpdates: Record<string, any> = { purchaseStatus: newPurch };
          
          if (!matchingTask.isSectionHeader) {
            const nextProgress = calculateAutoProgressRatio(newPurch, matchingTask.constrStatus);
            taskUpdates.progress = nextProgress;
            taskUpdates.isDone = nextProgress >= 1;
            taskUpdates.status = nextProgress >= 1 ? 'Hoàn thành' : nextProgress > 0 ? 'Đang làm' : 'Chưa làm';
          }
          
          updateTask(matchingTask.id, taskUpdates);
        }
      }
    } finally {
      if (matchingMaterial) {
        syncingIdsRef.current.delete(matchingMaterial.id);
      }
    }
  };

  const handleUpdateMaterialPlanSync = async (id: string, updates: Partial<ProjectMaterialPlan>) => {
    syncingIdsRef.current.add(id);
    const existing = materialPlans.find(p => p.id === id);
    try {
      await updateMaterialPlan(id, updates);
      if (!existing) return;

      const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

      // Đồng bộ STT, tên, đơn vị, khối lượng sang Purchasing + Task
      if (updates.stt !== undefined || updates.jobContent !== undefined || updates.unit !== undefined || updates.contractVolume !== undefined) {
        const matchingPurchasing = purchasingPlans.find(p => 
          p.projectCode === existing.projectCode && 
          norm(p.stt) === norm(existing.stt) && 
          norm(p.content) === norm(existing.jobContent)
        );
        if (matchingPurchasing) {
          await updatePurchasingPlan(matchingPurchasing.id, {
            stt: updates.stt !== undefined ? updates.stt : matchingPurchasing.stt,
            content: updates.jobContent !== undefined ? updates.jobContent : matchingPurchasing.content,
            unit: updates.unit !== undefined ? updates.unit : matchingPurchasing.unit,
            volumeContract: updates.contractVolume !== undefined ? updates.contractVolume : matchingPurchasing.volumeContract
          });
        }

        const matchingTask = tasks.find(t => 
          t.projectCode === existing.projectCode && 
          norm(t.stt) === norm(existing.stt) && 
          norm(t.name) === norm(existing.jobContent)
        );
        if (matchingTask) {
          updateTask(matchingTask.id, {
            stt: updates.stt !== undefined ? updates.stt : matchingTask.stt,
            name: updates.jobContent !== undefined ? updates.jobContent : matchingTask.name,
            unit: updates.unit !== undefined ? updates.unit : matchingTask.unit,
            volume: updates.contractVolume !== undefined ? updates.contractVolume : matchingTask.volume
          });
        }
      }

      // Đồng bộ Ghi chú / Vướng mắc sang Task
      if (updates.issueContent !== undefined || updates.issueStatus !== undefined || updates.notes !== undefined) {
        const matchingTask = tasks.find(t => 
          t.projectCode === existing.projectCode && 
          norm(t.stt) === norm(existing.stt) && 
          norm(t.name) === norm(existing.jobContent)
        );
        if (matchingTask) {
          const taskUpdates: Record<string, any> = {};
          if (updates.issueContent !== undefined) {
            taskUpdates.issue = String(updates.issueContent).split('[DOC-DATA]')[0].trimEnd();
          }
          if (updates.issueStatus !== undefined) taskUpdates.issueStatus = updates.issueStatus;
          if (updates.notes !== undefined) {
            taskUpdates.notes = String(updates.notes).split('[DOC-NOTE]')[0].trimEnd();
          }
          if (Object.keys(taskUpdates).length > 0) {
            updateTask(matchingTask.id, taskUpdates);
          }
        }
      }

      // Đồng bộ trạng thái đặt hàng / thi công sang Purchasing + Task
      if (updates.orderedStatus !== undefined || updates.progressStatus !== undefined) {
        const matchingTask = tasks.find(t => 
          t.projectCode === existing.projectCode && 
          norm(t.stt) === norm(existing.stt) && 
          norm(t.name) === norm(existing.jobContent)
        );
        if (matchingTask) {
          const taskUpdates: Record<string, any> = {};
          let newPurch = matchingTask.purchaseStatus;
          let newConstr = matchingTask.constrStatus;

          if (updates.orderedStatus !== undefined) {
             taskUpdates.purchaseStatus = updates.orderedStatus || 'Chưa đặt hàng';
             newPurch = taskUpdates.purchaseStatus;
          }
          if (updates.progressStatus !== undefined) {
             taskUpdates.constrStatus = updates.progressStatus || 'Chưa thi công';
             newConstr = taskUpdates.constrStatus;
          }

          if (!matchingTask.isSectionHeader) {
            const nextProgress = calculateAutoProgressRatio(newPurch, newConstr);
            taskUpdates.progress = nextProgress;
            taskUpdates.isDone = nextProgress >= 1;
            taskUpdates.status = nextProgress >= 1 ? 'Hoàn thành' : nextProgress > 0 ? 'Đang làm' : 'Chưa làm';
          }

          updateTask(matchingTask.id, taskUpdates);
        }

        if (updates.orderedStatus !== undefined) {
          const matchingPurchasing = purchasingPlans.find(p => 
            p.projectCode === existing.projectCode && 
            norm(p.stt) === norm(existing.stt) && 
            norm(p.content) === norm(existing.jobContent)
          );
          if (matchingPurchasing) {
            updatePurchasingPlan(matchingPurchasing.id, { orderStatus: updates.orderedStatus || 'Chưa đặt hàng' });
          }
        }
      }
    } finally {
      syncingIdsRef.current.delete(id);
    }
  };

  const confirmDeleteAction = () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    
    if (type === 'material') {
      const plan = materialPlans.find(p => p.id === id);
      if (plan) {
        if (isContractorMaterialPlan(plan)) {
          const linkedPurchasing = purchasingPlans.find(p => p.materialPlanId === id);
          if (linkedPurchasing) {
            deletePurchasingPlan(linkedPurchasing.id);
          } else {
            const key = normalizePlanKey(plan.stt, plan.jobContent, plan.parentId);
            const matchingPurchasing = purchasingPlans.find(p =>
              p.projectCode === plan.projectCode &&
              normalizePlanKey(p.stt, p.content, p.parentId) === key
            );
            if (matchingPurchasing) deletePurchasingPlan(matchingPurchasing.id);
          }
        }
        
        // Đồng bộ xóa sang Quản lý tiến độ
        const matchingTask = tasks.find(t => t.projectCode === plan.projectCode && t.name === plan.jobContent);
        if (matchingTask) deleteTask(matchingTask.id);
      }
      deleteMaterialPlan(id);
      triggerToast('Đã xóa Kế hoạch vật tư thành công!', 'success');
    } else if (type === 'purchasing') {
      const pPlan = purchasingPlans.find(p => p.id === id);
      if (pPlan) {
        let matPlan = null;
        if (pPlan.materialPlanId) {
          matPlan = materialPlans.find(m => m.id === pPlan.materialPlanId);
        } else {
          const key = normalizePlanKey(pPlan.stt, pPlan.content, pPlan.parentId);
          matPlan = materialPlans.find(m => 
            m.projectCode === pPlan.projectCode &&
            normalizePlanKey(m.stt, m.jobContent, m.parentId) === key
          );
        }
        
        if (matPlan) {
          deleteMaterialPlan(matPlan.id);
          // Đồng bộ xóa sang Quản lý tiến độ
          const matchingTask = tasks.find(t => t.projectCode === matPlan!.projectCode && t.name === matPlan!.jobContent);
          if (matchingTask) deleteTask(matchingTask.id);
        }
      }
      deletePurchasingPlan(id);
      triggerToast('Đã xóa Mua sắm hàng hóa thành công!', 'success');
    } else if (type === 'expense') {
      deleteExpense(id);
      triggerToast('Đã xóa Chi phí dự án thành công!', 'success');
    } else if (type === 'labor') {
      deleteLaborPayroll(id);
      triggerToast('Đã xóa Lương công nhật thành công!', 'success');
    }
    setDeleteConfirm(null);
  };

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's not an excel or csv file
    if (file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      triggerToast('Tính năng bóc tách tự động bằng AI OCR cho file PDF/Word đang được triển khai. Vui lòng sử dụng file Excel hoặc CSV để hệ thống phân tích tốc độ cao!', 'info');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const normalizeImportText = (value: any) => String(value || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\u0111/g, 'd');

        const workbookPreviewText = wb.SheetNames
          .map((name) => {
            const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1 }).slice(0, 12);
            return [name, ...rows.flat().map((cell) => String(cell || ''))].join(' ');
          })
          .join(' ');
        const normalizedWorkbookPreview = normalizeImportText(workbookPreviewText);
        
  // ------------------------------------------------------------------
        // Smart validation: nhận diện file hợp lệ theo nhiều tiêu chí
        // ------------------------------------------------------------------
        const normalizeSheetName = (n: string) => normalizeImportText(n);

        // 1. Kiểm tra tên file hoặc nội dung có dấu hiệu là phụ lục hợp đồng
        const isAppendixWorkbook =
          normalizedWorkbookPreview.includes('phu luc 01') ||
          normalizedWorkbookPreview.includes('phu luc hop dong') ||
          normalizedWorkbookPreview.includes('bang chi tiet gia tri hop dong') ||
          normalizeImportText(file.name).includes('pl01') ||
          normalizeImportText(file.name).includes('hopdong') ||
          normalizeImportText(file.name).includes('hop dong') ||
          normalizeImportText(file.name).includes('phu luc') ||
          file.name.toLowerCase().endsWith('.csv') ||
          // Sheet tên có PL01 hoặc phụ lục
          wb.SheetNames.some(n => normalizeSheetName(n).includes('pl01') || normalizeSheetName(n).includes('phu luc')) ||
          // Nội dung có cột STT + nội dung/hạng mục/công việc/thiết bị
          (normalizedWorkbookPreview.includes('stt') && (
            normalizedWorkbookPreview.includes('noi dung') ||
            normalizedWorkbookPreview.includes('hang muc') ||
            normalizedWorkbookPreview.includes('cong viec') ||
            normalizedWorkbookPreview.includes('thiet bi') ||
            normalizedWorkbookPreview.includes('mo ta')
          ));

        // 2. Sheet tên có từ khoá kế hoạch / chi phí
        const costKeywords = ['KẾ HOẠCH', 'KE HOACH', 'MUA SẮM', 'MUA SAM', 'CHI PHÍ', 'CHI PHI',
          'CÔNG NHẬT', 'CONG NHAT', 'LƯƠNG', 'LUONG', 'SHEET1', 'PL', 'PHU LUC'];
        const hasCostSheets = wb.SheetNames.some(name =>
          costKeywords.some(keyword => name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(keyword))
        );

        // 3. Từ khoá bị cấm (file nhân sự, kho)
        const forbiddenKeywords = ['TỒN KHO', 'NHẬP KHO', 'XUẤT KHO', 'TON KHO', 'NHAP KHO', 'XUAT KHO', 'NHÂN SỰ', 'NHAN SU', 'HỒ SƠ GỬI'];
        const hasForbiddenSheets = wb.SheetNames.some(name =>
          forbiddenKeywords.some(keyword => name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
            keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          ))
        );

        // 4. Chặn file cấm tuyệt đối
        if (hasForbiddenSheets) {
          triggerToast('File này chứa dữ liệu Nhân sự/Kho — không phù hợp để nhập vào Kế hoạch Chi phí!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // 5. Nếu không nhận ra cấu trúc nào hết → từ chối
        if (!isAppendixWorkbook && !hasCostSheets) {
          triggerToast('Không nhận diện được cấu trúc file. Vui lòng dùng file Excel/CSV có cột STT, Nội dung, Khối lượng, Đơn giá!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        const parseExcelDate = (dateVal: any) => {
          if (!dateVal) return '';
          if (typeof dateVal === 'string') return dateVal;
          try {
            const date = new Date((dateVal - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
          } catch (e) {
            return String(dateVal);
          }
        };

        const numVal = (val: any) => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        const baselineKey = (stt: string, content: string) =>
          `${stt.trim()}|${normalizeImportText(content).replace(/\\s+/g, ' ')}`;
        
        // Dùng getState() để lấy dữ liệu MỚI NHẤT từ store, tránh stale closure
        const freshState = useRealtimeStore.getState();
        
        const materialBaselineMap = new Map(
          freshState.materialPlans
            .filter((plan) => plan.projectCode === selectedProject)
            .map((plan) => [baselineKey(plan.stt || '', plan.jobContent || ''), plan])
        );
        
        const purchasingBaselineMap = new Map(
          freshState.purchasingPlans
            .filter((plan) => plan.projectCode === selectedProject)
            .map((plan) => [baselineKey(plan.stt || '', plan.content || ''), plan])
        );

        const taskBaselineMap = new Map(
          freshState.tasks
            .filter((t) => t.projectCode === selectedProject)
            .map((t) => [baselineKey(t.stt || '', t.name || ''), t])
        );

        const importAppendixWorkbook = () => {
          let appendixMaterialCount = 0;
          let appendixPurchasingCount = 0;
          const purchasingPromises: Promise<string | undefined>[] = [];
          const materialPromises: Promise<any>[] = [];

          const findAppendixHeaderRow = (rows: any[][]) => {
            for (let i = 0; i < Math.min(rows.length, 30); i++) {
              const normalizedRow = (rows[i] || []).map(normalizeImportText);
              const hasStt = normalizedRow.some((cell) => cell === 'stt' || cell === 'stt.');
              const hasContent = normalizedRow.some((cell) => cell.includes('noi dung') || cell.includes('mo ta cong viec'));
              const hasVolume = normalizedRow.some((cell) => cell.includes('khoi luong'));
              const hasUnitPrice = normalizedRow.some((cell) => cell.includes('don gia'));
              if (hasStt && hasContent && hasVolume && hasUnitPrice) return i;
            }
            return -1;
          };
          const getColumnIndex = (headerRow: any[], candidates: string[], fallback: number) => {
            const normalizedHeader = headerRow.map(normalizeImportText);
            const found = normalizedHeader.findIndex((cell) => candidates.some((candidate) => cell.includes(candidate)));
            return found >= 0 ? found : fallback;
          };

          const pendingTasks: any[] = [];
          let globalOrder = 0; // thứ tự tuyệt đối trong file, dùng để sort sau
          let currentSectionSupplyScope: 'contractor' | 'owner' | 'unknown' = 'unknown'; // Theo dõi supplyScope của section hiện tại cho các hạng mục con

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

          wb.SheetNames.forEach((sheetName) => {
            const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
            const headerRowIndex = findAppendixHeaderRow(rows);
            if (headerRowIndex === -1) return;

            const headerRow = rows[headerRowIndex] || [];
            const sttCol = getColumnIndex(headerRow, ['stt'], 0);
            const contentCol = getColumnIndex(headerRow, ['noi dung', 'mo ta cong viec'], 1);
            const volumeCol = getColumnIndex(headerRow, ['khoi luong'], 2);
            const unitCol = getColumnIndex(headerRow, ['don vi tinh', 'dvt'], 3);
            const modelCol = getColumnIndex(headerRow, ['ma hieu', 'model'], -1);
            const originCol = getColumnIndex(headerRow, ['nguon san xuat', 'xuat xu'], -1);
            const unitPriceCol = getColumnIndex(headerRow, ['don gia'], modelCol >= 0 ? 6 : 4);
            const preTaxCol = getColumnIndex(headerRow, ['thanh tien'], unitPriceCol + 1);
            const vatRateCol = getColumnIndex(headerRow, ['thue vat'], preTaxCol + 1);
            const vatAmountCol = vatRateCol + 1;
            const totalCol = getColumnIndex(headerRow, ['tong tien'], vatAmountCol + 1);
            const notesCol = getColumnIndex(headerRow, ['ghi chu'], totalCol + 1);

            const hasPrices = unitPriceCol !== -1 || totalCol !== -1;

            const parsedRows = rows.slice(headerRowIndex + 1);
            parsedRows.forEach((row, index) => {
              const content = String(row[contentCol] || '').trim();
              if (!content) return;
              if (!/[a-zA-ZÀ-ỹ]/.test(content)) return;

              const stt = String(row[sttCol] || '').trim();
              const volumeContract = numVal(row[volumeCol]);
              const unitPrice = numVal(row[unitPriceCol]);
              const totalBeforeVat = numVal(row[preTaxCol]) || volumeContract * unitPrice;
              const totalAmount = numVal(row[totalCol]) || totalBeforeVat;
              const vatRate = numVal(row[vatRateCol]);
              const vatAmount = numVal(row[vatAmountCol]);
              const normalizedContent = normalizeImportText(content);
              const isSummaryRow = normalizedContent.includes('tong cong') || (!stt && normalizedContent === 'cong');
              if (isSummaryRow) return;

              const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\s+[A-Z0-9]+)$/i;
              const numericParentRegex = /^\d+$/;
              const isRoman = romanRegex.test(stt);
              const cleanStt = String(stt || '').trim().replace(/\.$/, '');
              const hasNoDot = !cleanStt.includes('.');
              const startsWithPhan = content.trim().toUpperCase().startsWith('PHẦN ');
              const cleanUnitVal = String(row[unitCol] || '').replace(/^[-–—_.\s]+$/, '').trim();
              const hasNoVolumeAndUnit = (volumeContract === 0 || !volumeContract) && (!cleanUnitVal || cleanUnitVal === '');
              const isSection = startsWithPhan || (hasNoDot && isMainSectionName(content)) || (hasNoDot && hasNoVolumeAndUnit && isRoman);

              let effectiveStt = stt;
              if (isSection) {
                currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a') || normalizeImportText(content).includes('ban a')) ? 'owner' : 'unknown';
              }
              
              const rowSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a') || normalizeImportText(content).includes('ban a')) ? 'owner' : 'unknown';
              const supplyScope = isSection ? currentSectionSupplyScope : (rowSupplyScope !== 'unknown' ? rowSupplyScope : currentSectionSupplyScope);

              const rowId = crypto.randomUUID();
              if (stt) sttIdMap.set(stt, rowId);

              let parentId = undefined;
              if (isSection) {
                currentMainSectionId = rowId;
                currentSubSectionId = undefined;
              } else {
                let isSubFolder = false;
                const nextRow = parsedRows[index + 1];
                if (nextRow) {
                  const nextStt = String(nextRow[sttCol] || '').trim();
                  if (nextStt && nextStt.startsWith(stt + '.')) {
                    isSubFolder = true;
                  }
                }
                if (isSubFolder) {
                  parentId = currentMainSectionId;
                  currentSubSectionId = rowId;
                } else {
                  let foundDottedParent = false;
                  if (stt.includes('.')) {
                    const parts = stt.split('.');
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

              // Lưu thứ tự tuyệt đối vào notes dạng [order:NNN] để sort đúng sau khi load
              const orderTag = `[order:${String(++globalOrder).padStart(5, '0')}]`;
              const rowKey = baselineKey(effectiveStt, content);
              const baseNote = [isSection ? '[section]' : '', supplyScope === 'contractor' ? '[contractor]' : '', supplyScope === 'owner' ? '[owner]' : '', orderTag, String(row[notesCol] || ''), sheetName].filter(Boolean).join(' | ');
              const existingMaterial = materialBaselineMap.get(rowKey);
              if (existingMaterial) {
                updateMaterialPlan(existingMaterial.id, {
                  parentId: parentId,
                  stt: effectiveStt,
                  jobContent: content,
                  unit: String(row[unitCol] || ''),
                  contractVolume: volumeContract,
                  techSpecModel: modelCol >= 0 ? String(row[modelCol] || '') : '',
                  techSpecOrigin: originCol >= 0 ? String(row[originCol] || '') : '',
                  supplyScope,
                  notes: existingMaterial.notes || baseNote,
                });
              } else {
                materialPromises.push(addMaterialPlan({
                  id: rowId,
                  parentId: parentId,
                  projectCode: selectedProject,
                  stt: effectiveStt,
                  jobContent: content,
                  unit: String(row[unitCol] || ''),
                  contractVolume: volumeContract,
                  techSpecModel: modelCol >= 0 ? String(row[modelCol] || '') : '',
                  techSpecOrigin: originCol >= 0 ? String(row[originCol] || '') : '',
                  progressStatus: 'Chưa thi công',
                  orderedVolume: 0,
                  orderedStatus: 'Chưa đặt hàng',
                  expectedDate: '',
                  issueContent: '',
                  supplyScope,
                  notes: baseNote,
                }));
                materialBaselineMap.set(rowKey, { id: rowId, projectCode: selectedProject, stt: effectiveStt, jobContent: content, unit: String(row[unitCol] || ''), contractVolume: volumeContract } as ProjectMaterialPlan);
              }
              appendixMaterialCount++;

              const pushToPurchasing = true;

              if (pushToPurchasing) {
                const computedVatAmount = vatAmount || (vatRate ? totalBeforeVat * vatRate / 100 : 0);
                const totalWithVat = totalAmount || totalBeforeVat + computedVatAmount;

                const existingPurchasing = purchasingBaselineMap.get(rowKey);
                if (existingPurchasing) {
                  updatePurchasingPlan(existingPurchasing.id, {
                    parentId: parentId,
                    stt: effectiveStt,
                    content,
                    unit: String(row[unitCol] || ''),
                    volumeContract,
                    unitPrice,
                    vatRate,
                    vatAmount: computedVatAmount,
                    totalAmount: totalWithVat,
                    remainingAmount: Math.max(0, totalWithVat - (existingPurchasing.prepayAmount || 0)),
                    notes: existingPurchasing.notes || baseNote,
                  });
                } else {
                  purchasingPromises.push(addPurchasingPlan({
                    id: rowId,
                    parentId: parentId,
                    projectCode: selectedProject,
                    stt: effectiveStt,
                    content,
                    unit: String(row[unitCol] || ''),
                    volumeContract,
                    volumeOrder: 0,
                    unitPrice,
                    vatRate,
                    vatAmount: computedVatAmount,
                    totalAmount: totalWithVat,
                    prepayPercent: 0,
                    prepayAmount: 0,
                    remainingAmount: totalWithVat,
                    orderStatus: 'Chưa đặt hàng',
                    contractStatus: 'Đã có phụ lục',
                    invoiceStatus: 'Chưa xuất',
                    notes: baseNote,
                  }));
                  purchasingBaselineMap.set(rowKey, { id: rowId, projectCode: selectedProject, stt: effectiveStt, content, unit: String(row[unitCol] || ''), volumeContract, volumeOrder: 0, unitPrice, vatRate, vatAmount: computedVatAmount, totalAmount: totalWithVat, prepayPercent: 0, prepayAmount: 0, remainingAmount: totalWithVat, orderStatus: '', contractStatus: '', invoiceStatus: '' } as ProjectPurchasing);
                }
                appendixPurchasingCount++;
              }

              const existingTask = taskBaselineMap.get(rowKey);
              if (!existingTask) {
                const projName = projects.find(p => p.code === selectedProject)?.name || selectedProject;
                const currentSectionName = isSection ? content : (pendingTasks.slice().reverse().find((task) => task.isSectionHeader)?.name || 'Khác');
                pendingTasks.push({
                  id: rowId,
                  parentId: parentId,
                  stt: effectiveStt,
                  code: rowId,
                  name: content,
                  projectCode: selectedProject,
                  projectName: projName,
                  volume: isSection ? 0 : volumeContract,
                  unit: isSection ? '' : String(row[unitCol] || ''),
                  progress: 0,
                  status: 'Chưa làm',
                  purchaseStatus: isSection ? '' : 'Chưa đặt hàng',
                  constrStatus: isSection ? '' : 'Chưa thi công',
                  isDone: false,
                  isSectionHeader: isSection,
                  sectionName: currentSectionName,
                  notes: baseNote
                });
                taskBaselineMap.set(rowKey, { id: '', projectCode: selectedProject, stt: effectiveStt, name: content } as any);
              }
            });
          });

          return { appendixMaterialCount, appendixPurchasingCount, pendingTasks, purchasingPromises, materialPromises };
        };

        if (isAppendixWorkbook) {
          const { appendixMaterialCount, appendixPurchasingCount, pendingTasks, purchasingPromises, materialPromises } = importAppendixWorkbook();
          await Promise.all([...purchasingPromises, ...materialPromises]);
          if (appendixMaterialCount === 0 && appendixPurchasingCount === 0) {
            triggerToast('Không tìm thấy bảng phụ lục PL01 hợp lệ trong file Excel này.', 'warning');
          } else {
            // Tự động tạo Tasks ngay — không cần hỏi
            if (pendingTasks.length > 0) {
              addTasksBatch(pendingTasks);
              triggerToast(
                `Đã nhập phụ lục PL01 cho dự án ${selectedProject}: ${appendixMaterialCount} dòng vật tư, ${appendixPurchasingCount} dòng mua hàng, ${pendingTasks.length} công việc đã được đồng bộ tự động.`,
                'success'
              );
            } else {
              triggerToast(
                `Đã nhập phụ lục PL01 cho dự án ${selectedProject}: ${appendixMaterialCount} dòng hạng mục, ${appendixPurchasingCount} dòng giá trị hợp đồng.`,
                'success'
              );
            }
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const materialSheetName = wb.SheetNames.find(s => s.includes('KÉ HOẠCH') || s.includes('KẾ HOẠCH') || s.includes('KeHoach'));
        const purchasingSheetName = wb.SheetNames.find(s => s.includes('MUA SẮM') || s.includes('MuaSam'));
        const expenseSheetName = wb.SheetNames.find(s => s.includes('CHI PHÍ') || s.includes('ChiPhi'));
        const laborSheetName = wb.SheetNames.find(s => s.includes('Trang tính6') || s.includes('CÔNG NHẬT') || s.includes('TT Công') || s.includes('Luong'));

        let matImportCount = 0;
        let purImportCount = 0;
        let expImportCount = 0;
        let labImportCount = 0;

        const findStartRow = (sheetRows: any[][]) => {
          for (let i = 0; i < Math.min(sheetRows.length, 20); i++) {
            const r = sheetRows[i];
            if (r && (r.includes('STT') || r.includes('stt') || r.includes('Stt') || r.some((cell: any) => String(cell).toLowerCase() === 'stt'))) {
              return i + 1;
            }
          }
          return -1;
        };

        // 1. Parse Material Plan
        if (materialSheetName) {
          const sheet = wb.Sheets[materialSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            const headerRow1 = rows[startRow - 2] || [];
            const headerRow2 = rows[startRow - 1] || [];
            const headerRow3 = rows[startRow] || [];
            
            const findIdx = (keywords: string[], fallback: number) => {
              for (let col = 0; col < 30; col++) {
                const combined = [headerRow1[col], headerRow2[col], headerRow3[col]]
                  .map(c => String(c || '').trim().toLowerCase())
                  .join(' ');
                
                if (keywords.some((k: string) => combined.includes(k))) {
                  return col;
                }
              }
              return fallback;
            };

            const idxSTT = findIdx(['stt'], 0);
            const idxContent = findIdx(['nội dung', 'công việc'], 1);
            const idxUnit = findIdx(['đvt', 'đơn vị', 'đơn vi', 'đơn vị tính'], 2);
            const idxVol = findIdx(['khối lượng', 'khối lượng hđ', 'khối lượng hợp đồng', 'kl hđ', 'klhd'], 3);
            const idxModel = findIdx(['mã hiệu', 'chào hàng', 'ký mã hiệu'], 4);
            const idxOrigin = findIdx(['xuất xứ', 'nguồn sản xuất', 'đáp ứng', 'hãng sản xuất'], 5);
            const idxProg = findIdx(['tình trạng', 'tiến độ'], 6);
            const idxOrdVol = findIdx(['kl đặt hàng', 'khối lượng đặt'], 8);
            const idxOrdStat = findIdx(['tt đặt hàng', 'trạng thái đặt'], 9);
            const idxExpDate = findIdx(['ngày có hàng', 'dự kiến'], 10);
            const idxIssue = findIdx(['vướng mắc', 'tồn đọng - nội dung'], 11);
            const idxCO = findIdx(['chứng từ co'], 13);
            const idxCQ = findIdx(['chứng từ cq'], 14);
            const idxFire = findIdx(['kiểm định pccc'], 15);
            const idxDispatch = findIdx(['đã gửi tới ct', 'luân chuyển'], 16);
            const idxDispatchDate = findIdx(['ngày luân chuyển'], 17);
            const idxNotes = findIdx(['ghi chú'], 18);

            rows.slice(startRow).forEach(row => {
              const jobContent = row[idxContent];
              if (!jobContent) return;
              
              const stt = String(row[idxSTT] || '');
              const contentStr = String(jobContent);
              const rKey = baselineKey(stt, contentStr);
              const existing = materialBaselineMap.get(rKey);

              const updateData = {
                progressStatus: String(row[idxProg] || row[idxProg+1] || 'Chưa thi công'),
                orderedVolume: numVal(row[idxOrdVol]),
                orderedStatus: String(row[idxOrdStat] || 'Chưa đặt hàng'),
                expectedDate: parseExcelDate(row[idxExpDate]),
                issueContent: String(row[idxIssue] || ''),
                docCo: String(row[idxCO] || '').toLowerCase().includes('x') || row[idxCO] === true || String(row[idxCO] || '') === '1',
                docCq: String(row[idxCQ] || '').toLowerCase().includes('x') || row[idxCQ] === true || String(row[idxCQ] || '') === '1',
                docFireInspection: String(row[idxFire] || '').toLowerCase().includes('x') || row[idxFire] === true || String(row[idxFire] || '') === '1',
                dispatchToSite: String(row[idxDispatch] || '').toLowerCase().includes('x') || row[idxDispatch] === true || String(row[idxDispatch] || '') === '1',
                dispatchDate: parseExcelDate(row[idxDispatchDate]),
                notes: String(row[idxNotes] || ''),
                techSpecModel: String(row[idxModel] || ''),
                techSpecOrigin: String(row[idxOrigin] || '')
              };

              if (existing) {
                updateMaterialPlan(existing.id, {
                  ...existing,
                  ...updateData
                });
              } else {
                addMaterialPlan({
                  projectCode: selectedProject,
                  stt: stt,
                  jobContent: contentStr,
                  unit: String(row[idxUnit] || ''),
                  contractVolume: numVal(row[idxVol]),
                  ...updateData
                });
              }
              matImportCount++;
            });
          }
        }

        // 2. Parse Purchasing
        if (purchasingSheetName) {
          const sheet = wb.Sheets[purchasingSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const content = row[1];
              if (!content) return;
              if (!/[a-zA-ZÀ-ỹ]/.test(content)) return;

              const stt = String(row[0] || '');
              const contentStr = String(content);
              const rKey = baselineKey(stt, contentStr);
              const existing = purchasingBaselineMap.get(rKey);

              const updateData = {
                volumeOrder: numVal(row[4]),
                unitPrice: numVal(row[5]),
                vatRate: numVal(row[6]),
                vatAmount: numVal(row[7]),
                totalAmount: numVal(row[8]),
                prepayPercent: numVal(row[9]),
                prepayAmount: numVal(row[10]),
                remainingAmount: numVal(row[11]),
                orderStatus: String(row[12] || 'Chưa đặt hàng'),
                contractStatus: String(row[13] || 'Chưa ký'),
                paymentDate: parseExcelDate(row[14]),
                invoiceStatus: String(row[15] || 'Chưa xuất'),
                notes: String(row[16] || '')
              };

              if (existing) {
                updatePurchasingPlan(existing.id, {
                  ...existing,
                  ...updateData
                });
              } else {
                addPurchasingPlan({
                  projectCode: selectedProject,
                  stt: stt,
                  content: contentStr,
                  unit: String(row[2] || ''),
                  volumeContract: numVal(row[3]),
                  ...updateData
                });
              }
              purImportCount++;
            });
          }
        }

        // 3. Parse Expense
        if (expenseSheetName) {
          const sheet = wb.Sheets[expenseSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const dateVal = row[1];
              const content = row[2];
              if (!dateVal || !content) return;
              addExpense({
                projectCode: selectedProject,
                stt: String(row[0] || ''),
                date: parseExcelDate(dateVal),
                content: String(content),
                description: String(row[3] || ''),
                unit: String(row[4] || ''),
                quantity: numVal(row[5]),
                unitPrice: numVal(row[6]),
                taxAmount: numVal(row[7]),
                totalAmount: numVal(row[8]),
                incomeAmount: numVal(row[9]),
                balanceFund: numVal(row[10]),
                notes: String(row[11] || ''),
                invoiceUrl: String(row[12] || '')
              });
              expImportCount++;
            });
          }
        }

        // 4. Parse Labor
        if (laborSheetName) {
          const sheet = wb.Sheets[laborSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const content = row[2];
              if (!content) return;
              if (!/[a-zA-ZÀ-ỹ]/.test(content)) return;
              addLaborPayroll({
                projectCode: selectedProject,
                stt: String(row[0] || ''),
                date: String(row[1] || ''),
                content: String(content),
                description: String(row[3] || ''),
                unit: String(row[4] || ''),
                quantity: numVal(row[5]),
                unitPrice: numVal(row[6]),
                totalAmount: numVal(row[7]),
                bankAccount: String(row[8] || ''),
                bankInfo: String(row[9] || ''),
                idCardFrontUrl: String(row[10] || ''),
                idCardBackUrl: String(row[11] || ''),
                paymentStatus: String(row[12] || 'Chưa thanh toán'),
                notes: String(row[13] || '')
              });
              labImportCount++;
            });
          }
        }

        let summaryMessage = `Đã nhập dữ liệu dự án ${selectedProject} thành công! \n`;
        if (matImportCount > 0) summaryMessage += `- ${matImportCount} dòng Kế hoạch vật tư \n`;
        if (purImportCount > 0) summaryMessage += `- ${purImportCount} dòng Mua sắm hàng hóa \n`;
        if (expImportCount > 0) summaryMessage += `- ${expImportCount} dòng Chi phí công trình \n`;
        if (labImportCount > 0) summaryMessage += `- ${labImportCount} dòng Lương công nhật`;

        triggerToast(summaryMessage, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        triggerToast('Lỗi phân tích file Excel: ' + err.message, 'warning');
      }
    };
    reader.readAsBinaryString(file);
  };

  const { projectId } = useParams();

  // Active Project Code
  const projectOptions = useMemo(() => {
    // Collect all project codes from projects list
    const codes = new Set(projects.map(p => p.code));
    // Also add codes from materialPlans if not present
    materialPlans.forEach(p => codes.add(p.projectCode));
    return Array.from(codes);
  }, [projects, materialPlans]);

  const [selectedProject, setSelectedProject] = useState<string>('');

  const resolvedProjectCode = useMemo(() => {
    if (!projectId) return '';
    const proj = projects.find(p => p.id === projectId || p.code === projectId);
    return proj ? proj.code : '';
  }, [projectId, projects]);

  useEffect(() => {
    if (resolvedProjectCode) {
      setSelectedProject(resolvedProjectCode);
    } else if (projectOptions.length > 0) {
      if (!selectedProject || !projectOptions.includes(selectedProject)) {
        setSelectedProject(projectOptions[0]);
      }
    } else {
      setSelectedProject('');
    }
  }, [resolvedProjectCode, projectOptions, selectedProject]);

  const [activeTab, setActiveTab] = useState<any>('TECH');
  const outletContext = useOutletContext<{ setSubTitle?: (title: string) => void }>();

  useEffect(() => {
    if (outletContext?.setSubTitle) {
      if (activeTab === 'TECH') outletContext.setSubTitle('Đặt hàng');
      else if (activeTab === 'DOCS') outletContext.setSubTitle('Chứng từ');
      else if (activeTab === 'FINANCE') outletContext.setSubTitle('Thanh toán');
      else if (activeTab === 'EXPENSE') outletContext.setSubTitle('Chi phí công trình');
      else outletContext.setSubTitle('');
    }
    
    // Clear subtitle when component unmounts (e.g. switching to another main tab)
    return () => {
      if (outletContext?.setSubTitle) {
        outletContext.setSubTitle('');
      }
    };
  }, [activeTab, outletContext?.setSubTitle]);
  const [expenseSubTab, setExpenseSubTab] = useState<'SUMMARY' | 'DETAIL' | 'LABOR'>('SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const isSubmittingPlanRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Expense Tab Filters
  const [expenseFilterDate, setExpenseFilterDate] = useState('all');
  const [expenseFilterContent, setExpenseFilterContent] = useState('all');
  const [expenseFilterUnit, setExpenseFilterUnit] = useState('all');

  // Labor Tab Filters
  const [laborFilterDate, setLaborFilterDate] = useState('all');
  const [laborFilterContent, setLaborFilterContent] = useState('all');
  const [laborFilterUnit, setLaborFilterUnit] = useState('all');

  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
  }, [activeTab]);

  // Modals state
  const [editingPlan, setEditingPlan] = useState<ProjectMaterialPlan | null>(null);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [sectionPlanIdForNew, setSectionPlanIdForNew] = useState<string | null>(null);
  const [parentPlanIdForNew, setParentPlanIdForNew] = useState<string | null>(null);
  const [isCreatingSectionHeader, setIsCreatingSectionHeader] = useState(false);
  const [editingPurchasing, setEditingPurchasing] = useState<ProjectPurchasing | null>(null);
  const [isNewPurchasingOpen, setIsNewPurchasingOpen] = useState(false);
  const [sectionPurchasingIdForNew, setSectionPurchasingIdForNew] = useState<string | null>(null);
  const [parentPurchasingIdForNew, setParentPurchasingIdForNew] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ProjectExpense | null>(null);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<any[]>([]);
  const [editingLabor, setEditingLabor] = useState<LaborPayroll | null>(null);
  const [isNewLaborOpen, setIsNewLaborOpen] = useState(false);
  const [triggerAddDoc, setTriggerAddDoc] = useState(false);

  // ----------------------------------------------------
  // FILTER DATA BY SELECTED PROJECT
  // ----------------------------------------------------
  // NOTE: both datasets are passed to the tabs AS-IS (project filter only). The
  // backend already returns them in Excel order (sections interleaved with their
  // items); re-sorting here (sections first, then items) or rebuilding the
  // purchasing rows from material plans breaks the hierarchy and duplicates
  // section rows. MaterialPlanTab / PurchasingTab handle grouping themselves.
  const currentProjMaterialPlans = useMemo(() =>
    materialPlans.filter((plan) => plan.projectCode === selectedProject && plan.jobContent?.trim()),
    [materialPlans, selectedProject]
  );

  const currentProjPurchasing = useMemo(() => {
    const projectPurchasing = purchasingPlans.filter((plan) => plan.projectCode === selectedProject);
    const validIds = new Set<string>();

    projectPurchasing.forEach(plan => {
      validIds.add(plan.id);
    });

    let added;
    do {
      added = false;
      projectPurchasing.forEach(plan => {
        if (validIds.has(plan.id) && plan.parentId && !validIds.has(plan.parentId)) {
           validIds.add(plan.parentId);
           added = true;
        }
      });
    } while (added);

    // Remove empty owner sections that were kept but shouldn't be.
    // Actually, if it's an owner section and has no children, it won't be in validIds from pass 1
    // UNLESS it had no matPlan. If it had no matPlan, it was added in pass 1.
    // Let's ensure owner sections without matPlan are removed if they have no valid children.
    projectPurchasing.forEach(plan => {
      if (validIds.has(plan.id) && isSectionMarker(plan.stt, plan.notes)) {
        const matPlan = plan.materialPlanId 
          ? currentProjMaterialPlans.find(m => m.id === plan.materialPlanId)
          : currentProjMaterialPlans.find(m => normalizePlanKey(m.stt, m.jobContent) === normalizePlanKey(plan.stt, plan.content));
        
        if (!matPlan) { /* owner check removed */ }
      }
    });

    return projectPurchasing.filter(plan => validIds.has(plan.id));
  }, [purchasingPlans, selectedProject, currentProjMaterialPlans]);

  // Tự động đồng bộ các hạng mục do nhà thầu cung cấp sang tab Mua hàng (chạy ngầm, không gây treo máy nhờ debounce)
  useEffect(() => {
    if (!selectedProject || currentProjMaterialPlans.length === 0) return;
    if (isSubmittingPlanRef.current) return;

    let isCancelled = false;
    const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const syncMissing = async () => {
      const contractorPlans = currentProjMaterialPlans;

      const missingPlans = contractorPlans.filter(plan => {
        if (syncingIdsRef.current.has(plan.id)) return false;
        return !currentProjPurchasing.some(p => 
          p.materialPlanId === plan.id || 
          (norm(p.stt) === norm(plan.stt) && norm(p.content) === norm(plan.jobContent))
        );
      });

      if (missingPlans.length === 0) return;

      const findPurchasingParentId = (matParentId?: string): string | undefined => {
        if (!matParentId) return undefined;
        const parentMat = currentProjMaterialPlans.find(m => m.id === matParentId);
        if (!parentMat) return undefined;
        const match = currentProjPurchasing.find(p =>
          norm(p.stt) === norm(parentMat.stt) && norm(p.content) === norm(parentMat.jobContent)
        );
        return match ? match.id : undefined;
      };

      for (const plan of missingPlans) {
        if (isCancelled) break;
        
        syncingIdsRef.current.add(plan.id);
        const parentId = findPurchasingParentId(plan.parentId);

        try {
          await addPurchasingPlan({
            projectCode: selectedProject,
            materialPlanId: plan.id,
            stt: plan.stt || '',
            content: plan.jobContent || '',
            unit: plan.unit || 'bộ',
            volumeContract: plan.contractVolume || 1,
            volumeOrder: 0,
            unitPrice: 0,
            vatRate: 0,
            vatAmount: 0,
            totalAmount: 0,
            prepayPercent: 0,
            prepayAmount: 0,
            remainingAmount: 0,
            orderStatus: 'Chưa đặt hàng',
            contractStatus: 'Đã có phụ lục',
            invoiceStatus: 'Chưa xuất',
            notes: plan.notes || '',
            parentId: parentId
          });
          // Yield to event loop
          await new Promise(r => setTimeout(r, 10));
        } catch (e) {
          console.error('Auto sync error:', e);
        } finally {
          syncingIdsRef.current.delete(plan.id);
        }
      }
    };

    syncMissing();

    return () => {
      isCancelled = true;
    };
  }, [selectedProject, currentProjMaterialPlans, currentProjPurchasing]);
  const laborWorkerNames = useMemo(() => {
    const names = new Set<string>();
    laborPayrolls.forEach(l => { if (l.workerName?.trim()) names.add(l.workerName.trim()); });
    return Array.from(names);
  }, [laborPayrolls]);

  const laborContents = useMemo(() => {
    const contents = new Set<string>();
    laborPayrolls.forEach(l => { if (l.content?.trim()) contents.add(l.content.trim()); });
    return Array.from(contents);
  }, [laborPayrolls]);

  const laborDescriptions = useMemo(() => {
    const desc = new Set<string>();
    laborPayrolls.forEach(l => { if (l.description?.trim()) desc.add(l.description.trim()); });
    return Array.from(desc);
  }, [laborPayrolls]);

  const laborUnits = useMemo(() => {
    const units = new Set<string>();
    laborPayrolls.forEach(l => { if (l.unit?.trim()) units.add(l.unit.trim()); });
    return Array.from(units);
  }, [laborPayrolls]);

  const laborBankAccounts = useMemo(() => {
    const accounts = new Set<string>();
    laborPayrolls.forEach(l => { if (l.bankAccount?.trim()) accounts.add(l.bankAccount.trim()); });
    return Array.from(accounts);
  }, [laborPayrolls]);

  const laborBankInfos = useMemo(() => {
    const infos = new Set<string>();
    laborPayrolls.forEach(l => { if (l.bankInfo?.trim()) infos.add(l.bankInfo.trim()); });
    return Array.from(infos);
  }, [laborPayrolls]);

  const currentProjExpenses = useMemo(() => {
    const sortedOldestFirst = expenses.filter(p => p.projectCode === selectedProject).sort((a, b) => {
      return sttSortValue(a.stt) - sttSortValue(b.stt);
    });
    let currentBalance = 0;
    const computed = sortedOldestFirst.map(exp => {
      currentBalance = currentBalance + Number(exp.incomeAmount || 0) - Number(exp.totalAmount || 0);
      return { ...exp, autoBalance: currentBalance };
    });
    return computed;
  }, [expenses, selectedProject]);

  const expenseDateOptions = useMemo(() => ['all', ...Array.from(new Set(currentProjExpenses.map(p => p.date).filter(Boolean)))], [currentProjExpenses]);
  const expenseContentOptions = useMemo(() => ['all', ...Array.from(new Set(currentProjExpenses.map(p => p.content).filter(Boolean)))], [currentProjExpenses]);
  const expenseUnitOptions = useMemo(() => ['all', ...Array.from(new Set(currentProjExpenses.map(p => p.unit).filter(Boolean)))], [currentProjExpenses]);

  const filteredProjExpenses = useMemo(() => {
    return currentProjExpenses.filter(exp => {
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch = !q ||
        (exp.content || '').toLowerCase().includes(q) ||
        (exp.description || '').toLowerCase().includes(q) ||
        (exp.notes || '').toLowerCase().includes(q);
        
      const matchColumn = 
        (expenseFilterDate === 'all' || exp.date === expenseFilterDate) &&
        (expenseFilterContent === 'all' || exp.content === expenseFilterContent) &&
        (expenseFilterUnit === 'all' || exp.unit === expenseFilterUnit);
        
      return matchSearch && matchColumn;
    });
  }, [currentProjExpenses, searchQuery, expenseFilterDate, expenseFilterContent, expenseFilterUnit]);

  const currentProjLabor = useMemo(() => 
    laborPayrolls.filter(p => p.projectCode === selectedProject).sort((a, b) => sttSortValue(a.stt) - sttSortValue(b.stt)),
    [laborPayrolls, selectedProject]
  );

  const laborDateOptions = useMemo(() => ['all', ...Array.from(new Set(currentProjLabor.map(p => p.date).filter(Boolean)))], [currentProjLabor]);
  const laborContentOptions = useMemo(() => ['all', ...Array.from(new Set(currentProjLabor.map(p => p.content).filter(Boolean)))], [currentProjLabor]);
  const laborUnitOptions = useMemo(() => ['all', ...Array.from(new Set(currentProjLabor.map(p => p.unit).filter(Boolean)))], [currentProjLabor]);



  const filteredProjLabor = useMemo(() => {
    return currentProjLabor.filter(lab => {
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch = !q ||
        (lab.content || '').toLowerCase().includes(q) ||
        (lab.description || '').toLowerCase().includes(q) ||
        (lab.workerName || '').toLowerCase().includes(q);
        
      const matchColumn = 
        (laborFilterDate === 'all' || lab.date === laborFilterDate) &&
        (laborFilterContent === 'all' || lab.content === laborFilterContent) &&
        (laborFilterUnit === 'all' || lab.unit === laborFilterUnit);
        
      return matchSearch && matchColumn;
    });
  }, [currentProjLabor, searchQuery, laborFilterDate, laborFilterContent, laborFilterUnit]);

  const expenseSpenderNames = useMemo(() => {
    const names = new Set<string>();
    names.add('DỰ ÁN');
    names.add('Công ty');
    expenses.forEach(exp => {
      if (exp.spenderName?.trim()) names.add(exp.spenderName.trim());
    });
    if (Array.isArray(engineers)) {
      engineers.forEach(eng => {
        if (eng.name?.trim()) names.add(eng.name.trim());
      });
    }
    return Array.from(names);
  }, [expenses, engineers]);

  const combinedCashFlow = useMemo(() => {
    const e = filteredProjExpenses.map(exp => ({ ...exp, isLabor: false }));
    const l = filteredProjLabor.map(lab => ({ ...lab, isLabor: true }));
    
    const combined = [...e, ...l].sort((a, b) => {
        return sttSortValue(a.stt) - sttSortValue(b.stt);
      });

    let currentBalance = 0;
    const computed = combined.map(record => {
      if (!record.isLabor) {
        currentBalance = currentBalance + Number((record as any).incomeAmount || 0) - Number(record.totalAmount || 0);
      } else {
        currentBalance = currentBalance - Number(record.totalAmount || 0);
      }
      return { ...record, autoBalance: currentBalance };
    });
    return computed;
  }, [filteredProjExpenses, filteredProjLabor]);

  const expenseContentTypes = useMemo(() => {
    const contents = new Set<string>();
    expenses.forEach(exp => {
      if (exp.content?.trim()) contents.add(exp.content.trim());
    });
    ['Vật tư/ thiết bị', 'Tạm ứng', 'Tiền xe', 'Tiền ăn', 'Tiền xăng', 'Mời thợ/vận hành ăn uống', 'Khác'].forEach(t => contents.add(t));
    return Array.from(contents);
  }, [expenses]);

  // ----------------------------------------------------
  // COMPUTED METRICS
  // ----------------------------------------------------
  const projectMetrics = useMemo(() => {
    const materialRows = currentProjMaterialPlans.filter((p) => !isSectionMarker(p.stt, p.notes));
    const purchasingRows = currentProjPurchasing.filter((p) => !isSectionMarker(p.stt, p.notes));
  console.log("ALL PURCHASING ITEMS:", currentProjPurchasing.length);
  console.log("CONTRACTOR PURCHASING ITEMS:", currentProjPurchasing.filter(p => !isSectionMarker(p.stt, p.notes)).length);
    const normalizeStatusText = (value?: string) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\u0111/g, 'd').replace(/đ/g, 'd');
    const calcPurchasingTotal = (p: ProjectPurchasing) => {
      const vatAmount = Number(p.vatAmount || 0) || (Number(p.volumeOrder || 0) * Number(p.unitPrice || 0) * Number(p.vatRate || 0)) / 100;
      return Number(p.totalAmount || 0) || (Number(p.volumeOrder || 0) * Number(p.unitPrice || 0)) + vatAmount;
    };
    const totalPurchasing = purchasingRows.reduce((sum, p) => sum + calcPurchasingTotal(p), 0);
    const paidPurchasing = purchasingRows.reduce((sum, p) => sum + Number(p.prepayAmount || 0), 0);
    const orderedCount = materialRows.filter((p) => normalizeStatusText(p.orderedStatus).includes('da co hang') || normalizeStatusText(p.orderedStatus).includes('da nhan')).length;
    const totalExp = currentProjExpenses.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);
    const totalLab = currentProjLabor.reduce((sum, l) => sum + Number(l.totalAmount || 0), 0);
    const totalSpent = totalExp + totalLab;
    const fund = currentProjExpenses.reduce((sum, e) => sum + Number(e.incomeAmount || 0), 0);
    const balanceExp = currentProjExpenses[0]; // First is the newest after .reverse()
    const balance = balanceExp
      ? Number(balanceExp.autoBalance || 0)
      : fund - totalSpent;
    const missingCo = materialRows.filter(p => !p.docCo).length;
    const missingCq = materialRows.filter(p => !p.docCq).length;
    const missingFireInspection = materialRows.filter(p => !p.docFireInspection).length;
    const progressValues = materialRows.map((p) => {
      const orderStatus = normalizeStatusText(p.orderedStatus);
      let progress = 0;
      if (orderStatus.includes('da dat')) progress = Math.max(progress, 50);
      if (orderStatus.includes('dang giao')) progress = Math.max(progress, 70);
      if (orderStatus.includes('da co hang') || orderStatus.includes('da nhan')) progress = Math.max(progress, 80);
      if (p.docCo || p.docCq || p.docFireInspection) progress += 10;
      if (p.dispatchToSite) progress += 10;
      return Math.min(progress, 100);
    });
    const progressPercent = progressValues.length > 0 ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : 0;

    return {
      totalPurchasing,
      paidPurchasing,
      totalSpent,
      totalExp,
      totalLab,
      fund,
      balance,
      missingCo,
      missingCq,
      missingFireInspection,
      orderedCount,
      progressPercent,
      totalProjectCost: totalPurchasing + totalExp,
    };
  }, [selectedProject, currentProjMaterialPlans, currentProjPurchasing, currentProjExpenses, currentProjLabor]);

  // Chart Data
  const chartData = useMemo(() => {
    return [
      { name: 'Mua sắm VTTB', value: projectMetrics.totalPurchasing },
      { name: 'Chi phí thi công', value: projectMetrics.totalExp },
      { name: 'Chi lương công nhật', value: projectMetrics.totalLab },
    ];
  }, [projectMetrics]);

  const COLORS = ['#0284c7', '#e11d48', '#f59e0b'];

  // ----------------------------------------------------
  // EXPORT TO EXCEL
  // ----------------------------------------------------
  const handleExportExcel = () => {
    let data: any[] = [];
    let sheetName = '';
    
    if ((activeTab === 'TECH' || activeTab === 'DOCS' || activeTab === 'FINANCE')) {
      data = currentProjMaterialPlans.map(p => {
        const norm = (s?: string) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
        const pRecord = currentProjPurchasing.find(
          x => x.materialPlanId === p.id || (norm(x.stt) === norm(p.stt) && norm(x.content) === norm(p.jobContent))
        );
        return {
          "STT": p.stt,
          "Nội dung công việc": p.jobContent,
          "ĐVT": p.unit,
          "Khối lượng HĐ": p.contractVolume,
          "Mã hiệu": p.techSpecModel || "",
          "Xuất xứ": p.techSpecOrigin || "",
          "Tình trạng": p.progressStatus || "",
          "KL Đặt hàng": p.orderedVolume || 0,
          "TT Đặt hàng": p.orderedStatus || "",
          "Ngày có hàng (dự kiến)": p.expectedDate || "",
          "Vướng mắc/Tồn đọng - Nội dung": p.issueContent || "",
          "Vướng mắc/Tồn đọng - TT xử lý": p.issueStatus || "",
          "Chứng từ CO": p.docCo ? "Có" : "Chưa có",
          "Chứng từ CQ": p.docCq ? "Có" : "Chưa có",
          "Kiểm định PCCC": p.docFireInspection ? "Có" : "Chưa có",
          "Đã gửi tới CT": p.dispatchToSite ? "Có" : "Chưa gửi",
          "Ngày luân chuyển": p.dispatchDate || "",
          "KL Đặt hàng mua": pRecord?.volumeOrder || 0,
          "Đơn giá mua": pRecord?.unitPrice || 0,
          "VAT %": pRecord?.vatRate || 0,
          "Tiền VAT": pRecord?.vatAmount || 0,
          "Thành tiền mua": pRecord?.totalAmount || 0,
          "Trạng thái ĐH mua": pRecord?.orderStatus || "",
          "Tình trạng hợp đồng": pRecord?.contractStatus || "",
          "% tạm ứng": pRecord ? Math.round(pRecord.prepayPercent * 100) : 0,
          "Thực chi": pRecord?.prepayAmount || 0,
          "Hạn thanh toán": pRecord?.paymentDate || "",
          "Hóa đơn VAT": pRecord?.invoiceStatus || "",
          "Ghi chú": p.notes || ""
        };
      });
      sheetName = "VatTuVaMuaHang";
    }else if (activeTab === 'EXPENSE') {
      data = currentProjExpenses.map(e => ({
        'STT': e.stt,
        'Ngày': e.date,
        'Nội dung': e.content,
        'Diễn giải': e.description,
        'ĐVT': e.unit,
        'Số lượng': e.quantity,
        'Đơn giá': e.unitPrice,
        'Thành tiền': e.totalAmount,
        'Thu': e.incomeAmount || 0,
        'Tồn quỹ': e.balanceFund || 0,
        'Ghi chú': e.notes || '',
        'Link Hóa đơn': e.invoiceUrl || ''
      }));
      sheetName = 'ChiPhiCongTrinh';
    } else if (activeTab === 'LABOR') {
      data = currentProjLabor.map(l => ({
        'STT': l.stt,
        'Ngày': l.date,
        'Nội dung': l.content,
        'Diễn giải': l.description,
        'ĐVT': l.unit,
        'Số lượng': l.quantity,
        'Đơn giá': l.unitPrice,
        'Thành tiền': l.totalAmount,
        'Số tài khoản': l.bankAccount,
        'Tên thụ hưởng': l.bankInfo || '',
        'CCCD Mặt trước': l.idCardFrontUrl || '',
        'CCCD Mặt sau': l.idCardBackUrl || '',
        'Tình trạng': l.paymentStatus,
        'Ghi chú': l.notes || ''
      }));
      sheetName = 'LuongCongNhat';
    } else if (activeTab === 'DOCUMENTS') {
      data = currentProjMaterialPlans.filter(p => !isSectionMarker(p.stt, p.notes)).map(p => ({
        'TT': p.stt,
        'Danh mục hàng hóa': p.jobContent,
        'ĐV': p.unit,
        'SL': p.contractVolume,
        'Model/xuất xứ': [p.techSpecModel, p.techSpecOrigin].filter(Boolean).join(' / '),
        'Chứng từ': ['CO: ' + (p.docCo ? 'Có' : 'Chưa có'), 'CQ: ' + (p.docCq ? 'Có' : 'Chưa có'), 'Tem KĐ: ' + (p.docStamp ? 'Có' : 'Chưa có'), 'Kiểm định PCCC: ' + (p.docFireInspection ? 'Có' : 'Chưa có')].join('; '),
        'Ghi chú': p.notes || ''
      }));
      sheetName = 'TheoDoiChungTu';
    } else {
      return; // No export for Overview
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${selectedProject}_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Form states for creating items
  const [newPlanData, setNewPlanData] = useState<Partial<ProjectMaterialPlan> & { isContractor?: boolean }>({
    stt: '', jobContent: '', unit: 'bộ', contractVolume: 1, techSpecModel: '', techSpecOrigin: '', progressStatus: 'Chưa thi công', orderedVolume: 0, orderedStatus: 'Chưa đặt hàng', expectedDate: '', issueContent: '', docCo: false, docCq: false, docFireInspection: false, dispatchToSite: false, notes: '', isContractor: true
  });
  const [newPurchasingData, setNewPurchasingData] = useState<Partial<ProjectPurchasing>>({
    stt: '', content: '', unit: 'bộ', volumeContract: 1, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''
  });
  const [newExpenseData, setNewExpenseData] = useState<Partial<ProjectExpense>>({
    stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''
  });
  const [newLaborData, setNewLaborData] = useState<Partial<LaborPayroll>>({
    stt: '', date: new Date().toISOString().split('T')[0], content: 'TT tiền công', description: 'Lương thợ điện', unit: 'Công', quantity: 1, unitPrice: 500000, bankAccount: '', bankInfo: '', idCardFrontUrl: '', idCardBackUrl: '', paymentStatus: 'Chưa thanh toán', notes: ''
  });

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Hidden file input for Excel import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportExcel} 
        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx" 
        className="hidden" 
      />

      {/* HEADER SECTION */}
      {!projectId && (
        <section className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm px-3 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-slate-900 border-l-4 border-primary pl-2 uppercase font-['Inter']">MUA HÀNG & CHI PHÍ</h1>
          </div>

          {/* Project Selector & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <span className="text-[13px] font-bold text-slate-500 uppercase px-2 whitespace-nowrap">Dự án:</span>
              <CustomSelect 
                value={selectedProject} 
                onChange={(e) => setSelectedProject(e.target.value)} 
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-md text-[13px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                {projectOptions.length === 0 ? (
                  <option value="">-- Chưa có dự án --</option>
                ) : (
                  projectOptions.map(code => {
                    const proj = projects.find(p => p.code === code);
                    return <option key={code} value={code}>{proj?.name || code}</option>;
                  })
                )}
              </CustomSelect>
            </div>
          </div>
        </section>
      )}

      {/* TABS SELECTOR */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs border-x">
        <div className="flex items-center gap-4">
          {[
            { id: 'TECH', label: 'Đặt hàng', icon: 'list_alt', show: true },
            { id: 'DOCS', label: 'Chứng từ', icon: 'description', show: true },
            { id: 'FINANCE', label: 'Thanh toán', icon: 'payments', show: user?.role !== 'engineer' },
            { id: 'EXPENSE', label: 'Chi Phí Công Trình', icon: 'receipt_long', show: user?.role !== 'engineer' },
          ].filter(t => t.show).map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-1.5 text-[12px] font-bold border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {true && (
          <div className="flex gap-2 pb-1.5">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => {
                if (!selectedProject) {
                  triggerToast('Vui lòng khởi tạo dự án trước khi nhập dữ liệu!', 'warning');
                  return;
                }
                fileInputRef.current?.click();
              }} 
              className="flex items-center gap-2 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_upload</span>
              Nhập Excel
            </button>
            <button 
              onClick={() => {
                if (!selectedProject) {
                  triggerToast('Vui lòng khởi tạo dự án trước khi xuất dữ liệu!', 'warning');
                  return;
                }
                handleExportExcel();
              }} 
              className="flex items-center gap-2 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              Xuất Excel
            </button>

            {(activeTab !== 'TECH' && activeTab !== 'DOCS' && activeTab !== 'FINANCE' && activeTab !== 'EXPENSE') && activeTab !== 'PURCHASING' && (
              <button 
                onClick={() => {
                  if (!selectedProject) {
                    triggerToast('Vui lòng khởi tạo dự án trước khi thêm dữ liệu!', 'warning');
                    return;
                  }
                  setIsCreatingSectionHeader(false);
                  if (activeTab === 'EXPENSE') {
                    if (expenseSubTab === 'LABOR') setIsNewLaborOpen(true);
                    else setIsNewExpenseOpen(true);
                  }
                  else if (activeTab === 'DOCUMENTS') setTriggerAddDoc(true);
                }} 
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90 active:scale-95 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Thêm Mới
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB CONTENTS */}
      <div className="bg-white border-x border-b border-slate-200 shadow-xs overflow-hidden flex-1">
        
        {/* MATERIAL PLAN TAB */}
        {(activeTab === 'TECH' || activeTab === 'DOCS' || activeTab === 'FINANCE') && (
          <MaterialAndPurchasingTab
            activeSubTab={activeTab}
            selectedProject={selectedProject}
            onAddMaterial={addMaterialPlan}
            data={currentProjMaterialPlans}
            purchasingData={currentProjPurchasing}
            onUpdateMaterial={handleUpdateMaterialPlanSync}
            onUpdatePurchasing={handleUpdatePurchasingPlanSync}
            onEditMaterial={setEditingPlan}
            onEditPurchasing={setEditingPurchasing}
            onDelete={(id) => {
              const item = currentProjMaterialPlans.find(p => p.id === id);
              setDeleteConfirm({ isOpen: true, id, type: "material", title: "Xóa kế hoạch vật tư", itemName: `hạng mục "${item?.jobContent}"` });
            }}
            onAddSubtask={(plan, suggestedStt) => {
              setParentPlanIdForNew(plan.id);
              const section = getSectionForMaterialPlan(plan, currentProjMaterialPlans);
              if (section) setSectionPlanIdForNew(section.id);
              setIsCreatingSectionHeader(false);
              setIsNewPlanOpen(true);
              setNewPlanData(prev => ({ ...prev, stt: suggestedStt || "", isContractor: isEffectiveContractorPlan(plan, currentProjMaterialPlans) }));
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            userRole={user?.role}
            onAddSection={() => {
              setIsCreatingSectionHeader(true);
              setParentPlanIdForNew(null);
              setSectionPlanIdForNew(null);
              setIsNewPlanOpen(true);
              setNewPlanData(prev => ({ ...prev, stt: '', jobContent: '' }));
            }}
          />
        )}

        {/* DOCUMENTS TAB */}
        


        {/* EXPENSE TAB */}
        {activeTab === 'EXPENSE' && (
          <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-white flex flex-col" id="expense-unified-view">
            
            
            {/* 1. BẢNG TỔNG QUAN */}
            <div className="shrink-0 w-full overflow-x-auto">
              <CostPlanSummaryTable 
                expenses={currentProjExpenses} 
                labors={currentProjLabor} 
                onAllocateFund={(name, amount) => {
                  if (name === 'KHÁC') return;
                  
                  let targetName = name;
                  let currentTotalFund = 0;
                  let personExpenses: any[] = [];
                  let title = '';
                  
                  if (name === '__PROJECT__') {
                    personExpenses = currentProjExpenses.filter(e => e.spenderName === 'DỰ ÁN' && e.content === 'Quỹ Công Trình');
                    currentTotalFund = currentProjExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
                    title = 'Quỹ Tổng Công Trình';
                    targetName = 'DỰ ÁN';
                  } else {
                    if (!targetName) {
                      const inputName = window.prompt('Nhập tên người muốn cấp quỹ:');
                      if (!inputName || !inputName.trim()) return;
                      targetName = inputName.trim();
                    }
                    personExpenses = currentProjExpenses.filter(e => e.spenderName === targetName);
                    currentTotalFund = personExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
                    title = `Tổng Quỹ cho [${targetName.toUpperCase()}]`;
                  }
                  
                  let newTotal = 0;
                  
                  if (amount !== undefined) {
                    newTotal = amount;
                  } else {
                    const input = window.prompt(`Cập nhật ${title}:\n(Nhập số tiền, hiện tại là: ${currentTotalFund.toLocaleString('vi-VN')})`, currentTotalFund.toString());
                    if (input === null) return;
                    
                    newTotal = parseInt(input.replace(/[,.]/g, ''), 10);
                    if (isNaN(newTotal)) {
                      triggerToast('Số tiền không hợp lệ', 'warning');
                      return;
                    }
                  }
                  
                  const diff = newTotal - currentTotalFund;
                  if (diff === 0) return;
                  
                  const adjustmentContent = name === '__PROJECT__' ? 'Quỹ Công Trình' : 'Cấp quỹ';
                  const adjustmentRecord = personExpenses.find(e => e.content === adjustmentContent && (e.totalAmount || 0) === 0);
                  
                  if (adjustmentRecord) {
                    updateExpense(adjustmentRecord.id, {
                      ...adjustmentRecord,
                      incomeAmount: (adjustmentRecord.incomeAmount || 0) + diff,
                      balanceFund: (adjustmentRecord.balanceFund || 0) + diff
                    });
                  } else {
                    addExpense({
                      projectCode: selectedProject,
                      spenderName: targetName,
                      content: adjustmentContent,
                      description: name === '__PROJECT__' ? 'Khởi tạo Quỹ Công Trình' : `Cấp quỹ cho ${targetName}`,
                      date: new Date().toISOString().split('T')[0],
                      quantity: 0,
                      unitPrice: 0,
                      taxAmount: 0,
                      totalAmount: 0,
                      incomeAmount: diff,
                      balanceFund: diff
                    } as any);
                  }
                  triggerToast(`Đã cập nhật ${title.toLowerCase()}`, 'success');
                }}
              />
            </div>

            {/* CHI TIẾT PHIẾU CHI */}

            <div className="bg-white border-t border-slate-200 overflow-hidden flex-1 flex flex-col">
              <div className="flex border-b border-slate-100 bg-slate-50 px-5 py-1.5 gap-3 sticky top-0 z-20 items-center justify-end text-xs text-slate-600 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 font-bold text-slate-500 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px]">filter_list</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Ngày chi:</span>
                      <CustomSelect
                        value={expenseFilterDate}
                        onChange={e => setExpenseFilterDate(e.target.value)}
                        className="min-w-[70px] max-w-[120px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                      >
                        {expenseDateOptions.map(opt => (
                          <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                        ))}
                      </CustomSelect>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Nội dung:</span>
                      <CustomSelect
                        value={expenseFilterContent}
                        onChange={e => setExpenseFilterContent(e.target.value)}
                        className="min-w-[120px] max-w-[250px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                      >
                        {expenseContentOptions.map(opt => {
                          let label = opt;
                          if (label && label.length > 30) label = label.slice(0, 30) + '...';
                          return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                        })}
                      </CustomSelect>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium whitespace-nowrap">ĐVT:</span>
                      <CustomSelect
                        value={expenseFilterUnit}
                        onChange={e => setExpenseFilterUnit(e.target.value)}
                        className="min-w-[60px] max-w-[90px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                      >
                        {expenseUnitOptions.map(opt => (
                          <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                        ))}
                      </CustomSelect>
                    </div>
                  </div>
                 
                    <button 
                      onClick={() => setIsNewExpenseOpen(true)}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm ml-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm phiếu chi
                    </button>
 </div> <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                  <tr>
                    <th className="px-2 py-1.5 w-8 text-center">STT</th>
                    <th className="px-2 py-1.5 w-[70px]">Ngày</th>
                    <th className="px-2 py-1.5 min-w-[90px]">Người PT/Tên</th>
                    <th className="px-2 py-1.5 min-w-[180px]">Nội dung / Diễn giải</th>
                    <th className="px-2 py-1.5 w-10 text-left">ĐVT</th>
                    <th className="px-2 py-1.5 w-10 text-right">SL</th>
                    <th className="px-2 py-1.5 text-right">Đơn giá</th>
                    <th className="px-2 py-1.5 text-right">VAT</th>
                    <th className="px-2 py-1.5 text-right min-w-[85px]">Thành tiền</th>
                    <th className="px-2 py-1.5 text-right min-w-[85px]">Thực thu</th>
                    <th className="px-2 py-1.5 text-right min-w-[85px]">Tồn quỹ</th>
                    <th className="px-2 py-1.5 min-w-[110px]">TK & Người nhận</th>
                    <th className="px-2 py-1.5 w-[70px]">Tình trạng</th>
                    <th className="px-2 py-1.5 text-center w-[50px]">H.Đơn</th>
                    <th className="px-2 py-1.5 text-center w-[50px]">CCCD</th>
                    <th className="px-2 py-1.5 min-w-[80px]">Ghi chú</th>
                    <th className="px-2 py-1.5 text-center w-14">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700 leading-tight">
                    {combinedCashFlow.map((record) => {
                      if (!record.isLabor) {
                        const exp = record as any;
                        return (
                          <tr key={'exp_'+exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingExpense(exp)}>
                            <td className="px-2 py-1.5 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                            <td className="px-2 py-1.5 font-semibold text-slate-900 whitespace-nowrap">{exp.date ? exp.date.substring(2) : '-'}</td>
                            <td className="px-2 py-1.5 font-semibold line-clamp-2" title={exp.spenderName}>{exp.spenderName || '-'}</td>
                            <td className="px-2 py-1.5">
                              <div className="font-bold text-slate-900 line-clamp-1" title={exp.content}>{exp.content}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={exp.description}>{exp.description}</div>
                            </td>
                            <td className="px-2 py-1.5 text-left">{exp.unit}</td>
                            <td className="px-2 py-1.5 text-right">{exp.quantity || '-'}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">{exp.unitPrice ? exp.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">{exp.taxAmount ? exp.taxAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-2 py-1.5 text-right font-bold text-rose-600 whitespace-nowrap">{exp.totalAmount ? exp.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-2 py-1.5 text-right font-bold text-emerald-600 whitespace-nowrap">{exp.incomeAmount ? exp.incomeAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-2 py-1.5 text-right font-bold text-slate-700 whitespace-nowrap">{exp.autoBalance ? exp.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="px-2 py-1.5 text-slate-400">-</td>
                            <td className="px-2 py-1.5 text-slate-400">-</td>
                            <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              {exp.invoiceUrl ? (
                                <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold whitespace-nowrap">Xem</button>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-2 py-1.5 text-slate-400 text-center">-</td>
                            <td className="px-2 py-1.5 text-[10px] max-w-[100px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                            <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: exp.id, type: 'expense', title: 'Xóa phiếu chi', itemName: `phiếu chi "${exp.content}"` })} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        const lab = record as any;
                        return (
                          <tr key={'lab_'+lab.id} className="hover:bg-blue-50/50 bg-blue-50/20 transition-colors align-middle cursor-pointer" onClick={() => setEditingLabor({...lab, date: lab.date || new Date().toISOString().split('T')[0]})}>
                            <td className="px-2 py-1.5 text-center font-bold text-blue-400">{lab.stt || '-'}</td>
                            <td className="px-2 py-1.5 font-semibold text-blue-900 whitespace-nowrap">{lab.date ? lab.date.substring(2) : '-'}</td>
                            <td className="px-2 py-1.5 font-bold text-blue-800 line-clamp-2" title={lab.workerName}>{lab.workerName || '-'}</td>
                            <td className="px-2 py-1.5">
                              <div className="font-bold text-blue-900 line-clamp-1" title={lab.content}>{lab.content}</div>
                              <div className="text-[10px] text-blue-600 mt-0.5 line-clamp-1" title={lab.description}>{lab.description}</div>
                            </td>
                            <td className="px-2 py-1.5 text-left">{lab.unit}</td>
                            <td className="px-2 py-1.5 text-right">{lab.quantity || '-'}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">{lab.unitPrice ? lab.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-2 py-1.5 text-right text-slate-400">-</td>
                            <td className="px-2 py-1.5 text-right font-bold text-rose-600 whitespace-nowrap">{lab.totalAmount ? lab.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-2 py-1.5 text-right text-slate-400">-</td>
                            <td className="px-2 py-1.5 text-right font-bold text-slate-700 whitespace-nowrap">{lab.autoBalance ? lab.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="px-2 py-1.5">
                              <div className="font-bold text-slate-900 line-clamp-1" title={lab.bankInfo}>{lab.bankInfo}</div>
                              <div className="font-mono text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{lab.bankAccount}</div>
                            </td>
                            <td className="px-2 py-1.5 text-[10px]" title={lab.paymentStatus}>
                              <span className={`inline-flex px-1 py-0.5 rounded text-[10px] whitespace-nowrap font-bold border ${
                                lab.paymentStatus === 'Đã thanh toán' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>
                                {lab.paymentStatus === 'Đã thanh toán' ? 'Đã T.Toán' : 'Chưa T.Toán'}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-slate-400 text-center">-</td>
                            <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-0.5">
                                {lab.idCardFrontUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardFrontUrl!); }} className="text-[10px] text-blue-600 hover:underline font-bold whitespace-nowrap">M.trước</button>
                                ) : null}
                                {lab.idCardBackUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardBackUrl!); }} className="text-[10px] text-blue-600 hover:underline font-bold whitespace-nowrap">M.sau</button>
                                ) : null}
                                {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">-</span>}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-slate-400">-</td>
                            <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: lab.id, type: 'labor', title: 'Xóa công nhật', itemName: `công nhật "${lab.workerName}"` })} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    })}
                    {combinedCashFlow.length === 0 && (
                      <tr><td colSpan={17} className="p-8 text-center text-slate-400">Chưa có giao dịch phiếu chi nào.</td></tr>
                    )}
                  </tbody>
            </table>
            </div>
          
            </div>
            </div>
)}

            </div>
      {/* MODALS */}
      {/* Xem ảnh Modal */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title="Xem hình ảnh hóa đơn/chứng từ" size="xl" icon="image">
        <div className="flex justify-center items-center bg-slate-50 rounded-lg overflow-hidden min-h-[400px] max-h-[80vh] relative p-4 border border-slate-200 m-4">
          {previewImage && <img src={previewImage} alt="Hóa đơn" className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-100" />}
        </div>
      </Modal>

      {/* Confirm dialog: Xóa hạng mục */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={deleteConfirm?.title || 'Xác nhận xóa'}>
        <div className="py-4">
          <p className="mb-8 text-sm font-medium text-slate-700">Bạn chắc chắn muốn xóa {deleteConfirm?.itemName}?</p>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded hover:bg-slate-50 transition-colors font-medium">Hủy</button>
            <button onClick={confirmDeleteAction} className="px-4 py-2 bg-[#e53935] text-white rounded hover:bg-red-700 transition-colors font-bold shadow-md">Xóa</button>
          </div>
        </div>
      </Modal>

      {/* 1. Modal Kế Hoạch Vật Tư */}
      <Modal isOpen={isNewPlanOpen} onClose={() => { setIsNewPlanOpen(false); setParentPlanIdForNew(null); setSectionPlanIdForNew(null); setIsCreatingSectionHeader(false); setNewPlanData({stt: '', jobContent: '', unit: 'bộ', contractVolume: 1, techSpecModel: '', techSpecOrigin: '', progressStatus: 'Chưa thi công', orderedVolume: 0, orderedStatus: 'Chưa đặt hàng', expectedDate: '', issueContent: '', docCo: false, docCq: false, docFireInspection: false, dispatchToSite: false, notes: '', isContractor: true}); }} title={isCreatingSectionHeader ? 'Thêm Đầu mục lớn — Kế hoạch Vật tư' : 'Thêm Hạng mục — Kế hoạch Vật tư'} size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const parentId = isCreatingSectionHeader ? null : (parentPlanIdForNew || sectionPlanIdForNew || null);
          
          // Auto STT: La Mã cho đầu mục lớn, số thứ tự cho hạng mục nhỏ
          const autoStt = newPlanData.stt || '';

          const isContractor = !!newPlanData.isContractor;
          const baseNote = (() => {
            const tags = [];
            if (isCreatingSectionHeader && !parentId) tags.push('[section]');
            if (isContractor) tags.push('[contractor]');
            if (newPlanData.notes) tags.push(newPlanData.notes);
            return tags.join(' | ');
          })();

          setIsSubmittingPlan(true);
          isSubmittingPlanRef.current = true;
          try {
            const createdMaterialId = await addMaterialPlan({
            projectCode: selectedProject,
            stt: autoStt,
            jobContent: newPlanData.jobContent || '',
            unit: newPlanData.unit || 'bộ',
            contractVolume: Number(newPlanData.contractVolume || 1),
            techSpecModel: newPlanData.techSpecModel || '',
            techSpecOrigin: newPlanData.techSpecOrigin || '',
            progressStatus: newPlanData.progressStatus || 'Chưa thi công',
            orderedVolume: Number(newPlanData.orderedVolume || 0),
            orderedStatus: newPlanData.orderedStatus || 'Chưa đặt hàng',
            expectedDate: newPlanData.expectedDate || '',
            issueContent: newPlanData.issueContent || '',
            docCo: !!newPlanData.docCo,
            docCq: !!newPlanData.docCq,
            docFireInspection: !!newPlanData.docFireInspection,
            dispatchToSite: !!newPlanData.dispatchToSite,
            supplyScope: isContractor ? 'contractor' : 'unknown',
            notes: baseNote,
            parentId: parentId || undefined
          });

          // Đồng bộ sang tab Mua hàng nếu là nhà thầu (Bao gồm cả đầu mục lớn để làm cha)
          if (isContractor) {
            if (createdMaterialId) syncingIdsRef.current.add(createdMaterialId);
            try {
              const contractVol = Number(newPlanData.contractVolume || 1);
              let purchasingParentId = undefined;
              if (parentId) {
                const findPurchasingMatch = (matId: string): string | undefined => {
                  const exactMatch = currentProjPurchasing.find(p => p.materialPlanId === matId);
                  if (exactMatch) return exactMatch.id;
                  
                  const matNode = currentProjMaterialPlans.find(p => p.id === matId);
                  if (!matNode) return undefined;
                  
                  const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
                  const matchingPurchasing = currentProjPurchasing.find(
                    p => norm(p.stt) === norm(matNode.stt) && norm(p.content) === norm(matNode.jobContent)
                  );
                  if (matchingPurchasing) return matchingPurchasing.id;
                  
                  if (matNode.parentId) return findPurchasingMatch(matNode.parentId);
                  return undefined;
                };
                purchasingParentId = findPurchasingMatch(parentId);
              }

              await addPurchasingPlan({
                projectCode: selectedProject,
                materialPlanId: createdMaterialId,
                stt: autoStt,
                content: newPlanData.jobContent || '',
                unit: newPlanData.unit || 'bộ',
                volumeContract: contractVol,
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
                notes: baseNote,
                parentId: purchasingParentId || undefined
              });
            } finally {
              setTimeout(() => {
                if (createdMaterialId) syncingIdsRef.current.delete(createdMaterialId);
              }, 500);
            }
          }

          // Đồng bộ sang tab Quản lý Tiến độ (TaskManagement)
          const projName = projects.find(p => p.code === selectedProject)?.name || selectedProject;
          const currentSectionName = (() => {
            if (isCreatingSectionHeader) return newPlanData.jobContent || '';
            if (parentId) {
              let currentObj = currentProjMaterialPlans.find(p => p.id === parentId);
              let safeCount = 0;
              while (currentObj && !isSectionMarker(currentObj.stt, currentObj.notes) && currentObj.parentId && safeCount < 50) {
                currentObj = currentProjMaterialPlans.find(p => p.id === currentObj!.parentId);
                safeCount++;
              }
              return currentObj?.jobContent || '';
            }
            const sectionId = sectionPlanIdForNew;
            if (sectionId) {
              const sec = currentProjMaterialPlans.find(p => p.id === sectionId);
              return sec?.jobContent || '';
            }
            return '';
          })();

          let taskParentId = undefined;
          if (parentId) {
            const parentObj = currentProjMaterialPlans.find(p => p.id === parentId);
            if (parentObj) {
              // Tìm Task ID tương ứng với parentObj (vì parentId hiện tại là ID của MaterialPlan)
              // Cần ưu tiên task nằm trong cùng sectionName
              const isParentSec = isSectionMarker(parentObj.stt, parentObj.notes);
              const pTask = tasks.find(t => 
                t.projectCode === selectedProject && 
                t.name === parentObj.jobContent && 
                (isParentSec ? t.isSectionHeader : (!t.isSectionHeader && t.sectionName === currentSectionName))
              ) || tasks.find(t => t.projectCode === selectedProject && t.name === parentObj.jobContent);
              
              if (pTask) {
                taskParentId = pTask.id;
              }
            }
          }

          addTask({
            stt: autoStt,
            code: '',
            name: newPlanData.jobContent || '',
            projectCode: selectedProject,
            projectName: projName,
            volume: Number(newPlanData.contractVolume || 1),
            unit: newPlanData.unit || 'bộ',
            progress: 0,
            status: 'Chưa làm',
            purchaseStatus: 'Chưa đặt hàng',
            constrStatus: 'Chưa thi công',
            isDone: false,
            isSectionHeader: isCreatingSectionHeader,
            sectionName: currentSectionName,
            notes: baseNote,
            parentId: taskParentId
          });

          } finally {
            setIsSubmittingPlan(false);
            isSubmittingPlanRef.current = false;
          }

          // Reset form
          setNewPlanData({stt: '', jobContent: '', unit: 'bộ', contractVolume: 1, techSpecModel: '', techSpecOrigin: '', progressStatus: 'Chưa thi công', orderedVolume: 0, orderedStatus: 'Chưa đặt hàng', expectedDate: '', issueContent: '', docCo: false, docCq: false, docFireInspection: false, dispatchToSite: false, notes: '', isContractor: true});

          setIsNewPlanOpen(false);
          setParentPlanIdForNew(null);
          setSectionPlanIdForNew(null);
          setIsCreatingSectionHeader(false);
          triggerToast('Đã thêm Hạng mục thành công!', 'success');
        }} className="space-y-3.5 text-xs">

          {/* Banner chế độ hiện tại */}
          {isCreatingSectionHeader ? (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
              <span className="material-symbols-outlined text-base text-primary">folder_open</span>
              <span className="font-bold text-primary">Chế độ: Thêm Đầu mục lớn (nhóm cha)</span>
            </div>
          ) : parentPlanIdForNew ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <span className="material-symbols-outlined text-base text-emerald-600">subdirectory_arrow_right</span>
              <span className="font-bold text-emerald-700">
                Đang thêm mục con của:{' '}
                <span className="text-slate-800">
                  {(() => {
                    const p = currentProjMaterialPlans.find(x => x.id === parentPlanIdForNew);
                    return p ? `${p.stt ? p.stt + '. ' : ''}${p.jobContent}` : '—';
                  })()}
                </span>
              </span>
            </div>
          ) : null}

          {!isCreatingSectionHeader && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thuộc Đầu mục cha</label>
                <div className="flex items-center gap-2.5 w-full">
                  <CustomSelect
                    value={sectionPlanIdForNew || ''}
                    onChange={(e) => {
                      setSectionPlanIdForNew(e.target.value || null);
                      setParentPlanIdForNew(null);
                    }}
                    required={!isCreatingSectionHeader}
                    className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/70 font-bold text-primary truncate"
                  >
                    <option value="" disabled>-- Chọn Đầu mục cha --</option>
                    {currentProjMaterialPlans.filter(p => isSectionMarker(p.stt, p.notes)).map(sec => (
                      <option key={sec.id} value={sec.id} title={sec.jobContent}>
                        {sec.stt ? `${sec.stt}. ` : ''}{sec.jobContent}
                      </option>
                    ))}
                  </CustomSelect>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingSectionHeader(true); setSectionPlanIdForNew(null); setParentPlanIdForNew(null); setNewPlanData(prev => ({ ...prev, stt: '' })); }}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-blue-300 bg-blue-50 text-primary rounded-md text-sm font-bold hover:bg-blue-100 transition-all"
                    title="Tạo Đầu mục lớn mới"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thuộc Hạng mục cha (tuỳ chọn)</label>
                <CustomSelect
                  value={parentPlanIdForNew || ''}
                  onChange={(e) => setParentPlanIdForNew(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold truncate"
                  disabled={!sectionPlanIdForNew}
                >
                  <option value="">-- Không có --</option>
                  {sectionPlanIdForNew && currentProjMaterialPlans
                    .filter(p => p.parentId === sectionPlanIdForNew)
                    .map(t => (
                      <option key={t.id} value={t.id} title={t.jobContent}>
                        {t.stt ? `${t.stt}. ` : ''}{t.jobContent}
                      </option>
                    ))}
                </CustomSelect>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                STT
              </label>
              <input
                type="text"
                required
                placeholder="Nhập STT"
                value={newPlanData.stt || ''}
                onChange={(e) => setNewPlanData({...newPlanData, stt: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary focus:outline-none font-mono"
              />
            </div>
            <div className="col-span-3">
              <label className="block font-bold text-slate-700 mb-1">
                {isCreatingSectionHeader ? 'Tên Đầu mục lớn *' : 'Tên vật tư / hạng mục *'}
              </label>
              <input
                type="text"
                required
                placeholder={isCreatingSectionHeader ? 'VD: HỆ THỐNG ĐIỆN CHIẾU SÁNG' : 'VD: Máy bơm điện Q=54m3/h; H=30mH2O'}
                value={newPlanData.jobContent}
                onChange={(e) => setNewPlanData({...newPlanData, jobContent: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold bg-white focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          {!isCreatingSectionHeader && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Đơn vị tính</label><input type="text" value={newPlanData.unit} onChange={(e) => setNewPlanData({...newPlanData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Khối lượng HĐ</label><input type="number" step="any" value={newPlanData.contractVolume} onChange={(e) => setNewPlanData({...newPlanData, contractVolume: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Mã hiệu / Quy cách</label><input type="text" value={newPlanData.techSpecModel} onChange={(e) => setNewPlanData({...newPlanData, techSpecModel: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Nguồn sản xuất / Xuất xứ</label><input type="text" value={newPlanData.techSpecOrigin} onChange={(e) => setNewPlanData({...newPlanData, techSpecOrigin: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Tiến độ thi công</label>
                  <CustomSelect value={newPlanData.progressStatus} onChange={(e) => setNewPlanData({...newPlanData, progressStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa thi công">Chưa thi công</option>
                    <option value="Đang thi công">Đang thi công</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="block font-bold mb-1">Trạng thái đặt hàng</label>
                  <CustomSelect value={newPlanData.orderedStatus} onChange={(e) => setNewPlanData({...newPlanData, orderedStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                    <option value="Đã đặt hàng">Đã đặt hàng</option>
                    <option value="Đã nhận đủ">Đã nhận đủ</option>
                  </CustomSelect>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Ngày cấp hàng dự kiến</label>
                <input type="date" value={newPlanData.expectedDate || ''} onChange={(e) => setNewPlanData({...newPlanData, expectedDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
              </div>
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-2 rounded-lg border">
                <div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.docCo} onChange={(e) => setNewPlanData({...newPlanData, docCo: e.target.checked})} /> <span className="font-bold">Chứng từ CO</span></div>
                <div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.docStamp} onChange={(e) => setNewPlanData({...newPlanData, docStamp: e.target.checked})} /> <span className="font-bold">Tem KĐ</span></div>
                <div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.docCq} onChange={(e) => setNewPlanData({...newPlanData, docCq: e.target.checked})} /> <span className="font-bold">Chứng từ CQ</span></div>
                <div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.dispatchToSite} onChange={(e) => setNewPlanData({...newPlanData, dispatchToSite: e.target.checked})} /> <span className="font-bold">Đã gửi tới CT</span></div>
              </div>
              {/* Nhà thầu cung cấp */}
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <input
                  type="checkbox"
                  id="isContractorCheck"
                  checked={!!newPlanData.isContractor}
                  onChange={(e) => setNewPlanData({...newPlanData, isContractor: e.target.checked})}
                  className="w-4 h-4 accent-amber-500"
                />
                <label htmlFor="isContractorCheck" className="font-bold text-amber-700 cursor-pointer select-none flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">handshake</span>
                  Nhà thầu cung cấp — tự động đồng bộ sang tab Mua hàng
                </label>
              </div>
            </>
          )}
          
          {isCreatingSectionHeader && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
              <input
                type="checkbox"
                id="isContractorCheckHeader"
                checked={!!newPlanData.isContractor}
                onChange={(e) => setNewPlanData({...newPlanData, isContractor: e.target.checked})}
                className="w-4 h-4 accent-amber-500"
              />
              <label htmlFor="isContractorCheckHeader" className="font-bold text-amber-700 cursor-pointer select-none flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[16px] text-amber-500">handshake</span>
                Tự động đồng bộ Đầu mục này sang tab Mua hàng
              </label>
            </div>
          )}

          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newPlanData.notes} onChange={(e) => setNewPlanData({...newPlanData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setIsNewPlanOpen(false); setParentPlanIdForNew(null); setIsCreatingSectionHeader(false); setNewPlanData({stt: '', jobContent: '', unit: 'bộ', contractVolume: 1, techSpecModel: '', techSpecOrigin: '', progressStatus: 'Chưa thi công', orderedVolume: 0, orderedStatus: 'Chưa đặt hàng', expectedDate: '', issueContent: '', docCo: false, docCq: false, docFireInspection: false, dispatchToSite: false, notes: '', isContractor: true}); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">{isCreatingSectionHeader ? 'Lưu Đầu Mục' : 'Thêm Hạng Mục'}</button></div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      {(() => {
        const isParent = editingPlan && (editingPlan.notes?.toLowerCase().includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test((editingPlan.stt || '').trim()));
        return (
          <Modal isOpen={!!editingPlan} onClose={() => { setEditingPlan(null); setIsCreatingSectionHeader(false); }} title={isParent ? "Chỉnh sửa Đầu mục cha" : "Cập nhật Kế hoạch Vật tư"}>
            {editingPlan && (
          <form onSubmit={(e) => {
            e.preventDefault();
            updateMaterialPlan(editingPlan.id, editingPlan);
            const isContractor = isEffectiveContractorPlan(editingPlan, currentProjMaterialPlans);
            const key = normalizePlanKey(editingPlan.stt, editingPlan.jobContent, editingPlan.parentId);
            const matchingPurchasing = purchasingPlans.find(p =>
              p.projectCode === editingPlan.projectCode &&
              (p.materialPlanId === editingPlan.id || normalizePlanKey(p.stt, p.content, p.parentId) === key)
            );

            if (isContractor) {
              if (matchingPurchasing) {
                updatePurchasingPlan(matchingPurchasing.id, {
                  stt: editingPlan.stt,
                  content: editingPlan.jobContent,
                  unit: editingPlan.unit,
                  volumeContract: editingPlan.contractVolume || matchingPurchasing.volumeContract,
                  materialPlanId: editingPlan.id,
                });
              } else {
                addPurchasingPlan({
                  projectCode: editingPlan.projectCode,
                  materialPlanId: editingPlan.id,
                  stt: editingPlan.stt,
                  content: editingPlan.jobContent,
                  unit: editingPlan.unit || '',
                  volumeContract: editingPlan.contractVolume || 1,
                  volumeOrder: 0,
                  unitPrice: 0,
                  vatRate: 0,
                  vatAmount: 0,
                  totalAmount: 0,
                  prepayPercent: 0,
                  prepayAmount: 0,
                  remainingAmount: 0,
                  orderStatus: 'Chưa đặt hàng',
                  contractStatus: 'Đã có phụ lục',
                  invoiceStatus: 'Chưa xuất',
                  notes: editingPlan.notes || '',
                  parentId: editingPlan.parentId || undefined
                });
              }
            } else {
              if (matchingPurchasing) {
                deletePurchasingPlan(matchingPurchasing.id);
              }
            }
            setEditingPlan(null);
            triggerToast('Đã cập nhật Kế hoạch Vật tư thành công!', 'success');
          }} className="space-y-3 text-xs">
            {isParent ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block font-bold mb-1">STT / Mã</label><input type="text" value={editingPlan.stt} onChange={(e) => setEditingPlan({...editingPlan, stt: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white font-mono font-bold focus:ring-2 focus:ring-primary focus:outline-none" /></div>
                  <div className="col-span-2"><label className="block font-bold mb-1">Dự án</label><input type="text" disabled value={projects.find(p => p.code === selectedProject)?.name || editingPlan.projectCode} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-500 cursor-not-allowed" /></div>
                </div>
                <div><label className="block font-bold text-slate-700 mb-1">Nội dung Công việc *</label><textarea required rows={4} value={editingPlan.jobContent} onChange={(e) => setEditingPlan({...editingPlan, jobContent: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold" /></div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block font-bold mb-1">STT</label><input type="text" value={editingPlan.stt} onChange={(e) => setEditingPlan({...editingPlan, stt: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div className="col-span-2"><label className="block font-bold mb-1">Tên vật tư *</label><textarea required rows={3} value={editingPlan.jobContent} onChange={(e) => setEditingPlan({...editingPlan, jobContent: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingPlan.unit} onChange={(e) => setEditingPlan({...editingPlan, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1">Khối lượng HĐ</label><input type="number" step="any" value={editingPlan.contractVolume} onChange={(e) => setEditingPlan({...editingPlan, contractVolume: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block font-bold mb-1">Mã hiệu / Quy cách</label><input type="text" value={editingPlan.techSpecModel} onChange={(e) => setEditingPlan({...editingPlan, techSpecModel: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1">Nguồn gốc</label><input type="text" value={editingPlan.techSpecOrigin} onChange={(e) => setEditingPlan({...editingPlan, techSpecOrigin: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Tiến độ</label>
                    <CustomSelect value={editingPlan.progressStatus} onChange={(e) => setEditingPlan({...editingPlan, progressStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                      <option value="Chưa thi công">Chưa thi công</option>
                      <option value="Đang thi công">Đang thi công</option>
                      <option value="Đã hoàn thành">Đã hoàn thành</option>
                    </CustomSelect>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Trạng thái đặt</label>
                    <CustomSelect value={editingPlan.orderedStatus} onChange={(e) => setEditingPlan({...editingPlan, orderedStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                      <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                      <option value="Đã đặt hàng">Đã đặt hàng</option>
                      <option value="Đã nhận đủ">Đã nhận đủ</option>
                    </CustomSelect>
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">Ngày cấp hàng dự kiến</label>
                  <input type="date" value={editingPlan.expectedDate || ''} onChange={(e) => setEditingPlan({...editingPlan, expectedDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
                </div>
                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-2 rounded-lg border">
                  <div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.docCo} onChange={(e) => setEditingPlan({...editingPlan, docCo: e.target.checked})} /> <span className="font-bold">CO</span></div>
                  <div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.docStamp} onChange={(e) => setEditingPlan({...editingPlan, docStamp: e.target.checked})} /> <span className="font-bold">Tem KĐ</span></div>
                  <div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.docCq} onChange={(e) => setEditingPlan({...editingPlan, docCq: e.target.checked})} /> <span className="font-bold">CQ</span></div>
                  <div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.dispatchToSite} onChange={(e) => setEditingPlan({...editingPlan, dispatchToSite: e.target.checked})} /> <span className="font-bold">Đã gửi CT</span></div>
                </div>
                {/* Nhà thầu */}
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <input
                    type="checkbox"
                    id="editIsContractorCheck"
                    checked={isEffectiveContractorPlan(editingPlan, currentProjMaterialPlans)}
                    onChange={(e) => setEditingPlan({...editingPlan, supplyScope: e.target.checked ? 'contractor' : 'owner'})}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <label htmlFor="editIsContractorCheck" className="font-bold text-amber-700 cursor-pointer select-none flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">handshake</span>
                    Nhà thầu cung cấp — hiển thị trong tab Mua hàng
                  </label>
                </div>
                <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingPlan.notes} onChange={(e) => setEditingPlan({...editingPlan, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </>
            )}
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setEditingPlan(null); setIsCreatingSectionHeader(false); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
          </form>
        )}
      </Modal>
        );
      })()}

      {/* 2. Modal Mua Sắm Hàng Hóa */}
      <Modal isOpen={isNewPurchasingOpen} onClose={() => { setIsNewPurchasingOpen(false); setParentPurchasingIdForNew(null); setSectionPurchasingIdForNew(null); setIsCreatingSectionHeader(false); setNewPurchasingData({stt: '', content: '', unit: 'bộ', volumeContract: 0, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''}); }} title={isCreatingSectionHeader ? 'Thêm Đầu mục lớn — Mua sắm Hàng hóa' : 'Thêm Hạng mục — Mua sắm Hàng hóa'} size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const parentId = isCreatingSectionHeader ? null : (parentPurchasingIdForNew || sectionPurchasingIdForNew || null);
          const contractVol = Number(newPurchasingData.volumeContract || 0);
          const orderVol = Number(newPurchasingData.volumeOrder || 0);
          const unitPrice = Number(newPurchasingData.unitPrice || 0);
          const vat = Number(newPurchasingData.vatRate || 10);
          const prepayPct = Number(newPurchasingData.prepayPercent || 0);
          
          const effectiveVol = orderVol > 0 ? orderVol : contractVol;
          const rawTotal = effectiveVol * unitPrice;
          const taxAmt = rawTotal * (vat / 100);
          const totalAmt = rawTotal + taxAmt;
          const prepayAmt = totalAmt * prepayPct;
          const remainingAmt = totalAmt - prepayAmt;

          // Auto STT: La Mã cho đầu mục lớn, số thứ tự cho hạng mục nhỏ
          const autoStt = newPurchasingData.stt || '';

          // Đồng bộ ngược lại sang tab Kế hoạch Vật tư (luôn là nhà thầu)
          let materialParentId = undefined;
          if (parentId) {
            const parentPurchasing = currentProjPurchasing.find(p => p.id === parentId);
            if (parentPurchasing) {
              const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
              const matchingMaterial = currentProjMaterialPlans.find(
                p => norm(p.stt) === norm(parentPurchasing.stt) && norm(p.jobContent) === norm(parentPurchasing.content)
              );
              if (matchingMaterial) materialParentId = matchingMaterial.id;
            }
          }

          // Determine scope
          let resolvedSupplyScope = 'unknown';
          let currentObj = parentId ? currentProjPurchasing.find(p => p.id === parentId) : null;
          let tempObj = currentObj;
          let safeCount2 = 0;
          while (tempObj && safeCount2 < 50) {
            if (String(tempObj.notes || '').toLowerCase().includes('[contractor]')) {
              resolvedSupplyScope = 'contractor';
              break;
            } else if (String(tempObj.notes || '').toLowerCase().includes('[owner]')) {
              resolvedSupplyScope = 'owner';
              break;
            }
            if (tempObj.parentId) {
              tempObj = currentProjPurchasing.find(p => p.id === tempObj!.parentId);
            } else {
              break;
            }
            safeCount2++;
          }
          const isContractor = resolvedSupplyScope === 'contractor' || (resolvedSupplyScope === 'unknown');

          setIsSubmittingPlan(true);
          isSubmittingPlanRef.current = true;
          try {
            await addMaterialPlan({
              projectCode: selectedProject,
            stt: autoStt,
            jobContent: newPurchasingData.content || '',
            unit: newPurchasingData.unit || 'bộ',
            contractVolume: contractVol,
            techSpecModel: '',
            techSpecOrigin: '',
            progressStatus: 'Chưa thi công',
            orderedVolume: orderVol,
            orderedStatus: newPurchasingData.orderStatus || 'Chưa đặt hàng',
            expectedDate: '',
            issueContent: '',
            docCo: false,
            docCq: false,
            docFireInspection: false,
            dispatchToSite: false,
            supplyScope: 'contractor',
            notes: isCreatingSectionHeader && !parentId ? '[section] | [contractor]' : `[contractor] ${newPurchasingData.notes || ''}`.trim(),
            parentId: materialParentId || undefined
          });

          // Đồng bộ sang tab Quản lý Tiến độ (TaskManagement)
          const projName = projects.find(p => p.code === selectedProject)?.name || selectedProject;
          const currentSectionName = (() => {
            if (isCreatingSectionHeader) return newPurchasingData.content || '';
            if (parentId) {
              let currentObj = currentProjPurchasing.find(p => p.id === parentId);
              let safeCount = 0;
              while (currentObj && !isSectionMarker(currentObj.stt, currentObj.notes) && currentObj.parentId && safeCount < 50) {
                currentObj = currentProjPurchasing.find(p => p.id === currentObj!.parentId);
                safeCount++;
              }
              return currentObj?.content || '';
            }
            const sectionId = sectionPurchasingIdForNew;
            if (sectionId) {
              const sec = currentProjPurchasing.find(p => p.id === sectionId);
              return sec?.content || '';
            }
            return '';
          })();
          let taskParentId = undefined;
          if (parentId) {
            const parentPurchasing = currentProjPurchasing.find(p => p.id === parentId);
            if (parentPurchasing) {
              const isParentSec = isSectionMarker(parentPurchasing.stt, '');
              const pTask = tasks.find(t => 
                t.projectCode === selectedProject && 
                t.name === parentPurchasing.content && 
                (isParentSec ? t.isSectionHeader : (!t.isSectionHeader && t.sectionName === currentSectionName))
              ) || tasks.find(t => t.projectCode === selectedProject && t.name === parentPurchasing.content);
              
              if (pTask) {
                taskParentId = pTask.id;
              }
            }
          }

          // Await so that the `isSubmittingPlanRef` stays true until both are done
          await addTask({
            stt: autoStt,
            code: '',
            name: newPurchasingData.content || '',
            projectCode: selectedProject,
            projectName: projName,
            volume: contractVol,
            unit: newPurchasingData.unit || 'bộ',
            progress: 0,
            status: 'Chưa làm',
            purchaseStatus: newPurchasingData.orderStatus || 'Chưa đặt hàng',
            constrStatus: 'Chưa thi công',
            isDone: false,
            isSectionHeader: isCreatingSectionHeader,
            sectionName: currentSectionName,
            notes: `[contractor] ${newPurchasingData.notes || ''}`.trim(),
            parentId: taskParentId
          });

          await addPurchasingPlan({
            projectCode: selectedProject,
            stt: autoStt,
            content: newPurchasingData.content || '',
            unit: newPurchasingData.unit || 'bộ',
            volumeContract: contractVol,
            volumeOrder: orderVol,
            unitPrice: unitPrice,
            vatRate: vat,
            vatAmount: taxAmt,
            totalAmount: totalAmt,
            prepayPercent: prepayPct,
            prepayAmount: prepayAmt,
            remainingAmount: remainingAmt,
            orderStatus: newPurchasingData.orderStatus || 'Chưa đặt hàng',
            contractStatus: newPurchasingData.contractStatus || 'Chưa ký',
            ...(newPurchasingData.paymentDate ? { paymentDate: newPurchasingData.paymentDate } : {}),
            invoiceStatus: newPurchasingData.invoiceStatus || 'Chưa xuất',
            notes: isCreatingSectionHeader && !parentId ? '[section]' : newPurchasingData.notes || '',
            parentId: parentId || undefined
          });

          } finally {
            setIsSubmittingPlan(false);
            isSubmittingPlanRef.current = false;
          }

          // Reset form
          setNewPurchasingData({stt: '', content: '', unit: 'bộ', volumeContract: 1, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''});

          setIsNewPurchasingOpen(false);
          setParentPurchasingIdForNew(null);
          setSectionPurchasingIdForNew(null);
          setIsCreatingSectionHeader(false);
          triggerToast('Đã thêm Hạng mục thành công!', 'success');
        }} className="space-y-3.5 text-xs">

          {/* Banner chế độ hiện tại */}
          {isCreatingSectionHeader ? (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
              <span className="material-symbols-outlined text-base text-primary">folder_open</span>
              <span className="font-bold text-primary">Chế độ: Thêm Đầu mục lớn (nhóm cha)</span>
            </div>
          ) : parentPurchasingIdForNew ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <span className="material-symbols-outlined text-base text-emerald-600">subdirectory_arrow_right</span>
              <span className="font-bold text-emerald-700">
                Đang thêm mục con của:{' '}
                <span className="text-slate-800">
                  {(() => {
                    const p = currentProjPurchasing.find(x => x.id === parentPurchasingIdForNew);
                    return p ? `${p.stt ? p.stt + '. ' : ''}${p.content}` : '—';
                  })()}
                </span>
              </span>
            </div>
          ) : null}

          {!isCreatingSectionHeader && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thuộc Đầu mục cha</label>
                <div className="flex items-center gap-2.5 w-full">
                  <CustomSelect
                    value={sectionPurchasingIdForNew || ''}
                    onChange={(e) => {
                      setSectionPurchasingIdForNew(e.target.value || null);
                      setParentPurchasingIdForNew(null);
                    }}
                    required={!isCreatingSectionHeader}
                    className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/70 font-bold text-primary truncate"
                  >
                    <option value="" disabled>-- Chọn Đầu mục cha --</option>
                    {currentProjPurchasing.filter(p => isSectionMarker(p.stt, p.notes)).map(sec => (
                      <option key={sec.id} value={sec.id} title={sec.content}>
                        {sec.stt ? `${sec.stt}. ` : ''}{sec.content}
                      </option>
                    ))}
                  </CustomSelect>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingSectionHeader(true); setSectionPurchasingIdForNew(null); setParentPurchasingIdForNew(null); setNewPurchasingData(prev => ({ ...prev, stt: '' })); }}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-blue-300 bg-blue-50 text-primary rounded-md text-sm font-bold hover:bg-blue-100 transition-all"
                    title="Tạo Đầu mục lớn mới"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thuộc Hạng mục cha (tuỳ chọn)</label>
                <CustomSelect
                  value={parentPurchasingIdForNew || ''}
                  onChange={(e) => setParentPurchasingIdForNew(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold truncate"
                  disabled={!sectionPurchasingIdForNew}
                >
                  <option value="">-- Không có --</option>
                  {sectionPurchasingIdForNew && currentProjPurchasing
                    .filter(p => p.parentId === sectionPurchasingIdForNew)
                    .map(t => (
                      <option key={t.id} value={t.id} title={t.content}>
                        {t.stt ? `${t.stt}. ` : ''}{t.content}
                      </option>
                    ))}
                </CustomSelect>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                STT
              </label>
              <input
                type="text"
                required
                placeholder="Nhập STT"
                value={newPurchasingData.stt || ''}
                onChange={(e) => setNewPurchasingData({...newPurchasingData, stt: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary focus:outline-none font-mono"
              />
            </div>
            <div className="col-span-3">
              <label className="block font-bold text-slate-700 mb-1">
                {isCreatingSectionHeader ? 'Tên Đầu mục lớn *' : 'Tên Hàng hóa / Hợp đồng *'}
              </label>
              <input
                type="text"
                required
                placeholder={isCreatingSectionHeader ? 'VD: HỆ THỐNG ĐIỆN CHIẾU SÁNG' : 'VD: Cáp điện 3x185mm2, hãng LS'}
                value={newPurchasingData.content}
                onChange={(e) => setNewPurchasingData({...newPurchasingData, content: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold bg-white focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          {!isCreatingSectionHeader && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newPurchasingData.unit} onChange={(e) => setNewPurchasingData({...newPurchasingData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">KL Hợp đồng</label><input type="number" step="any" value={String(newPurchasingData.volumeContract)} onChange={(e) => setNewPurchasingData({...newPurchasingData, volumeContract: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">KL Đơn đặt</label><input type="number" step="any" value={String(newPurchasingData.volumeOrder)} onChange={(e) => setNewPurchasingData({...newPurchasingData, volumeOrder: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" step="any" value={String(newPurchasingData.unitPrice)} onChange={(e) => setNewPurchasingData({...newPurchasingData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
                <div><label className="block font-bold mb-1">Thuế suất VAT (%)</label><input type="number" step="any" value={String(newPurchasingData.vatRate)} onChange={(e) => setNewPurchasingData({...newPurchasingData, vatRate: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Tỷ lệ Tạm ứng (%)</label><input type="number" step="any" min="0" max="100" value={String(Math.round((newPurchasingData.prepayPercent || 0) * 100))} onChange={(e) => setNewPurchasingData({...newPurchasingData, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </div>
              <div>
                <label className="block font-bold mb-1">Ngày dự kiến có hàng</label>
                <input type="date" value={newPurchasingData.paymentDate || ''} onChange={(e) => setNewPurchasingData({...newPurchasingData, paymentDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
              </div>
              {(() => {
                const liveContractVol = Number(newPurchasingData.volumeContract || 0);
                const liveOrderVol = Number(newPurchasingData.volumeOrder || 0);
                const liveUnitPrice = Number(newPurchasingData.unitPrice || 0);
                const liveVatRate = Number(newPurchasingData.vatRate || 0);
                const livePrepayPercent = Number(newPurchasingData.prepayPercent || 0);

                const liveEffectiveVol = liveOrderVol > 0 ? liveOrderVol : liveContractVol;
                const liveRawTotal = liveEffectiveVol * liveUnitPrice;
                const liveVatAmount = liveRawTotal * (liveVatRate / 100);
                const liveTotalAmount = liveRawTotal + liveVatAmount;
                const livePrepayAmount = liveTotalAmount * livePrepayPercent;
                const liveRemainingAmount = liveTotalAmount - livePrepayAmount;

                return (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600 mt-2">
                    <div className="flex justify-between">
                      <span>Thành tiền (chưa VAT):</span>
                      <span className="font-bold text-slate-800">{liveRawTotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuế VAT ({liveVatRate}%):</span>
                      <span className="font-bold text-slate-800">{liveVatAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-sans text-[13px] font-bold text-slate-900">
                      <span>Tổng tiền (có VAT):</span>
                      <span className="text-primary">{liveTotalAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiền Tạm ứng ({Math.round(livePrepayPercent * 100)}%):</span>
                      <span className="font-bold text-rose-600">{livePrepayAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-sans text-[13px] font-bold text-slate-900">
                      <span>Còn lại phải trả:</span>
                      <span className="text-emerald-600">{liveRemainingAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">TT Đặt hàng</label>
                  <CustomSelect value={newPurchasingData.orderStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, orderStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                    <option value="Đã đặt hàng">Đã đặt hàng</option>
                    <option value="Đang giao hàng">Đang giao hàng</option>
                    <option value="Đã nhận hàng">Đã nhận hàng</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="block font-bold mb-1">Hợp đồng</label>
                  <CustomSelect value={newPurchasingData.contractStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, contractStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa ký">Chưa ký</option>
                    <option value="Đang trình duyệt">Đang trình duyệt</option>
                    <option value="Đã ký">Đã ký</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="block font-bold mb-1">Hóa đơn</label>
                  <CustomSelect value={newPurchasingData.invoiceStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, invoiceStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa xuất">Chưa xuất</option>
                    <option value="Đang kiểm tra">Đang kiểm tra</option>
                    <option value="Đã xuất">Đã xuất</option>
                  </CustomSelect>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block font-bold mb-1">Ghi chú</label>
            <input type="text" placeholder="Nhập ghi chú (nếu có)" value={newPurchasingData.notes} onChange={(e) => setNewPurchasingData({...newPurchasingData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-xs" />
          </div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setIsNewPurchasingOpen(false); setParentPurchasingIdForNew(null); setIsCreatingSectionHeader(false); setNewPurchasingData({stt: '', content: '', unit: 'bộ', volumeContract: 0, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''}); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">{isCreatingSectionHeader ? 'Lưu Đầu Mục' : 'Thêm Hạng Mục'}</button></div>
        </form>
      </Modal>

      {/* Edit Purchasing Modal */}
      <Modal isOpen={!!editingPurchasing} onClose={() => setEditingPurchasing(null)} title="Cập nhật Hợp đồng Mua sắm">
        {editingPurchasing && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const contractVol = Number(editingPurchasing.volumeContract || 1);
            const unitPrice = Number(editingPurchasing.unitPrice || 0);
            const vat = Number(editingPurchasing.vatRate || 10);
            const prepayPct = Number(editingPurchasing.prepayPercent || 0);

            const rawTotal = contractVol * unitPrice;
            const taxAmt = rawTotal * (vat / 100);
            const totalAmt = rawTotal + taxAmt;
            const prepayAmt = totalAmt * prepayPct;
            const remainingAmt = totalAmt - prepayAmt;

            handleUpdatePurchasingPlanSync(editingPurchasing.id, {
              ...editingPurchasing,
              vatAmount: taxAmt,
              totalAmount: totalAmt,
              prepayAmount: prepayAmt,
              remainingAmount: remainingAmt
            });
            setEditingPurchasing(null);
            triggerToast('Đã cập nhật Mua sắm thành công!', 'success');
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">STT</label><input type="text" value={editingPurchasing.stt} onChange={(e) => setEditingPurchasing({...editingPurchasing, stt: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div className="col-span-2"><label className="block font-bold mb-1">Hạng mục mua sắm *</label><input type="text" required value={editingPurchasing.content} onChange={(e) => setEditingPurchasing({...editingPurchasing, content: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingPurchasing.unit} onChange={(e) => setEditingPurchasing({...editingPurchasing, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">KL Hợp đồng</label><input type="number" step="any" value={String(editingPurchasing.volumeContract)} onChange={(e) => setEditingPurchasing({...editingPurchasing, volumeContract: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">KL Đơn đặt</label><input type="number" step="any" value={String(editingPurchasing.volumeOrder)} onChange={(e) => setEditingPurchasing({...editingPurchasing, volumeOrder: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" step="any" value={String(editingPurchasing.unitPrice)} onChange={(e) => setEditingPurchasing({...editingPurchasing, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Thuế suất VAT (%)</label><input type="number" step="any" value={String(editingPurchasing.vatRate)} onChange={(e) => setEditingPurchasing({...editingPurchasing, vatRate: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Tỷ lệ Tạm ứng (%)</label><input type="number" step="any" min="0" max="100" value={String(Math.round((editingPurchasing.prepayPercent || 0) * 100))} onChange={(e) => setEditingPurchasing({...editingPurchasing, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ngày dự kiến có hàng</label>
              <input type="date" value={editingPurchasing.paymentDate || ''} onChange={(e) => setEditingPurchasing({...editingPurchasing, paymentDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
            </div>
            {(() => {
              const editContractVol = Number(editingPurchasing.volumeContract || 0);
              const editOrderVol = Number(editingPurchasing.volumeOrder || 0);
              const editUnitPrice = Number(editingPurchasing.unitPrice || 0);
              const editVatRate = Number(editingPurchasing.vatRate || 0);
              const editPrepayPercent = Number(editingPurchasing.prepayPercent || 0);

              const editEffectiveVol = editOrderVol > 0 ? editOrderVol : editContractVol;
              const editRawTotal = editEffectiveVol * editUnitPrice;
              const editVatAmount = editRawTotal * (editVatRate / 100);
              const editTotalAmount = editRawTotal + editVatAmount;
              const editPrepayAmount = editTotalAmount * editPrepayPercent;
              const editRemainingAmount = editTotalAmount - editPrepayAmount;

              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600 mt-2">
                  <div className="flex justify-between">
                    <span>Thành tiền (chưa VAT):</span>
                    <span className="font-bold text-slate-800">{editRawTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế VAT ({editVatRate}%):</span>
                    <span className="font-bold text-slate-800">{editVatAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-sans text-[13px] font-bold text-slate-900">
                    <span>Tổng tiền (có VAT):</span>
                    <span className="text-primary">{editTotalAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền Tạm ứng ({Math.round(editPrepayPercent * 100)}%):</span>
                    <span className="font-bold text-rose-600">{editPrepayAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-sans text-[13px] font-bold text-slate-900">
                    <span>Còn lại phải trả:</span>
                    <span className="text-emerald-600">{editRemainingAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">TT Đặt hàng</label>
                <CustomSelect value={editingPurchasing.orderStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, orderStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  <option value="Đã đặt hàng">Đã đặt hàng</option>
                  <option value="Đang giao hàng">Đang giao hàng</option>
                  <option value="Đã nhận hàng">Đã nhận hàng</option>
                </CustomSelect>
              </div>
              <div>
                <label className="block font-bold mb-1">Hợp đồng</label>
                <CustomSelect value={editingPurchasing.contractStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, contractStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa ký">Chưa ký</option>
                  <option value="Đang trình duyệt">Đang trình duyệt</option>
                  <option value="Đã ký">Đã ký</option>
                </CustomSelect>
              </div>
              <div>
                <label className="block font-bold mb-1">Hóa đơn</label>
                <CustomSelect value={editingPurchasing.invoiceStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, invoiceStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa xuất">Chưa xuất</option>
                  <option value="Đang kiểm tra">Đang kiểm tra</option>
                  <option value="Đã xuất">Đã xuất</option>
                </CustomSelect>
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ghi chú</label>
              <input type="text" placeholder="Nhập ghi chú (nếu có)" value={editingPurchasing.notes} onChange={(e) => setEditingPurchasing({...editingPurchasing, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-xs" />
            </div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingPurchasing(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
          </form>
        )}
      </Modal>

      {/* 3. Modal Chi Phí Công Trình */}
      <Modal isOpen={isNewExpenseOpen} onClose={() => setIsNewExpenseOpen(false)} title="Tạo Phiếu Chi Công trình mới">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const qty = Number(newExpenseData.quantity || 1);
          const price = Number(newExpenseData.unitPrice || 0);
          const vat = Number((newExpenseData as any).vatAmount || 0);
          const total = qty * price + vat;

          try {
            await addExpense({
              projectCode: selectedProject,
              stt: newExpenseData.stt || String(currentProjExpenses.length + 1),
              date: newExpenseData.date || new Date().toISOString().split('T')[0],
              content: newExpenseData.content || 'Vật tư/ thiết bị',
              description: newExpenseData.description || '',
              spenderName: newExpenseData.spenderName || '',
              unit: newExpenseData.unit || 'cái',
              quantity: qty,
              unitPrice: price,
              taxAmount: vat,
              totalAmount: total,
              incomeAmount: Number((newExpenseData as any).incomeAmount || 0),
              balanceFund: Number((newExpenseData as any).balanceFund || 0),
              notes: newExpenseData.notes || '',
              invoiceUrl: newExpenseData.invoiceUrl || ''
            });

            if (additionalItems.length > 0) {
              await Promise.all(additionalItems.map((item, idx) => {
                const itemQty = Number(item.quantity || 1);
                const itemPrice = Number(item.unitPrice || 0);
                const itemVat = Number(item.taxAmount || 0);
                return addExpense({
                  projectCode: selectedProject,
                  stt: String(currentProjExpenses.length + 2 + idx),
                  date: newExpenseData.date || new Date().toISOString().split('T')[0],
                  content: newExpenseData.content || 'Vật tư/ thiết bị',
                  description: item.description || '',
                  spenderName: newExpenseData.spenderName || '',
                  unit: item.unit || 'cái',
                  quantity: itemQty,
                  unitPrice: itemPrice,
                  taxAmount: itemVat,
                  totalAmount: itemQty * itemPrice + itemVat,
                  incomeAmount: Number(item.incomeAmount || 0),
                  balanceFund: 0,
                  notes: newExpenseData.notes || '',
                  invoiceUrl: newExpenseData.invoiceUrl || ''
                });
              }));
            }

            setIsNewExpenseOpen(false);
            setNewExpenseData({stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', spenderName: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''});
            setAdditionalItems([]);
            triggerToast('Đã thêm Chi phí thành công!', 'success');
          } catch (err: any) {
            triggerToast(err.message || 'Lỗi khi thêm chi phí!', 'warning');
          }
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={newExpenseData.date} onChange={(e) => setNewExpenseData({...newExpenseData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1">Người phụ trách / Nguồn quỹ</label>
              <CustomSelect value={newExpenseData.spenderName || ''} onChange={(e) => setNewExpenseData({...newExpenseData, spenderName: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
  {expenseSpenderNames.map((name, i) => (
    <option key={i} value={name}>{name}</option>
  ))}
</CustomSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Loại nội dung</label>
              <CustomSelect value={newExpenseData.content} onChange={(e) => setNewExpenseData({...newExpenseData, content: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
  {expenseContentTypes.map((type, i) => (
    <option key={i} value={type}>{type}</option>
  ))}
</CustomSelect>
            </div>
            <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required placeholder="VD: Mua keo non, tắc kê đan..." value={newExpenseData.description} onChange={(e) => setNewExpenseData({...newExpenseData, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newExpenseData.unit} onChange={(e) => setNewExpenseData({...newExpenseData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Số lượng</label><input type="number" step="any" value={String(newExpenseData.quantity)} onChange={(e) => setNewExpenseData({...newExpenseData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" step="any" value={String(newExpenseData.unitPrice)} onChange={(e) => setNewExpenseData({...newExpenseData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          
          {additionalItems.map((item, index) => (
            <div key={index} className="pt-3 mt-3 border-t border-slate-200 relative">
              <button type="button" onClick={() => setAdditionalItems(prev => prev.filter((_, i) => i !== index))} className="absolute right-0 top-3 text-rose-500 hover:text-rose-700 p-1">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
              <div className="grid grid-cols-2 gap-3 pr-8">
                <div><label className="block font-bold mb-1 text-slate-500">Diễn giải/ Chi tiết *</label><input type="text" required value={item.description} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].description = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block font-bold mb-1 text-slate-500">ĐVT</label><input type="text" value={item.unit} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unit = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Số lượng</label><input type="number" step="any" value={String(item.quantity)} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].quantity = Number(e.target.value); setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Đơn giá</label><input type="number" step="any" value={String(item.unitPrice)} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unitPrice = Number(e.target.value); setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <button type="button" onClick={() => setAdditionalItems([...additionalItems, { description: '', unit: 'cái', quantity: 1, unitPrice: 0, taxAmount: 0, incomeAmount: 0 }])} className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
              <span className="material-symbols-outlined text-[16px]">add</span> Thêm thiết bị khác
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" step="any" value={String((newExpenseData as any).vatAmount || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, vatAmount: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" step="any" value={String((newExpenseData as any).incomeAmount || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, incomeAmount: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>

          </div>
          {(() => {
            const liveQty = Number(newExpenseData.quantity || 0);
            const livePrice = Number(newExpenseData.unitPrice || 0);
            const liveVat = Number((newExpenseData as any).vatAmount || 0);
            const liveTotal = liveQty * livePrice + liveVat;
            return (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-[13px] font-bold">
                <span className="text-slate-600">Thành tiền tự động:</span>
                <span className="text-rose-600">{liveTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            );
          })()}
          <div>
            <label className="block font-bold mb-1">Ảnh Hóa đơn / Chứng từ</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg border border-primary/30 hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Chọn ảnh
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setNewExpenseData({...newExpenseData, invoiceUrl: reader.result as string});
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
              {newExpenseData.invoiceUrl && (
                <div className="flex items-center gap-2">
                  <img src={newExpenseData.invoiceUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border" />
                  <button type="button" onClick={() => setNewExpenseData({...newExpenseData, invoiceUrl: ''})} className="text-rose-500 hover:text-rose-700">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newExpenseData.notes} onChange={(e) => setNewExpenseData({...newExpenseData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setIsNewExpenseOpen(false); setAdditionalItems([]); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit"  className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu phiếu chi</button></div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Cập nhật Phiếu Chi Công trình">
        {editingExpense && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const qty = Number(editingExpense.quantity || 1);
            const price = Number(editingExpense.unitPrice || 0);
            const vat = Number(editingExpense.taxAmount || 0);
            const total = qty * price + vat;

            await updateExpense(editingExpense.id, {
              ...editingExpense,
              totalAmount: total
            });
            
            if (additionalItems.length > 0) {
              await Promise.all(additionalItems.map((item, idx) => {
                const itemQty = Number(item.quantity || 1);
                const itemPrice = Number(item.unitPrice || 0);
                const itemVat = Number(item.taxAmount || 0);
                return addExpense({
                  projectCode: selectedProject,
                  stt: String(currentProjExpenses.length + 1 + idx),
                  date: editingExpense.date || new Date().toISOString().split('T')[0],
                  content: editingExpense.content || 'Vật tư/ thiết bị',
                  description: item.description || '',
                  spenderName: editingExpense.spenderName || '',
                  unit: item.unit || 'cái',
                  quantity: itemQty,
                  unitPrice: itemPrice,
                  taxAmount: itemVat,
                  totalAmount: itemQty * itemPrice + itemVat,
                  incomeAmount: Number(item.incomeAmount || 0),
                  balanceFund: 0,
                  notes: editingExpense.notes || '',
                  invoiceUrl: editingExpense.invoiceUrl || ''
                });
              }));
            }

            setEditingExpense(null);
            setAdditionalItems([]);
            triggerToast('Đã cập nhật Chi phí thành công!', 'success');
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={editingExpense.date} onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div>
                <label className="block font-bold mb-1">Người phụ trách / Nguồn quỹ</label>
                <CustomSelect value={editingExpense.spenderName || ''} onChange={(e) => setEditingExpense({...editingExpense, spenderName: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
  {expenseSpenderNames.map((name, i) => (
    <option key={i} value={name}>{name}</option>
  ))}
</CustomSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Loại nội dung</label>
                <CustomSelect value={editingExpense.content} onChange={(e) => setEditingExpense({...editingExpense, content: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
  {expenseContentTypes.map((type, i) => (
    <option key={i} value={type}>{type}</option>
  ))}
</CustomSelect>
              </div>
              <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingExpense.unit} onChange={(e) => setEditingExpense({...editingExpense, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Số lượng</label><input type="number" step="any" value={String(editingExpense.quantity)} onChange={(e) => setEditingExpense({...editingExpense, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" step="any" value={String(editingExpense.unitPrice)} onChange={(e) => setEditingExpense({...editingExpense, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            
          {additionalItems.map((item, index) => (
            <div key={index} className="pt-3 mt-3 border-t border-slate-200 relative">
              <button type="button" onClick={() => setAdditionalItems(prev => prev.filter((_, i) => i !== index))} className="absolute right-0 top-3 text-rose-500 hover:text-rose-700 p-1">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
              <div className="grid grid-cols-2 gap-3 pr-8">
                <div><label className="block font-bold mb-1 text-slate-500">Diễn giải/ Chi tiết *</label><input type="text" required value={item.description} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].description = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block font-bold mb-1 text-slate-500">ĐVT</label><input type="text" value={item.unit} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unit = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Số lượng</label><input type="number" step="any" value={String(item.quantity)} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].quantity = Number(e.target.value); setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Đơn giá</label><input type="number" step="any" value={String(item.unitPrice)} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unitPrice = Number(e.target.value); setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <button type="button" onClick={() => setAdditionalItems([...additionalItems, { description: '', unit: 'cái', quantity: 1, unitPrice: 0, taxAmount: 0, incomeAmount: 0 }])} className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
              <span className="material-symbols-outlined text-[16px]">add</span> Thêm thiết bị khác
            </button>
          </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" step="any" value={String(editingExpense.taxAmount || 0)} onChange={(e) => setEditingExpense({...editingExpense, taxAmount: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" step="any" value={String(editingExpense.incomeAmount || 0)} onChange={(e) => setEditingExpense({...editingExpense, incomeAmount: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>

            </div>
            {(() => {
              const editQty = Number(editingExpense.quantity || 0);
              const editPrice = Number(editingExpense.unitPrice || 0);
              const editVat = Number(editingExpense.taxAmount || 0);
              const editTotal = editQty * editPrice + editVat;
              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-[13px] font-bold">
                  <span className="text-slate-600">Thành tiền tự động:</span>
                  <span className="text-rose-600">{editTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              );
            })()}
            <div>
              <label className="block font-bold mb-1">Ảnh Hóa đơn / Chứng từ</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg border border-primary/30 hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Chọn ảnh
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setEditingExpense({...editingExpense, invoiceUrl: reader.result as string});
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
                {editingExpense.invoiceUrl && (
                  <div className="flex items-center gap-2">
                    <img src={editingExpense.invoiceUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border" />
                    <button type="button" onClick={() => setEditingExpense({...editingExpense, invoiceUrl: ''})} className="text-rose-500 hover:text-rose-700">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingExpense.notes} onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setEditingExpense(null); setAdditionalItems([]); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit"  className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu thay đổi</button></div>
          </form>
        )}
      </Modal>

      {/* 4. Modal Lương Công Nhật */}
      <Modal isOpen={isNewLaborOpen} onClose={() => setIsNewLaborOpen(false)} title="Thêm Phiếu thanh toán Lương Công nhật mới">
        <form onSubmit={(e) => {
          e.preventDefault();
          const qty = Number(newLaborData.quantity || 1);
          const price = Number(newLaborData.unitPrice || 0);
          const total = qty * price;

          addLaborPayroll({
            projectCode: selectedProject,
            stt: newLaborData.stt || String(currentProjLabor.length + 1),
            date: newLaborData.date || new Date().toISOString().split('T')[0],
            content: newLaborData.content || 'TT tiền công',
            description: newLaborData.description || 'Lương thợ điện',
            unit: newLaborData.unit || 'Công',
            quantity: qty,
            unitPrice: price,
            totalAmount: total,
            workerName: (newLaborData as any).workerName || '',
            bankAccount: newLaborData.bankAccount || '',
            bankInfo: newLaborData.bankInfo || '',
            idCardFrontUrl: newLaborData.idCardFrontUrl || '',
            idCardBackUrl: newLaborData.idCardBackUrl || '',
            paymentStatus: newLaborData.paymentStatus || 'Chưa thanh toán',
            notes: newLaborData.notes || ''
          });
          setIsNewLaborOpen(false);
          setNewLaborData({stt: '', date: new Date().toISOString().split('T')[0], content: 'TT tiền công', description: 'Lương thợ điện', unit: 'Công', quantity: 1, unitPrice: 500000, bankAccount: '', bankInfo: '', idCardFrontUrl: '', idCardBackUrl: '', paymentStatus: 'Chưa thanh toán', notes: ''});
          triggerToast('Đã thêm Lương công nhật thành công!', 'success');
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày chấm công *</label><input type="date" required value={newLaborData.date || new Date().toISOString().split('T')[0]} onChange={(e) => setNewLaborData({...newLaborData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Loại thanh toán</label><CustomSelect value={newLaborData.content} onChange={(e) => setNewLaborData({...newLaborData, content: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white text-xs">
    {laborContents.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Họ tên *</label><CustomSelect value={(newLaborData as any).workerName || ''} onChange={(e) => setNewLaborData({...newLaborData, workerName: e.target.value} as any)} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Văn A" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborWorkerNames.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
            <div><label className="block font-bold mb-1">Diễn giải / Chức danh *</label><CustomSelect value={newLaborData.description} onChange={(e) => setNewLaborData({...newLaborData, description: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Lương thợ điện, Lương phụ hồ..." className="w-full border rounded-lg p-2 bg-white text-xs">{laborDescriptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><CustomSelect value={newLaborData.unit} onChange={(e) => setNewLaborData({...newLaborData, unit: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white text-xs">
    {laborUnits.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect></div>
            <div><label className="block font-bold mb-1">Số công/Số lượng</label><input type="number" step="0.5" value={newLaborData.quantity} onChange={(e) => setNewLaborData({...newLaborData, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá công nhật (đ)</label><input type="text" value={newLaborData.unitPrice?.toLocaleString('vi-VN') || ''} onChange={(e) => setNewLaborData({...newLaborData, unitPrice: Number(e.target.value.replace(/[^0-9]/g, ''))})} className="w-full border rounded-lg p-2 font-bold bg-white text-right text-primary" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Số tài khoản ngân hàng</label><CustomSelect value={newLaborData.bankAccount} onChange={(e) => setNewLaborData({...newLaborData, bankAccount: e.target.value})} searchable={true} allowCustomInput={true} placeholder="0919996466 - BIDV" className="w-full border rounded-lg p-2 bg-white text-xs">
    {laborBankAccounts.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect></div>
            <div><label className="block font-bold mb-1">Tên chủ tài khoản *</label><CustomSelect value={newLaborData.bankInfo} onChange={(e) => setNewLaborData({...newLaborData, bankInfo: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Chí Công" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborBankInfos.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <ImageUpload 
                label="Ảnh CCCD (Tải lên cả 2 mặt)"
                multiple={true}
                value={[newLaborData.idCardFrontUrl, newLaborData.idCardBackUrl].filter(Boolean) as string[]}
                onChange={(urls) => {
                  const urlArray = Array.isArray(urls) ? urls : [urls];
                  setNewLaborData({...newLaborData, idCardFrontUrl: urlArray[0] || '', idCardBackUrl: urlArray[1] || ''});
                }}
              />
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Tình trạng thanh toán</label>
            <CustomSelect value={newLaborData.paymentStatus} onChange={(e) => setNewLaborData({...newLaborData, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
              <option value="Chưa thanh toán">Chưa thanh toán</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
            </CustomSelect>
          </div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewLaborOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu</button></div>
        </form>
      </Modal>

      {/* Edit Labor Modal */}
      <Modal isOpen={!!editingLabor} onClose={() => setEditingLabor(null)} title="Cập nhật Thông tin Lương Công nhật">
        {editingLabor && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const qty = Number(editingLabor.quantity || 1);
            const price = Number(editingLabor.unitPrice || 0);
            const total = qty * price;

            updateLaborPayroll(editingLabor.id, {
              ...editingLabor,
              totalAmount: total
            });
            setEditingLabor(null);
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày làm *</label><input type="date" required value={String(editingLabor.date || '').split('T')[0] || new Date().toISOString().split('T')[0]} onChange={(e) => setEditingLabor({...editingLabor, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Loại thanh toán</label><CustomSelect value={editingLabor.content} onChange={(e) => setEditingLabor({...editingLabor, content: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white text-xs">
    {laborContents.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Họ tên *</label><CustomSelect value={editingLabor.workerName || ''} onChange={(e) => setEditingLabor({...editingLabor, workerName: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Văn A" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborWorkerNames.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
              <div><label className="block font-bold mb-1">Diễn giải/ Chức vụ *</label><CustomSelect value={editingLabor.description} onChange={(e) => setEditingLabor({...editingLabor, description: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Lương thợ điện, Lương phụ hồ..." className="w-full border rounded-lg p-2 bg-white text-xs">{laborDescriptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><CustomSelect value={editingLabor.unit} onChange={(e) => setEditingLabor({...editingLabor, unit: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white text-xs">
    {laborUnits.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect></div>
              <div><label className="block font-bold mb-1">Số công</label><input type="number" step="0.5" value={editingLabor.quantity} onChange={(e) => setEditingLabor({...editingLabor, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="text" value={editingLabor.unitPrice?.toLocaleString('vi-VN') || ''} onChange={(e) => setEditingLabor({...editingLabor, unitPrice: Number(e.target.value.replace(/[^0-9]/g, ''))})} className="w-full border rounded-lg p-2 font-bold bg-white text-right text-primary" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Số tài khoản</label><CustomSelect value={editingLabor.bankAccount} onChange={(e) => setEditingLabor({...editingLabor, bankAccount: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white text-xs">{laborBankAccounts.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
              <div><label className="block font-bold mb-1">Người nhận *</label><CustomSelect value={editingLabor.bankInfo} onChange={(e) => setEditingLabor({...editingLabor, bankInfo: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborBankInfos.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect></div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <ImageUpload 
                  label="Ảnh CCCD (Tải lên cả 2 mặt)"
                  multiple={true}
                  value={[editingLabor.idCardFrontUrl, editingLabor.idCardBackUrl].filter(Boolean) as string[]}
                  onChange={(urls) => {
                    const urlArray = Array.isArray(urls) ? urls : [urls];
                    setEditingLabor({...editingLabor, idCardFrontUrl: urlArray[0] || '', idCardBackUrl: urlArray[1] || ''});
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Tình trạng thanh toán</label>
              <CustomSelect value={editingLabor.paymentStatus} onChange={(e) => setEditingLabor({...editingLabor, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
              </CustomSelect>
            </div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingLabor(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu cập nhật</button></div>
          </form>
        )}
      </Modal>
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />

      {/* Confirm dialog: tạo Công việc từ hạng mục PL01 */}
      {showCreateTaskConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface rounded-xl shadow-2xl border border-outline-variant w-full max-w-md overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">add_task</span>
                Tạo Công việc từ hạng mục vừa nhập?
              </h3>
              <button
                onClick={() => { setShowCreateTaskConfirm(false); setPendingTaskItems([]); }}
                className="p-1 text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Hệ thống vừa nhập <strong className="text-primary font-semibold">{pendingTaskItems.length} hạng mục</strong> từ phụ lục PL01 vào Kế hoạch Vật tư & Mua sắm.
              </p>
              <p className="text-body-md text-on-surface-variant leading-relaxed mt-2">
                Bạn có muốn tự động đồng bộ tạo <strong className="text-primary font-semibold">{pendingTaskItems.length} Công việc</strong> tương ứng trong tab <strong className="text-on-surface font-semibold">Quản lý Công việc</strong> không?
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateTaskConfirm(false); setPendingTaskItems([]); }}
                className="px-4 py-2 border border-outline text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors font-medium text-sm"
              >
                Không, bỏ qua
              </button>
              <button
                onClick={() => {
                  addTasksBatch(pendingTaskItems);
                  setShowCreateTaskConfirm(false);
                  setPendingTaskItems([]);
                  triggerToast(`Đã tạo ${pendingTaskItems.length} Công việc từ phụ lục PL01!`, 'success');
                }}
                className="px-4 py-2 bg-secondary-container text-white hover:opacity-90 rounded transition-opacity font-bold text-sm shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">done</span>
                Có, tạo Công việc
              </button>
            </div>
          </div>

        </div>
      )}

      <datalist id="expense-content-types">
        {expenseContentTypes.map((type, i) => (
          <option key={i} value={type} />
        ))}
      </datalist>

      <datalist id="spender-names">
        {expenseSpenderNames.map((name, i) => (
          <option key={i} value={name} />
        ))}
      </datalist>
    </div>
  );
};










