import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { MaterialPlanTab } from './cost-plan/MaterialPlanTab';
import { PurchasingTab } from './cost-plan/PurchasingTab';
import { DocumentCertificateTab } from './cost-plan/DocumentCertificateTab';
import { ActivityLogTab } from './cost-plan/ActivityLogTab';

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

const normalizePlanKey = (stt?: string, content?: string, parentId?: string) =>
  `${String(stt || '').trim()}|${String(content || '').trim().toLowerCase()}|${parentId || ''}`;

const isSectionMarker = (stt?: string, notes?: string) =>
  String(notes || '').toLowerCase().includes('[section]') || romanToNumber(stt) !== null;

const isAutoSyncedMaterialPlan = (plan?: ProjectMaterialPlan) => {
  const notes = String(plan?.notes || '').toLowerCase();
  return notes.includes('[section]') || notes.includes('đồng bộ') || notes.includes('dong bo');
};

const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {
  const notes = String(plan.notes || '').toLowerCase();
  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return plan.supplyScope === 'contractor' || notes.includes('[contractor]') || notes.includes('nha thau') || content.includes('nha thau cung cap');
};

export const ProjectCostPlanPage: React.FC = () => {
  const {
    projects,
    materialPlans,
    purchasingPlans,
    expenses,
    laborPayrolls,
    tasks,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpdatePurchasingPlanSync = (id: string, updates: Partial<ProjectPurchasing>) => {
    const existing = purchasingPlans.find(p => p.id === id);
    updatePurchasingPlan(id, updates);
    if (!existing) return;

    if (updates.stt !== undefined || updates.content !== undefined || updates.unit !== undefined || updates.volumeContract !== undefined) {
      const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      
      const matchingMaterial = materialPlans.find(m => 
        (existing.materialPlanId && m.id === existing.materialPlanId) ||
        (m.projectCode === existing.projectCode && norm(m.stt) === norm(existing.stt) && norm(m.jobContent) === norm(existing.content))
      );
      if (matchingMaterial) {
        triggerToast(`Đã đồng bộ sang Kế hoạch vật tư: ${matchingMaterial.jobContent}`, 'success');
        updateMaterialPlan(matchingMaterial.id, {
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
          name: updates.content !== undefined ? updates.content : matchingTask.name
        });
      }
    }
  };

  const handleUpdateMaterialPlanSync = (id: string, updates: Partial<ProjectMaterialPlan>) => {
    const existing = materialPlans.find(p => p.id === id);
    updateMaterialPlan(id, updates);
    if (!existing) return;

    if (updates.stt !== undefined || updates.jobContent !== undefined || updates.unit !== undefined || updates.contractVolume !== undefined) {
      const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

      const matchingPurchasing = purchasingPlans.find(p => 
        p.projectCode === existing.projectCode && 
        norm(p.stt) === norm(existing.stt) && 
        norm(p.content) === norm(existing.jobContent)
      );
      if (matchingPurchasing) {
        updatePurchasingPlan(matchingPurchasing.id, {
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
          name: updates.jobContent !== undefined ? updates.jobContent : matchingTask.name
        });
      }
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
          const purchasingPromises: Promise<void>[] = [];
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
          let romanSectionCounter = 0; // Đếm số đầu mục lớn để chuyển thành số La Mã
          let currentSectionSupplyScope = 'unknown'; // Theo dõi supplyScope của section hiện tại cho các hạng mục con

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

            rows.slice(headerRowIndex + 1).forEach((row) => {
              const content = String(row[contentCol] || '').trim();
              if (!content) return;

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
              const isSectionRow = romanRegex.test(stt) || (numericParentRegex.test(stt) && volumeContract === 0 && !String(row[unitCol] || '').trim());

              let effectiveStt = stt;
              if (isSectionRow) {
                romanSectionCounter++;
                effectiveStt = toRoman(romanSectionCounter);
                currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau cung cap') || normalizeImportText(content).includes('ben b cung cap')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu cung cap') || normalizeImportText(content).includes('ben a cung cap')) ? 'owner' : 'unknown';
              }
              
              const rowSupplyScope = (normalizeImportText(content).includes('nha thau cung cap') || normalizeImportText(content).includes('ben b cung cap')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu cung cap') || normalizeImportText(content).includes('ben a cung cap')) ? 'owner' : 'unknown';
              const supplyScope = isSectionRow ? currentSectionSupplyScope : (rowSupplyScope !== 'unknown' ? rowSupplyScope : currentSectionSupplyScope);

              // Lưu thứ tự tuyệt đối vào notes dạng [order:NNN] để sort đúng sau khi load
              const orderTag = `[order:${String(++globalOrder).padStart(5, '0')}]`;
              const rowKey = baselineKey(effectiveStt, content);
              const baseNote = [isSectionRow ? '[section]' : '', supplyScope === 'contractor' ? '[contractor]' : '', supplyScope === 'owner' ? '[owner]' : '', orderTag, String(row[notesCol] || ''), sheetName].filter(Boolean).join(' | ');
              const existingMaterial = materialBaselineMap.get(rowKey);
              if (existingMaterial) {
                updateMaterialPlan(existingMaterial.id, {
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
                  issueContent: '',
                  supplyScope,
                  notes: baseNote,
                }));
                materialBaselineMap.set(rowKey, { id: '', projectCode: selectedProject, stt: effectiveStt, jobContent: content, unit: String(row[unitCol] || ''), contractVolume: volumeContract } as ProjectMaterialPlan);
              }
              appendixMaterialCount++;

              if ((isSectionRow && supplyScope !== 'owner') || (supplyScope === 'contractor' && (volumeContract > 0 || unitPrice > 0 || totalAmount > 0))) {
                const computedVatAmount = vatAmount || (vatRate ? totalBeforeVat * vatRate / 100 : 0);
                const totalWithVat = totalAmount || totalBeforeVat + computedVatAmount;

                const existingPurchasing = purchasingBaselineMap.get(rowKey);
                if (existingPurchasing) {
                  updatePurchasingPlan(existingPurchasing.id, {
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
                  purchasingBaselineMap.set(rowKey, { id: '', projectCode: selectedProject, stt: effectiveStt, content, unit: String(row[unitCol] || ''), volumeContract, volumeOrder: 0, unitPrice, vatRate, vatAmount: computedVatAmount, totalAmount: totalWithVat, prepayPercent: 0, prepayAmount: 0, remainingAmount: totalWithVat, orderStatus: '', contractStatus: '', invoiceStatus: '' } as ProjectPurchasing);
                }
                appendixPurchasingCount++;
              }

              const existingTask = taskBaselineMap.get(rowKey);
              if (!existingTask) {
                const projName = projects.find(p => p.code === selectedProject)?.name || selectedProject;
                const currentSectionName = isSectionRow ? content : (pendingTasks.slice().reverse().find((task) => task.isSectionHeader)?.name || 'Khác');
                pendingTasks.push({
                  stt: effectiveStt,
                  code: '',
                  name: content,
                  projectCode: selectedProject,
                  projectName: projName,
                  volume: isSectionRow ? 0 : volumeContract,
                  unit: isSectionRow ? '' : String(row[unitCol] || ''),
                  progress: 0,
                  status: 'Chưa làm',
                  purchaseStatus: isSectionRow ? '' : 'Chưa đặt hàng',
                  constrStatus: isSectionRow ? '' : 'Chưa thi công',
                  isDone: false,
                  isSectionHeader: isSectionRow,
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
            rows.slice(startRow).forEach(row => {
              const jobContent = row[1];
              if (!jobContent) return;
              
              const stt = String(row[0] || '');
              const contentStr = String(jobContent);
              const rKey = baselineKey(stt, contentStr);
              const existing = materialBaselineMap.get(rKey);

              const updateData = {
                progressStatus: String(row[6] || row[7] || 'Chưa thi công'),
                orderedVolume: numVal(row[8]),
                orderedStatus: String(row[9] || 'Chưa đặt hàng'),
                expectedDate: parseExcelDate(row[10]),
                issueContent: String(row[11] || ''),
                docCo: String(row[13] || '').toLowerCase().includes('x') || row[13] === true || String(row[13] || '') === '1',
                docCq: String(row[14] || '').toLowerCase().includes('x') || row[14] === true || String(row[14] || '') === '1',
                docFireInspection: String(row[15] || '').toLowerCase().includes('x') || row[15] === true || String(row[15] || '') === '1',
                dispatchToSite: String(row[16] || '').toLowerCase().includes('x') || row[16] === true || String(row[16] || '') === '1',
                dispatchDate: parseExcelDate(row[17]),
                notes: String(row[18] || '')
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
                  unit: String(row[2] || ''),
                  contractVolume: numVal(row[3]),
                  techSpecModel: String(row[4] || ''),
                  techSpecOrigin: String(row[5] || ''),
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

  // Active Project Code
  const projectOptions = useMemo(() => {
    // Collect all project codes from projects list
    const codes = new Set(projects.map(p => p.code));
    // Also add codes from materialPlans if not present
    materialPlans.forEach(p => codes.add(p.projectCode));
    return Array.from(codes);
  }, [projects, materialPlans]);

  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    if (projectOptions.length > 0) {
      if (!selectedProject || !projectOptions.includes(selectedProject)) {
        setSelectedProject(projectOptions[0]);
      }
    } else {
      setSelectedProject('');
    }
  }, [projectOptions, selectedProject]);

  const [activeTab, setActiveTab] = useState<'MATERIAL_PLAN' | 'PURCHASING' | 'EXPENSE' | 'LABOR' | 'DOCUMENTS' | 'ACTIVITY_LOG'>('MATERIAL_PLAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const currentProjPurchasing = useMemo(() =>
    purchasingPlans.filter((plan) => plan.projectCode === selectedProject),
    [purchasingPlans, selectedProject]
  );
  const currentProjExpenses = useMemo(() => 
    expenses.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [expenses, selectedProject]
  );

  const currentProjLabor = useMemo(() => 
    laborPayrolls.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [laborPayrolls, selectedProject]
  );

  // ----------------------------------------------------
  // COMPUTED METRICS
  // ----------------------------------------------------
  const projectMetrics = useMemo(() => {
    const materialRows = currentProjMaterialPlans.filter((p) => !isSectionMarker(p.stt, p.notes));
    const purchasingRows = currentProjPurchasing.filter((p) => !isSectionMarker(p.stt, p.notes));
    const normalizeStatusText = (value?: string) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
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
    const balance = currentProjExpenses.length > 0 && currentProjExpenses.some((e) => Number(e.balanceFund || 0) !== 0)
      ? Number(currentProjExpenses[currentProjExpenses.length - 1].balanceFund || 0)
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
    
    if (activeTab === 'MATERIAL_PLAN') {
      data = currentProjMaterialPlans.map(p => ({
        'STT': p.stt,
        'Nội dung công việc': p.jobContent,
        'ĐVT': p.unit,
        'Khối lượng HĐ': p.contractVolume,
        'Chào hàng': p.techSpecModel || '',
        'Đáp ứng kỹ thuật': p.techSpecOrigin || '',
        'Tình trạng': p.progressStatus || '',
        'KL Đặt hàng': p.orderedVolume || 0,
        'TT Đặt hàng': p.orderedStatus || '',
        'Ngày có hàng (dự kiến)': p.expectedDate || '',
        'Vướng mắc/Tồn đọng - Nội dung': p.issueContent || '',
        'Vướng mắc/Tồn đọng - TT xử lý': p.issueStatus || '',
        'Chứng từ CO': p.docCo ? 'Có' : 'Chưa có',
        'Chứng từ CQ': p.docCq ? 'Có' : 'Chưa có',
        'Kiểm định PCCC': p.docFireInspection ? 'Có' : 'Chưa có',
        'Đã gửi tới CT': p.dispatchToSite ? 'Có' : 'Chưa gửi',
        'Ngày luân chuyển': p.dispatchDate || '',
        'Ghi chú': p.notes || ''
      }));
      sheetName = 'KeHoachVatTu';
    } else if (activeTab === 'PURCHASING') {
      data = currentProjPurchasing.map(p => ({
        'STT': p.stt,
        'Nội dung': p.content,
        'ĐVT': p.unit,
        'Khối lượng HĐ': p.volumeContract,
        'Khối lượng ĐH': p.volumeOrder,
        'Đơn giá': p.unitPrice,
        'VAT (%)': p.vatRate,
        'Tiền thuế': p.vatAmount,
        'Thành tiền': p.totalAmount,
        'Tạm ứng (%)': p.prepayPercent * 100,
        'Thanh toán': p.prepayAmount,
        'TT Đặt hàng': p.orderStatus,
        'TT Hợp đồng': p.contractStatus,
        'Ngày thanh toán': p.paymentDate || '',
        'Hóa đơn': p.invoiceStatus || '',
        'Ghi chú': p.notes || ''
      }));
      sheetName = 'MuaSamHangHoa';
    } else if (activeTab === 'EXPENSE') {
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
        'Chứng từ': ['CO: ' + (p.docCo ? 'Có' : 'Chưa có'), 'CQ: ' + (p.docCq ? 'Có' : 'Chưa có'), 'Kiểm định PCCC: ' + (p.docFireInspection ? 'Có' : 'Chưa có')].join('; '),
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
      {/* HEADER SECTION */}
      <section className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">calculate</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase font-['Inter']">KẾ HOẠCH & CHI PHÍ DỰ ÁN</h1>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx" 
            className="hidden" 
          />

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase px-2">Dự án:</span>
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)} 
            className="bg-white border border-slate-200 px-3 py-1.5 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          >
            {projectOptions.length === 0 ? (
              <option value="">-- Chưa có dự án --</option>
            ) : (
              projectOptions.map(code => {
                const proj = projects.find(p => p.code === code);
                return <option key={code} value={code}>{proj?.name || code}</option>;
              })
            )}
          </select>
          </div>
        </div>
      </section>

      {/* TABS SELECTOR */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-1 shadow-xs border-x">
        <div className="flex items-center gap-4">
          {[
            { id: 'MATERIAL_PLAN', label: 'Kế Hoạch Vật Tư', icon: 'list_alt' },
            { id: 'PURCHASING', label: 'Mua hàng (nhà thầu)', icon: 'shopping_bag' },
            { id: 'EXPENSE', label: 'Chi Phí Công Trình', icon: 'receipt_long' },
            { id: 'LABOR', label: 'Lương Công Nhật', icon: 'engineering' },
            { id: 'DOCUMENTS', label: 'Theo dõi chứng từ', icon: 'description' },
            { id: 'ACTIVITY_LOG', label: 'Nhật ký hoạt động', icon: 'manage_history' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
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
              className="flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
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
              className="flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              Xuất Excel
            </button>
            {activeTab !== 'MATERIAL_PLAN' && activeTab !== 'PURCHASING' && activeTab !== 'ACTIVITY_LOG' && (
              <button 
                onClick={() => {
                  if (!selectedProject) {
                    triggerToast('Vui lòng khởi tạo dự án trước khi thêm dữ liệu!', 'warning');
                    return;
                  }
                  setIsCreatingSectionHeader(false);
                  if (activeTab === 'EXPENSE') setIsNewExpenseOpen(true);
                  else if (activeTab === 'LABOR') setIsNewLaborOpen(true);
                  else if (activeTab === 'DOCUMENTS') setTriggerAddDoc(true);
                }} 
                className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 shadow-xs"
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
        {activeTab === 'MATERIAL_PLAN' && (
          <MaterialPlanTab
            data={currentProjMaterialPlans}
            onUpdate={handleUpdateMaterialPlanSync}
            onEdit={setEditingPlan}
            onDelete={(id) => {
              const item = currentProjMaterialPlans.find(p => p.id === id);
              setDeleteConfirm({ isOpen: true, id, type: 'material', title: 'Xóa kế hoạch vật tư', itemName: `hạng mục "${item?.jobContent}"` });
            }}
            onAddSubtask={(plan, suggestedStt) => {
              setParentPlanIdForNew(plan.id);
              setIsCreatingSectionHeader(false);
              setIsNewPlanOpen(true);
              setNewPlanData(prev => ({ ...prev, stt: suggestedStt || '', isContractor: true }));
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {/* PURCHASING TAB */}
        {activeTab === 'PURCHASING' && (
          <PurchasingTab
            data={currentProjPurchasing}
            onUpdate={handleUpdatePurchasingPlanSync}
            onEdit={setEditingPurchasing}
            onDelete={(id) => {
              const item = currentProjPurchasing.find(p => p.id === id);
              setDeleteConfirm({ isOpen: true, id, type: 'purchasing', title: 'Xóa mua sắm hàng hóa', itemName: `mục "${item?.content}"` });
            }}
            onAddSubtask={(plan, suggestedStt) => {
              setParentPurchasingIdForNew(plan.id);
              setIsCreatingSectionHeader(false);
              setIsNewPurchasingOpen(true);
              setNewPurchasingData(prev => ({ ...prev, stt: suggestedStt || '' }));
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'DOCUMENTS' && (
          <DocumentCertificateTab
            data={currentProjMaterialPlans}
            selectedProject={selectedProject}
            onAdd={addMaterialPlan}
            onUpdate={updateMaterialPlan}
            onDelete={(id) => {
              const item = currentProjMaterialPlans.find(p => p.id === id);
              setDeleteConfirm({ isOpen: true, id, type: 'material', title: 'Xóa chứng từ', itemName: `chứng từ của "${item?.jobContent}"` });
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            triggerAdd={triggerAddDoc}
            onTriggerHandled={() => setTriggerAddDoc(false)}
          />
        )}

        {/* EXPENSE TAB */}
        {activeTab === 'EXPENSE' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Ngày chi</th>
                  <th className="p-3 min-w-56">Nội dung / Diễn giải</th>
                  <th className="p-3 w-16 text-left">ĐVT</th>
                  <th className="p-3 text-right">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá (đ)</th>
                  <th className="p-3 text-right">VAT</th>
                  <th className="p-3 text-right">Thành tiền (đ)</th>
                  <th className="p-3 text-right">Thực thu (đ)</th>
                  <th className="p-3 text-right">Tồn quỹ (đ)</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-center">Hóa đơn</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentProjExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingExpense(exp)}>
                    <td className="p-3 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900">{exp.date}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{exp.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{exp.description}</div>
                    </td>
                    <td className="p-3 text-left">{exp.unit}</td>
                    <td className="p-3 text-right">{exp.quantity}</td>
                    <td className="p-3 text-right">{exp.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-slate-500">{(exp.taxAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-rose-600">-{exp.totalAmount.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold">{(exp.incomeAmount || 0) > 0 ? `+${exp.incomeAmount?.toLocaleString('vi-VN')}` : '-'}</td>
                    <td className="p-3 text-right font-bold text-primary">{(exp.balanceFund || 0) > 0 ? exp.balanceFund?.toLocaleString('vi-VN') : '-'}</td>
                    <td className="p-3 text-slate-500 italic">{exp.notes || '-'}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {exp.invoiceUrl ? (
                        <button onClick={() => window.open(exp.invoiceUrl, '_blank')} className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                          <span className="material-symbols-outlined text-sm">image</span>
                          Xem ảnh
                        </button>
                      ) : (
                        <span className="text-slate-300">Không có</span>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setDeleteConfirm({ isOpen: true, id: exp.id, type: 'expense', title: 'Xóa phiếu chi', itemName: `phiếu chi "${exp.content}"` });
                        }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {currentProjExpenses.length === 0 && (
                  <tr><td colSpan={11} className="p-8 text-center text-slate-400">Chưa có giao dịch chi phí công trình nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* LABOR TAB */}
        {activeTab === 'LABOR' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Ngày làm</th>
                  <th className="p-3">Họ tên</th>
                  <th className="p-3 min-w-56">Nội dung lương công nhật</th>
                  <th className="p-3 w-16 text-left">ĐVT</th>
                  <th className="p-3 text-right">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá (đ)</th>
                  <th className="p-3 text-right">Thành tiền (đ)</th>
                  <th className="p-3">Tài khoản & Người nhận</th>
                  <th className="p-3 text-center">CCCD</th>
                  <th className="p-3 text-center">Tình trạng</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentProjLabor.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingLabor({...lab, date: lab.date || new Date().toISOString().split('T')[0]})}>
                    <td className="p-3 text-center font-bold text-slate-400">{lab.stt || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900">{lab.date}</td>
                    <td className="p-3 font-bold text-slate-900">{lab.workerName || '-'}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lab.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{lab.description}</div>
                    </td>
                    <td className="p-3 text-left">{lab.unit}</td>
                    <td className="p-3 text-right">{lab.quantity}</td>
                    <td className="p-3 text-right">{lab.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-primary">{lab.totalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lab.bankInfo}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{lab.bankAccount}</div>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        {lab.idCardFrontUrl ? (
                          <a href={lab.idCardFrontUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline font-bold">Mặt trước</a>
                        ) : null}
                        {lab.idCardBackUrl ? (
                          <a href={lab.idCardBackUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline font-bold">Mặt sau</a>
                        ) : null}
                        {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">Không có</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        lab.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {lab.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setDeleteConfirm({ isOpen: true, id: lab.id, type: 'labor', title: 'Xóa lương công nhật', itemName: `lương của "${lab.workerName || lab.description}"` });
                        }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {currentProjLabor.length === 0 && (
                  <tr><td colSpan={11} className="p-8 text-center text-slate-400">Không có thông tin lương công nhật nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'ACTIVITY_LOG' && (
          <ActivityLogTab
            data={activityLogs}
            selectedProject={selectedProject}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

      </div>

      {/* MODALS */}
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
          const autoStt = (() => {
            if (newPlanData.stt) return newPlanData.stt;
            if (isCreatingSectionHeader) {
              const sectionCount = currentProjMaterialPlans.filter(p => isSectionMarker(p.stt, p.notes)).length;
              return toRoman(sectionCount + 1);
            }
            if (parentId) {
              const parentObj = currentProjMaterialPlans.find(p => p.id === parentId);
              const siblings = currentProjMaterialPlans.filter(p => p.parentId === parentId);
              const nextIndex = siblings.length + 1;
              return parentObj?.stt ? `${parentObj.stt}.${nextIndex}` : String(nextIndex);
            }
            return String(currentProjMaterialPlans.filter(p => !p.parentId).length + 1);
          })();

          const isContractor = !!newPlanData.isContractor;
          const baseNote = (() => {
            const tags = [];
            if (isCreatingSectionHeader && !parentId) tags.push('[section]');
            if (isContractor) tags.push('[contractor]');
            if (newPlanData.notes) tags.push(newPlanData.notes);
            return tags.join(' | ');
          })();

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
            const contractVol = Number(newPlanData.contractVolume || 1);
            let purchasingParentId = undefined;
            if (parentId) {
              const exactMatch = currentProjPurchasing.find(p => p.materialPlanId === parentId);
              if (exactMatch) {
                purchasingParentId = exactMatch.id;
              } else {
                const parentMaterial = currentProjMaterialPlans.find(p => p.id === parentId);
                if (parentMaterial) {
                  const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
                  const matchingPurchasing = currentProjPurchasing.find(
                    p => norm(p.stt) === norm(parentMaterial.stt) && norm(p.content) === norm(parentMaterial.jobContent)
                  );
                  if (matchingPurchasing) purchasingParentId = matchingPurchasing.id;
                }
              }
            }

            addPurchasingPlan({
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
              paymentDate: '',
              invoiceStatus: 'Chưa xuất',
              notes: baseNote,
              parentId: purchasingParentId || undefined
            });
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
                <div className="flex items-center gap-1.5">
                  <select
                    value={sectionPlanIdForNew || ''}
                    onChange={(e) => {
                      setSectionPlanIdForNew(e.target.value || null);
                      setParentPlanIdForNew(null);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/70 font-bold text-primary truncate"
                  >
                    <option value="">-- Chọn Đầu mục cha --</option>
                    {currentProjMaterialPlans.filter(p => isSectionMarker(p.stt, p.notes)).map(sec => (
                      <option key={sec.id} value={sec.id} title={sec.jobContent}>
                        {sec.stt ? `${sec.stt}. ` : ''}{sec.jobContent}
                      </option>
                    ))}
                  </select>
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
                <select
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
                </select>
              </div>
            </div>
          )}

          <div>
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
          {!isCreatingSectionHeader && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Đơn vị tính</label><input type="text" value={newPlanData.unit} onChange={(e) => setNewPlanData({...newPlanData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Khối lượng HĐ</label><input type="number" value={newPlanData.contractVolume} onChange={(e) => setNewPlanData({...newPlanData, contractVolume: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Mã hiệu / Quy cách</label><input type="text" value={newPlanData.techSpecModel} onChange={(e) => setNewPlanData({...newPlanData, techSpecModel: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Nguồn sản xuất / Xuất xứ</label><input type="text" value={newPlanData.techSpecOrigin} onChange={(e) => setNewPlanData({...newPlanData, techSpecOrigin: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Tiến độ thi công</label>
                  <select value={newPlanData.progressStatus} onChange={(e) => setNewPlanData({...newPlanData, progressStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa thi công">Chưa thi công</option>
                    <option value="Đang thi công">Đang thi công</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Trạng thái đặt hàng</label>
                  <select value={newPlanData.orderedStatus} onChange={(e) => setNewPlanData({...newPlanData, orderedStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                    <option value="Đã đặt hàng">Đã đặt hàng</option>
                    <option value="Đã nhận đủ">Đã nhận đủ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Ngày cấp hàng dự kiến</label>
                <input type="date" value={newPlanData.expectedDate || ''} onChange={(e) => setNewPlanData({...newPlanData, expectedDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
              </div>
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-lg border">
                <div className="flex items-center gap-1.5"><input type="checkbox" checked={newPlanData.docCo} onChange={(e) => setNewPlanData({...newPlanData, docCo: e.target.checked})} /> <span className="font-bold">Chứng từ CO</span></div>
                <div className="flex items-center gap-1.5"><input type="checkbox" checked={newPlanData.docCq} onChange={(e) => setNewPlanData({...newPlanData, docCq: e.target.checked})} /> <span className="font-bold">Chứng từ CQ</span></div>
                <div className="flex items-center gap-1.5"><input type="checkbox" checked={newPlanData.dispatchToSite} onChange={(e) => setNewPlanData({...newPlanData, dispatchToSite: e.target.checked})} /> <span className="font-bold">Đã gửi tới CT</span></div>
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
                <label htmlFor="isContractorCheck" className="font-bold text-amber-700 cursor-pointer select-none flex items-center gap-1.5">
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
              <label htmlFor="isContractorCheckHeader" className="font-bold text-amber-700 cursor-pointer select-none flex items-center gap-1.5">
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
      <Modal isOpen={!!editingPlan} onClose={() => { setEditingPlan(null); setIsCreatingSectionHeader(false); }} title="Cập nhật Kế hoạch Vật tư">
        {editingPlan && (
          <form onSubmit={(e) => {
            e.preventDefault();
            updateMaterialPlan(editingPlan.id, editingPlan);
            // Nếu là contractor → sync sang purchasing plan
            if (isContractorMaterialPlan(editingPlan)) {
              const key = normalizePlanKey(editingPlan.stt, editingPlan.jobContent, editingPlan.parentId);
              const matchingPurchasing = purchasingPlans.find(p =>
                p.projectCode === editingPlan.projectCode &&
                normalizePlanKey(p.stt, p.content, p.parentId) === key
              );
              if (matchingPurchasing) {
                updatePurchasingPlan(matchingPurchasing.id, {
                  ...matchingPurchasing,
                  stt: editingPlan.stt,
                  content: editingPlan.jobContent,
                  unit: editingPlan.unit,
                  volumeContract: editingPlan.contractVolume || matchingPurchasing.volumeContract,
                });
              }
            }
            setEditingPlan(null);
            triggerToast('Đã cập nhật Kế hoạch Vật tư thành công!', 'success');
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">STT</label><input type="text" value={editingPlan.stt} onChange={(e) => setEditingPlan({...editingPlan, stt: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div className="col-span-2"><label className="block font-bold mb-1">Tên vật tư *</label><input type="text" required value={editingPlan.jobContent} onChange={(e) => setEditingPlan({...editingPlan, jobContent: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingPlan.unit} onChange={(e) => setEditingPlan({...editingPlan, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Khối lượng HĐ</label><input type="number" value={editingPlan.contractVolume} onChange={(e) => setEditingPlan({...editingPlan, contractVolume: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Mã hiệu / Quy cách</label><input type="text" value={editingPlan.techSpecModel} onChange={(e) => setEditingPlan({...editingPlan, techSpecModel: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Nguồn gốc</label><input type="text" value={editingPlan.techSpecOrigin} onChange={(e) => setEditingPlan({...editingPlan, techSpecOrigin: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Tiến độ</label>
                <select value={editingPlan.progressStatus} onChange={(e) => setEditingPlan({...editingPlan, progressStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa thi công">Chưa thi công</option>
                  <option value="Đang thi công">Đang thi công</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Trạng thái đặt</label>
                <select value={editingPlan.orderedStatus} onChange={(e) => setEditingPlan({...editingPlan, orderedStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  <option value="Đã đặt hàng">Đã đặt hàng</option>
                  <option value="Đã nhận đủ">Đã nhận đủ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ngày cấp hàng dự kiến</label>
              <input type="date" value={editingPlan.expectedDate || ''} onChange={(e) => setEditingPlan({...editingPlan, expectedDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div className="flex items-center gap-1.5"><input type="checkbox" checked={editingPlan.docCo} onChange={(e) => setEditingPlan({...editingPlan, docCo: e.target.checked})} /> <span className="font-bold">CO</span></div>
              <div className="flex items-center gap-1.5"><input type="checkbox" checked={editingPlan.docCq} onChange={(e) => setEditingPlan({...editingPlan, docCq: e.target.checked})} /> <span className="font-bold">CQ</span></div>
              <div className="flex items-center gap-1.5"><input type="checkbox" checked={editingPlan.dispatchToSite} onChange={(e) => setEditingPlan({...editingPlan, dispatchToSite: e.target.checked})} /> <span className="font-bold">Đã gửi CT</span></div>
            </div>
            {/* Nhà thầu */}
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <input
                type="checkbox"
                id="editIsContractorCheck"
                checked={editingPlan.supplyScope === 'contractor'}
                onChange={(e) => setEditingPlan({...editingPlan, supplyScope: e.target.checked ? 'contractor' : 'unknown'})}
                className="w-4 h-4 accent-amber-500"
              />
              <label htmlFor="editIsContractorCheck" className="font-bold text-amber-700 cursor-pointer select-none flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-500">handshake</span>
                Nhà thầu cung cấp — hiển thị trong tab Mua hàng
              </label>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingPlan.notes} onChange={(e) => setEditingPlan({...editingPlan, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setEditingPlan(null); setIsCreatingSectionHeader(false); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
          </form>
        )}
      </Modal>

      {/* 2. Modal Mua Sắm Hàng Hóa */}
      <Modal isOpen={isNewPurchasingOpen} onClose={() => { setIsNewPurchasingOpen(false); setParentPurchasingIdForNew(null); setSectionPurchasingIdForNew(null); setIsCreatingSectionHeader(false); setNewPurchasingData({stt: '', content: '', unit: 'bộ', volumeContract: 0, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''}); }} title={isCreatingSectionHeader ? 'Thêm Đầu mục lớn — Mua sắm Hàng hóa' : 'Thêm Hạng mục — Mua sắm Hàng hóa'} size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const parentId = isCreatingSectionHeader ? null : (parentPurchasingIdForNew || sectionPurchasingIdForNew || null);
          const contractVol = Number(newPurchasingData.volumeContract || 1);
          const orderVol = Number(newPurchasingData.volumeOrder || 0);
          const unitPrice = Number(newPurchasingData.unitPrice || 0);
          const vat = Number(newPurchasingData.vatRate || 10);
          const prepayPct = Number(newPurchasingData.prepayPercent || 0);
          
          const rawTotal = contractVol * unitPrice;
          const taxAmt = rawTotal * (vat / 100);
          const totalAmt = rawTotal + taxAmt;
          const prepayAmt = totalAmt * prepayPct;
          const remainingAmt = totalAmt - prepayAmt;

          // Auto STT: La Mã cho đầu mục lớn, số thứ tự cho hạng mục nhỏ
          const autoStt = (() => {
            if (newPurchasingData.stt) return newPurchasingData.stt;
            if (isCreatingSectionHeader) {
              const sectionCount = currentProjMaterialPlans.filter(p => isSectionMarker(p.stt, p.notes)).length;
              return toRoman(sectionCount + 1);
            }
            if (parentId) {
              const parentObj = currentProjPurchasing.find(p => p.id === parentId);
              const siblings = currentProjPurchasing.filter(p => p.parentId === parentId);
              const nextIndex = siblings.length + 1;
              return parentObj?.stt ? `${parentObj.stt}.${nextIndex}` : String(nextIndex);
            }
            return String(currentProjPurchasing.filter(p => !p.parentId).length + 1);
          })();

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

          addMaterialPlan({
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

          addTask({
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

          addPurchasingPlan({
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
            paymentDate: newPurchasingData.paymentDate || '',
            invoiceStatus: newPurchasingData.invoiceStatus || 'Chưa xuất',
            notes: isCreatingSectionHeader && !parentId ? '[section]' : newPurchasingData.notes || '',
            parentId: parentId || undefined
          });

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
                <div className="flex items-center gap-1.5">
                  <select
                    value={sectionPurchasingIdForNew || ''}
                    onChange={(e) => {
                      setSectionPurchasingIdForNew(e.target.value || null);
                      setParentPurchasingIdForNew(null);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/70 font-bold text-primary truncate"
                  >
                    <option value="">-- Chọn Đầu mục cha --</option>
                    {currentProjPurchasing.filter(p => isSectionMarker(p.stt, p.notes)).map(sec => (
                      <option key={sec.id} value={sec.id} title={sec.content}>
                        {sec.stt ? `${sec.stt}. ` : ''}{sec.content}
                      </option>
                    ))}
                  </select>
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
                <select
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
                </select>
              </div>
            </div>
          )}

          <div>
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
          {!isCreatingSectionHeader && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newPurchasingData.unit} onChange={(e) => setNewPurchasingData({...newPurchasingData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">KL Hợp đồng</label><input type="number" value={String(newPurchasingData.volumeContract)} onChange={(e) => setNewPurchasingData({...newPurchasingData, volumeContract: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">KL Đơn đặt</label><input type="number" value={String(newPurchasingData.volumeOrder)} onChange={(e) => setNewPurchasingData({...newPurchasingData, volumeOrder: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" value={String(newPurchasingData.unitPrice)} onChange={(e) => setNewPurchasingData({...newPurchasingData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
                <div><label className="block font-bold mb-1">Thuế suất VAT (%)</label><input type="number" value={String(newPurchasingData.vatRate)} onChange={(e) => setNewPurchasingData({...newPurchasingData, vatRate: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
                <div><label className="block font-bold mb-1">Tỷ lệ Tạm ứng (%)</label><input type="number" min="0" max="100" value={String(Math.round((newPurchasingData.prepayPercent || 0) * 100))} onChange={(e) => setNewPurchasingData({...newPurchasingData, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
              </div>
              <div>
                <label className="block font-bold mb-1">Ngày dự kiến có hàng</label>
                <input type="date" value={newPurchasingData.paymentDate || ''} onChange={(e) => setNewPurchasingData({...newPurchasingData, paymentDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
              </div>
              {(() => {
                const liveContractVol = Number(newPurchasingData.volumeContract || 0);
                const liveUnitPrice = Number(newPurchasingData.unitPrice || 0);
                const liveVatRate = Number(newPurchasingData.vatRate || 0);
                const livePrepayPercent = Number(newPurchasingData.prepayPercent || 0);

                const liveRawTotal = liveContractVol * liveUnitPrice;
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
                    <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                      <span>Tổng tiền (có VAT):</span>
                      <span className="text-primary">{liveTotalAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiền Tạm ứng ({Math.round(livePrepayPercent * 100)}%):</span>
                      <span className="font-bold text-rose-600">{livePrepayAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                      <span>Còn lại phải trả:</span>
                      <span className="text-emerald-600">{liveRemainingAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">TT Đặt hàng</label>
                  <select value={newPurchasingData.orderStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, orderStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                    <option value="Đã đặt hàng">Đã đặt hàng</option>
                    <option value="Đang giao hàng">Đang giao hàng</option>
                    <option value="Đã nhận hàng">Đã nhận hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Hợp đồng</label>
                  <select value={newPurchasingData.contractStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, contractStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa ký">Chưa ký</option>
                    <option value="Đang trình duyệt">Đang trình duyệt</option>
                    <option value="Đã ký">Đã ký</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Hóa đơn</label>
                  <select value={newPurchasingData.invoiceStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, invoiceStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Chưa xuất">Chưa xuất</option>
                    <option value="Đang kiểm tra">Đang kiểm tra</option>
                    <option value="Đã xuất">Đã xuất</option>
                  </select>
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
              <div><label className="block font-bold mb-1">KL Hợp đồng</label><input type="number" value={String(editingPurchasing.volumeContract)} onChange={(e) => setEditingPurchasing({...editingPurchasing, volumeContract: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">KL Đơn đặt</label><input type="number" value={String(editingPurchasing.volumeOrder)} onChange={(e) => setEditingPurchasing({...editingPurchasing, volumeOrder: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" value={String(editingPurchasing.unitPrice)} onChange={(e) => setEditingPurchasing({...editingPurchasing, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Thuế suất VAT (%)</label><input type="number" value={String(editingPurchasing.vatRate)} onChange={(e) => setEditingPurchasing({...editingPurchasing, vatRate: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Tỷ lệ Tạm ứng (%)</label><input type="number" min="0" max="100" value={String(Math.round((editingPurchasing.prepayPercent || 0) * 100))} onChange={(e) => setEditingPurchasing({...editingPurchasing, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ngày dự kiến có hàng</label>
              <input type="date" value={editingPurchasing.paymentDate || ''} onChange={(e) => setEditingPurchasing({...editingPurchasing, paymentDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
            </div>
            {(() => {
              const editContractVol = Number(editingPurchasing.volumeContract || 0);
              const editUnitPrice = Number(editingPurchasing.unitPrice || 0);
              const editVatRate = Number(editingPurchasing.vatRate || 0);
              const editPrepayPercent = Number(editingPurchasing.prepayPercent || 0);

              const editRawTotal = editContractVol * editUnitPrice;
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
                  <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                    <span>Tổng tiền (có VAT):</span>
                    <span className="text-primary">{editTotalAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền Tạm ứng ({Math.round(editPrepayPercent * 100)}%):</span>
                    <span className="font-bold text-rose-600">{editPrepayAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                    <span>Còn lại phải trả:</span>
                    <span className="text-emerald-600">{editRemainingAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">TT Đặt hàng</label>
                <select value={editingPurchasing.orderStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, orderStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  <option value="Đã đặt hàng">Đã đặt hàng</option>
                  <option value="Đang giao hàng">Đang giao hàng</option>
                  <option value="Đã nhận hàng">Đã nhận hàng</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Hợp đồng</label>
                <select value={editingPurchasing.contractStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, contractStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa ký">Chưa ký</option>
                  <option value="Đang trình duyệt">Đang trình duyệt</option>
                  <option value="Đã ký">Đã ký</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Hóa đơn</label>
                <select value={editingPurchasing.invoiceStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, invoiceStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa xuất">Chưa xuất</option>
                  <option value="Đang kiểm tra">Đang kiểm tra</option>
                  <option value="Đã xuất">Đã xuất</option>
                </select>
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
        <form onSubmit={(e) => {
          e.preventDefault();
          const qty = Number(newExpenseData.quantity || 1);
          const price = Number(newExpenseData.unitPrice || 0);
          const vat = Number((newExpenseData as any).vatAmount || 0);
          const total = qty * price + vat;

          addExpense({
            projectCode: selectedProject,
            stt: newExpenseData.stt || String(currentProjExpenses.length + 1),
            date: newExpenseData.date || new Date().toISOString().split('T')[0],
            content: newExpenseData.content || 'Vật tư/ thiết bị',
            description: newExpenseData.description || '',
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
          setIsNewExpenseOpen(false);
          setNewExpenseData({stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''});
          triggerToast('Đã thêm Chi phí thành công!', 'success');
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={newExpenseData.date} onChange={(e) => setNewExpenseData({...newExpenseData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Loại nội dung</label><input type="text" value={newExpenseData.content} onChange={(e) => setNewExpenseData({...newExpenseData, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required placeholder="VD: Mua keo non, tắc kê đan..." value={newExpenseData.description} onChange={(e) => setNewExpenseData({...newExpenseData, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newExpenseData.unit} onChange={(e) => setNewExpenseData({...newExpenseData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Số lượng</label><input type="number" value={String(newExpenseData.quantity)} onChange={(e) => setNewExpenseData({...newExpenseData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" value={String(newExpenseData.unitPrice)} onChange={(e) => setNewExpenseData({...newExpenseData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" value={String((newExpenseData as any).vatAmount || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, vatAmount: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" value={String((newExpenseData as any).incomeAmount || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, incomeAmount: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Tồn quỹ (đ)</label><input type="number" value={String((newExpenseData as any).balanceFund || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, balanceFund: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          {(() => {
            const liveQty = Number(newExpenseData.quantity || 0);
            const livePrice = Number(newExpenseData.unitPrice || 0);
            const liveVat = Number((newExpenseData as any).vatAmount || 0);
            const liveTotal = liveQty * livePrice + liveVat;
            return (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-xs font-bold">
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
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewExpenseOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu phiếu chi</button></div>
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

            updateExpense(editingExpense.id, {
              ...editingExpense,
              totalAmount: total
            });
            setEditingExpense(null);
            triggerToast('Đã cập nhật Chi phí thành công!', 'success');
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={editingExpense.date} onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Loại nội dung</label><input type="text" value={editingExpense.content} onChange={(e) => setEditingExpense({...editingExpense, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingExpense.unit} onChange={(e) => setEditingExpense({...editingExpense, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Số lượng</label><input type="number" value={String(editingExpense.quantity)} onChange={(e) => setEditingExpense({...editingExpense, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" value={String(editingExpense.unitPrice)} onChange={(e) => setEditingExpense({...editingExpense, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" value={String(editingExpense.taxAmount || 0)} onChange={(e) => setEditingExpense({...editingExpense, taxAmount: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" value={String(editingExpense.incomeAmount || 0)} onChange={(e) => setEditingExpense({...editingExpense, incomeAmount: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Tồn quỹ (đ)</label><input type="number" value={String(editingExpense.balanceFund || 0)} onChange={(e) => setEditingExpense({...editingExpense, balanceFund: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            {(() => {
              const editQty = Number(editingExpense.quantity || 0);
              const editPrice = Number(editingExpense.unitPrice || 0);
              const editVat = Number(editingExpense.taxAmount || 0);
              const editTotal = editQty * editPrice + editVat;
              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-xs font-bold">
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
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu thay đổi</button></div>
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
            <div><label className="block font-bold mb-1">Loại thanh toán</label><input type="text" value={newLaborData.content} onChange={(e) => setNewLaborData({...newLaborData, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Họ tên *</label><input type="text" required placeholder="VD: Nguyễn Văn A" value={(newLaborData as any).workerName || ''} onChange={(e) => setNewLaborData({...newLaborData, workerName: e.target.value} as any)} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            <div><label className="block font-bold mb-1">Diễn giải / Chức danh *</label><input type="text" required placeholder="VD: Lương thợ điện, Lương phụ hồ..." value={newLaborData.description} onChange={(e) => setNewLaborData({...newLaborData, description: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newLaborData.unit} onChange={(e) => setNewLaborData({...newLaborData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Số công/Số lượng</label><input type="number" step="0.5" value={newLaborData.quantity} onChange={(e) => setNewLaborData({...newLaborData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá công nhật (đ)</label><input type="number" value={newLaborData.unitPrice} onChange={(e) => setNewLaborData({...newLaborData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Số tài khoản ngân hàng</label><input type="text" placeholder="0919996466 - BIDV" value={newLaborData.bankAccount} onChange={(e) => setNewLaborData({...newLaborData, bankAccount: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Tên chủ tài khoản *</label><input type="text" placeholder="VD: Nguyễn Chí Công" value={newLaborData.bankInfo} onChange={(e) => setNewLaborData({...newLaborData, bankInfo: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Mặt trước CCCD (Link Drive)</label><input type="text" placeholder="https://drive.google.com/..." value={newLaborData.idCardFrontUrl} onChange={(e) => setNewLaborData({...newLaborData, idCardFrontUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Mặt sau CCCD (Link Drive)</label><input type="text" placeholder="https://drive.google.com/..." value={newLaborData.idCardBackUrl} onChange={(e) => setNewLaborData({...newLaborData, idCardBackUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div>
            <label className="block font-bold mb-1">Tình trạng thanh toán</label>
            <select value={newLaborData.paymentStatus} onChange={(e) => setNewLaborData({...newLaborData, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
              <option value="Chưa thanh toán">Chưa thanh toán</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
            </select>
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
              <div><label className="block font-bold mb-1">Loại thanh toán</label><input type="text" value={editingLabor.content} onChange={(e) => setEditingLabor({...editingLabor, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Họ tên *</label><input type="text" required value={editingLabor.workerName || ''} onChange={(e) => setEditingLabor({...editingLabor, workerName: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
              <div><label className="block font-bold mb-1">Diễn giải/ Chức vụ *</label><input type="text" required value={editingLabor.description} onChange={(e) => setEditingLabor({...editingLabor, description: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingLabor.unit} onChange={(e) => setEditingLabor({...editingLabor, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Số công</label><input type="number" step="0.5" value={editingLabor.quantity} onChange={(e) => setEditingLabor({...editingLabor, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" value={editingLabor.unitPrice} onChange={(e) => setEditingLabor({...editingLabor, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Số tài khoản</label><input type="text" value={editingLabor.bankAccount} onChange={(e) => setEditingLabor({...editingLabor, bankAccount: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Người nhận *</label><input type="text" required value={editingLabor.bankInfo} onChange={(e) => setEditingLabor({...editingLabor, bankInfo: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Mặt trước CCCD</label><input type="text" value={editingLabor.idCardFrontUrl || ''} onChange={(e) => setEditingLabor({...editingLabor, idCardFrontUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Mặt sau CCCD</label><input type="text" value={editingLabor.idCardBackUrl || ''} onChange={(e) => setEditingLabor({...editingLabor, idCardBackUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div>
              <label className="block font-bold mb-1">Tình trạng thanh toán</label>
              <select value={editingLabor.paymentStatus} onChange={(e) => setEditingLabor({...editingLabor, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
              </select>
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
                className="px-4 py-2 bg-secondary-container text-white hover:opacity-90 rounded transition-opacity font-bold text-sm shadow-md flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">done</span>
                Có, tạo Công việc
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};










