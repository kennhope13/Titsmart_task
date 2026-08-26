import React, { useMemo, useState } from 'react';
import { ProjectMaterialPlan, ProjectPurchasing, getStatusColorStyle, getTextColorStyle, PURCHASE_STATUS_OPTIONS, CONSTRUCTION_STATUS_OPTIONS } from '../../types';
import { CustomSelect } from '@/components/common/CustomSelect';
import { decodeModels, encodeModels, ModelEntry } from './DocumentCertificateTab';
import { FastDocModal } from './FastDocModal';
import { DocumentCertificateTab } from './DocumentCertificateTab';

interface MaterialAndPurchasingTabProps {
  activeSubTab?: 'TECH' | 'ORDER' | 'DOCS' | 'FINANCE';
  data: ProjectMaterialPlan[];
  purchasingData: ProjectPurchasing[];
  onEditMaterial: (plan: ProjectMaterialPlan) => void;
  onEditPurchasing: (plan: ProjectPurchasing, subTab: 'FINANCE') => void;
  onDelete: (id: string) => void;
  onUpdateMaterial: (id: string, plan: Partial<ProjectMaterialPlan>) => void | Promise<void>;
  onUpdatePurchasing: (id: string, plan: Partial<ProjectPurchasing>) => void | Promise<void>;
  onAddSubtask?: (plan: ProjectMaterialPlan, suggestedStt?: string) => void;
  onAddSection?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  userRole?: string;
  selectedProject: string;
  onAddMaterial: (plan: any) => void;
}

const TEXT = {
  search: 'Tìm theo nội dung công việc, vật tư, ghi chú...',
  statusFilter: 'Lọc trạng thái:',
  all: 'Tất cả',
  notStarted: 'Chưa thi công',
  doing: 'Đang thi công',
  done: 'Đã hoàn thành',
  empty: 'Không có hạng mục nào phù hợp với bộ lọc đã chọn',
  edit: 'Chỉnh sửa',
  confirmDelete: 'Xóa hạng mục kế hoạch vật tư này?',
};

const isParentRow = (plan: ProjectMaterialPlan) => {
  const stt = String(plan.stt || '').trim();
  const notes = String(plan.notes || '').toLowerCase();
  return notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(stt);
};

const cleanNotes = (value?: string) => {
  return String(value || '')
    .replace(/\[order:[\d.]+\]/g, '')
    .replace(/\[section\]/gi, '')
    .replace(/\[contractor\]/gi, '')
    .replace(/\[owner\]/gi, '').replace(/\[doc-track\]/gi, '').replace(/\[doc-track\s*]/gi, '')
    .replace(/Nhà thầu cung cấp/gi, '')
    .replace(/Chủ đầu tư cung cấp/gi, '')
    .replace(/Import từ phụ lục dự án/gi, '')
    .replace(/Đồng bộ từ phụ lục khi tạo dự án/gi, '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .join(' | ');
};

const getIssueContentText = (val?: string) => {
  const parts = String(val || '').split('[DOC-DATA]');
  // If there's no [DOC-DATA], and the string is valid JSON, then it's all JSON (no text).
  if (parts.length === 1) {
    try {
      JSON.parse(parts[0]);
      return ''; // It's all JSON, so text is empty
    } catch (e) {
      return parts[0]; // Not JSON, so it's all text
    }
  }
  return parts[0];
};

const getIssueContentData = (val?: string) => {
  const parts = String(val || '').split('[DOC-DATA]');
  if (parts.length > 1) return parts[1];
  try {
    JSON.parse(parts[0]);
    return parts[0];
  } catch (e) {
    return '';
  }
};

const getTechNote = (val?: string) => String(val || '').split('[DOC-NOTE]')[0];
const getDocNoteFull = (val?: string) => {
  const parts = String(val || '').split('[DOC-NOTE]');
  return parts.length > 1 ? parts[1] : '';
};
const getDocNote = (val?: string) => getDocNoteFull(val).split('[DOC-FILENAME]')[0].trim();
const getDocFileName = (val?: string) => {
  const parts = getDocNoteFull(val).split('[DOC-FILENAME]');
  return parts.length > 1 ? parts[1].trim() : '';
};
const cleanTechNotes = (val?: string) => cleanNotes(getTechNote(val));
const cleanDocNotes = (val?: string) => getDocNote(val);


const showNumber = (value?: number) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
};

const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC') => {
  if (!plan.issueContent || !plan.issueContent.includes('[DOC-DATA]')) return null;
  try {
    const models = decodeModels(plan.issueContent);
    const links: React.ReactNode[] = [];
    let counter = 0;
    models.forEach(m => {
      m.docs.forEach(d => {
        if (!d.fileUrls || d.fileUrls.length === 0) return;
        const lower = (d.text || '').toLowerCase();
        let docTypeMatches = false;
        if (type === 'CO' && (lower.includes('co') || lower.includes('c/o'))) docTypeMatches = true;
        else if (type === 'CQ' && (lower.includes('cq') || lower.includes('c/q'))) docTypeMatches = true;
        else if (type === 'PCCC' && (lower.includes('pccc') || lower.includes('phòng cháy'))) docTypeMatches = true;
        
        if (docTypeMatches) {
          d.fileUrls.forEach(url => {
             counter++;
             links.push(
               <a key={`f-${counter}`} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors flex items-center justify-center" title={d.text || 'Xem file'}>
                 <span className="material-symbols-outlined text-[16px]">description</span>
               </a>
             );
          });
        }
      });
    });
    return links.length > 0 ? <div className="flex flex-wrap items-center gap-1.5">{links}</div> : null;
  } catch (e) { return null; }
};

export const MaterialAndPurchasingTab: React.FC<MaterialAndPurchasingTabProps> = ({
  data,
  purchasingData,
  onEditMaterial,
  onEditPurchasing,
  onDelete,
  onUpdateMaterial,
  onUpdatePurchasing,
  onAddSubtask,
  onAddSection,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  userRole,
  activeSubTab
}) => {
  const subTab = activeSubTab || 'TECH';
  const [filterParent, setFilterParent] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterProgress, setFilterProgress] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterDocs, setFilterDocs] = useState('all');
  const [filterExpectedDate, setFilterExpectedDate] = useState('all');
  const [filterContractStatus, setFilterContractStatus] = useState('all');
  const [filterPaymentDate, setFilterPaymentDate] = useState('all');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('all');


  // Cross-reference helper
  const findPurchasingMatch = (plan: ProjectMaterialPlan) => {
    let match = purchasingData.find(p => p.materialPlanId === plan.id);
    if (match) return match;

    const norm = (s?: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    match = purchasingData.find(
      p => norm(p.stt) === norm(plan.stt) && norm(p.content) === norm(plan.jobContent)
    );
    return match;
  };

  const parentOptions = useMemo(() => {
    const parents = data.filter(p => {
      const stt = String(p.stt || '').trim();
      const notes = String(p.notes || '').toLowerCase();
      return notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(stt);
    });
    return [{ id: 'all', label: 'Tất cả' }, ...parents.map(p => ({ id: p.id, label: p.jobContent }))];
  }, [data]);
  
  const unitOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.unit).filter(Boolean)))], [data]);
  const progressOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.progressStatus).filter(Boolean)))], [data]);
  const orderOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.orderedStatus).filter(Boolean)))], [data]);
  const modelOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.techSpecModel).filter(Boolean)))], [data]);
  const originOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.techSpecOrigin).filter(Boolean)))], [data]);
  const expectedDateOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.expectedDate).filter(Boolean)))], [data]);
  const contractStatusOptions = useMemo(() => ['all', ...Array.from(new Set(purchasingData.map(p => p.contractStatus).filter(Boolean)))], [purchasingData]);
  const paymentDateOptions = useMemo(() => ['all', ...Array.from(new Set(purchasingData.map(p => p.paymentDate).filter(Boolean)))], [purchasingData]);
  const invoiceStatusOptions = useMemo(() => ['all', ...Array.from(new Set(purchasingData.map(p => p.invoiceStatus).filter(Boolean)))], [purchasingData]);
  const docsOptions = [
    { id: 'all', label: 'Tất cả' },
    { id: 'missing_co', label: 'Thiếu CO' },
    { id: 'missing_cq', label: 'Thiếu CQ' },
    { id: 'missing_fire', label: 'Thiếu PCCC' },
    { id: 'not_dispatched', label: 'Chưa về CT' }
  ];


  const [editingCell, setEditingCell] = useState<{ id: string; field: string; isPurchasing: boolean } | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [triggerAddDoc, setTriggerAddDoc] = useState(false);
  const [docModalPlanId, setDocModalPlanId] = useState<string | null>(null);
  const [fastDocType, setFastDocType] = useState<'CO'|'CQ'|'PCCC'|null>(null);
  const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) { next.delete(sectionKey); } else { next.add(sectionKey); }
      return next;
    });
  };

  const { filteredData, resolveParentId, getSectionIndexForItem } = useMemo(() => {
    let filtered = [...data];
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            p.jobContent?.toLowerCase().includes(q) || 
            p.unit?.toLowerCase().includes(q) || 
            p.notes?.toLowerCase().includes(q)
        );
    }
    if (filterModel && filterModel !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.techSpecModel === filterModel;
      });
    }
    if (filterOrigin && filterOrigin !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.techSpecOrigin === filterOrigin;
      });
    }
    if (filterProgress && filterProgress !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.progressStatus === filterProgress;
      });
    }
    if (filterExpectedDate && filterExpectedDate !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.expectedDate === filterExpectedDate;
      });
    }
    if (filterContractStatus && filterContractStatus !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         const purch = findPurchasingMatch(p);
         return purch?.contractStatus === filterContractStatus;
      });
    }
    if (filterPaymentDate && filterPaymentDate !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         const purch = findPurchasingMatch(p);
         return purch?.paymentDate === filterPaymentDate;
      });
    }
    if (filterInvoiceStatus && filterInvoiceStatus !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         const purch = findPurchasingMatch(p);
         return purch?.invoiceStatus === filterInvoiceStatus;
      });
    }
    if (filterDocs && filterDocs !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         if (filterDocs === 'missing_co') return !p.docCo;
         if (filterDocs === 'missing_cq') return !p.docCq;
         if (filterDocs === 'missing_fire') return !p.docFireInspection;
         if (filterDocs === 'not_dispatched') return !p.dispatchToSite;
         return true;
      });
    }
    if (statusFilter && statusFilter !== 'Tất cả' && statusFilter !== 'ALL') {
      filtered = filtered.filter(p => {
        if (isParentRow(p)) return true;
        if (statusFilter === 'Chưa thi công') return p.progressStatus === 'Chưa thi công' || !p.progressStatus;
        return p.progressStatus === statusFilter;
      });
    }

    const romanToInt = (s: string): number => {
      const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      const upper = s.toUpperCase();
      let total = 0;
      for (let i = 0; i < upper.length; i++) {
        const cur = map[upper[i]] ?? 0;
        const nxt = map[upper[i + 1]] ?? 0;
        total += cur < nxt ? -cur : cur;
      }
      return total;
    };
    const numericSttParts = (stt?: string): number[] => {
      const text = String(stt || '').trim();
      if (!text) return [Infinity];
      return text.split(/[.\-]/).map(p => { const n = parseInt(p, 10); return isNaN(n) ? Infinity : n; });
    };

    const sectionSortKey = (r: ProjectMaterialPlan): number[] => {
      const stt = String(r.stt || '').trim();
      if (/^[IVXLCDM]+$/i.test(stt)) return [0, romanToInt(stt)];
      return [1, ...numericSttParts(stt)];
    };
    const sectionOrder = new Map<string, number>();
    [...filtered]
      .filter(r => isParentRow(r))
      .sort((a, b) => {
        const ka = sectionSortKey(a), kb = sectionSortKey(b);
        for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
          const diff = (ka[i] ?? -1) - (kb[i] ?? -1);
          if (diff !== 0) return diff;
        }
        return 0;
      })
      .forEach((r, i) => sectionOrder.set(r.id, i));

    const orderTagValue = (notes?: string): number | null => {
      const m = String(notes || '').match(/\[order:([\d.]+)\]/);
      return m ? parseFloat(m[1]) : null;
    };
    const originalOrderMap = new Map<string, number>(filtered.map((r, i) => [r.id, orderTagValue(r.notes) ?? (1000000 - i)]));

    const resolveParentId = (plan: ProjectMaterialPlan): string | undefined => {
      if (plan.stt && plan.stt.includes('.')) {
        const parts = plan.stt.split('.');
        parts.pop();
        const parentStt = parts.join('.');
        const parentItem = filtered.find(r => r.stt === parentStt);
        if (parentItem) return parentItem.id;
      }
      return plan.parentId;
    };

    if (filterParent !== 'all') {
      filtered = filtered.filter(p => {
        if (p.id === filterParent) return true;
        let currentParentId = resolveParentId(p);
        let safety = 0;
        while (currentParentId && safety < 100) {
          safety++;
          if (currentParentId === filterParent) return true;
          const parentItem = data.find(x => x.id === currentParentId);
          currentParentId = parentItem ? (parentItem.parentId || undefined) : undefined;
        }
        return false;
      });
    }
    if (filterUnit !== 'all') {
      filtered = filtered.filter(p => p.unit === filterUnit || isParentRow(p));
    }
    if (filterProgress !== 'all') {
      filtered = filtered.filter(p => p.progressStatus === filterProgress || isParentRow(p));
    }
    if (filterOrder !== 'all') {
      filtered = filtered.filter(p => p.orderedStatus === filterOrder || isParentRow(p));
    }


    const sectionIndexCache = new Map<string, number>();
    const getSectionIndexForItem = (plan: ProjectMaterialPlan, visited = new Set<string>()): number => {
      if (sectionIndexCache.has(plan.id)) return sectionIndexCache.get(plan.id)!;
      if (visited.has(plan.id)) return Infinity;
      visited.add(plan.id);

      if (isParentRow(plan)) {
        const res = sectionOrder.get(plan.id) ?? Infinity;
        sectionIndexCache.set(plan.id, res);
        return res;
      }
      
      const resolvedParentId = resolveParentId(plan);
      if (resolvedParentId) {
        if (sectionOrder.has(resolvedParentId)) {
          const res = sectionOrder.get(resolvedParentId)!;
          sectionIndexCache.set(plan.id, res);
          return res;
        }
        
        const parentItem = filtered.find(r => r.id === resolvedParentId);
        if (parentItem) {
          const parentSecIdx = getSectionIndexForItem(parentItem, visited);
          if (parentSecIdx !== -1) {
            sectionIndexCache.set(plan.id, parentSecIdx);
            return parentSecIdx;
          }
        }
      }

      const myPos = originalOrderMap.get(plan.id) ?? Infinity;
      let bestSecIdx = Infinity;
      let bestSecPos = -1;
      filtered.forEach(r => {
        if (isParentRow(r)) {
          const secPos = originalOrderMap.get(r.id) ?? Infinity;
          if (secPos <= myPos && secPos > bestSecPos) {
            bestSecPos = secPos;
            bestSecIdx = sectionOrder.get(r.id) ?? -1;
          }
        }
      });
      const finalRes = bestSecIdx === -1 ? Infinity : bestSecIdx;
      sectionIndexCache.set(plan.id, finalRes);
      return finalRes;
    };

    const sortedFiltered = filtered.sort((a, b) => {
      const secA = getSectionIndexForItem(a);
      const secB = getSectionIndexForItem(b);
      if (secA !== secB) return secA - secB;
      const aIsSec = isParentRow(a) ? 0 : 1;
      const bIsSec = isParentRow(b) ? 0 : 1;
      if (aIsSec !== bIsSec) return aIsSec - bIsSec;
      const ap = numericSttParts(a.stt), bp = numericSttParts(b.stt);
      for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
        const diff = (ap[i] ?? -1) - (bp[i] ?? -1);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    return { filteredData: sortedFiltered, resolveParentId, getSectionIndexForItem };
  }, [data, searchQuery, statusFilter, filterParent, filterUnit, filterProgress, filterOrder]);

  const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC') => {
    setFastDocModels(decodeModels(plan.issueContent));
    setDocModalPlanId(plan.id);
    setFastDocType(type);
  };

  const handleFastDocSubmit = (newModels: ModelEntry[]) => {
    if (!docModalPlanId) return;
    const plan = data.find(p => p.id === docModalPlanId);
    if (!plan) return;

    const hasFileFor = (keywords: string[]) => newModels.some(m => m.docs.some(d => {
      const lowerText = d.text.toLowerCase();
      return keywords.some(k => lowerText.includes(k)) && d.fileUrls && d.fileUrls.length > 0;
    }));

    const docCo = hasFileFor(['c/o', 'co']);
    const docCq = hasFileFor(['c/q', 'cq']);
    const docFireInspection = hasFileFor(['pccc', 'phòng cháy']);

    const payload = {
      ...plan,
      issueContent: `${getIssueContentText(plan.issueContent)} [DOC-DATA] ${encodeModels(newModels)}`,
      docCo,
      docCq,
      docFireInspection,
    };
    
    onUpdateMaterial(plan.id, payload);
    setFastDocType(null);
  };

  const startEditing = (id: string, field: string, value: any, isPurchasing = false) => {
    if (userRole === 'engineer') return;
    setEditingCell({ id, field, isPurchasing });
    
    let finalTemp = value === undefined || value === null ? '' : value;
    if (field === 'issueContent') finalTemp = getIssueContentText(value);
    setTempValue(finalTemp);

  };

  const saveEditing = (plan: ProjectMaterialPlan, pRecord?: ProjectPurchasing) => {
    if (!editingCell) return;
    const { id, field, isPurchasing } = editingCell;
    let finalValue = tempValue;

    if (isPurchasing) {
      if (pRecord) {
        if (field === 'notes') {
          const finalNotes = String(pRecord.notes || '');
          const existingTags = finalNotes.match(/(\[order:[\d.]+\]|\[section\]|\[contractor\]|\[owner\])/gi) || [];
          finalValue = [...existingTags, typeof tempValue === 'string' ? tempValue.trim() : tempValue].filter(Boolean).join(' | ');
        } else if (field === 'volumeOrder' || field === 'unitPrice' || field === 'vatRate' || field === 'prepayPercent' || field === 'prepayAmount') {
          finalValue = Number(tempValue || 0);
        }
        
        let updatePayload: Partial<ProjectPurchasing> = { [field]: finalValue };
        
        // Auto-calculate VAT & Total
        if (field === 'volumeOrder' || field === 'unitPrice' || field === 'vatRate') {
          const vol = field === 'volumeOrder' ? Number(finalValue) : (pRecord.volumeOrder || 0);
          const price = field === 'unitPrice' ? Number(finalValue) : (pRecord.unitPrice || 0);
          const rate = field === 'vatRate' ? Number(finalValue) : (pRecord.vatRate || 0);
          
          const vat = Math.round(vol * price * rate / 100);
          const total = Math.round(vol * price * (1 + rate / 100));
          
          updatePayload.vatAmount = vat;
          updatePayload.totalAmount = total;
          updatePayload.remainingAmount = total - (pRecord.prepayAmount || 0);
        } else if (field === 'prepayAmount') {
          const prepay = Number(finalValue);
          const total = pRecord.totalAmount || 0;
          updatePayload.remainingAmount = total - prepay;
          if (total > 0) {
            updatePayload.prepayPercent = Number(((prepay / total) * 100).toFixed(2));
          }
        } else if (field === 'prepayPercent') {
          const pct = Number(finalValue);
          const total = pRecord.totalAmount || 0;
          const prepay = Math.round(total * pct / 100);
          updatePayload.prepayAmount = prepay;
          updatePayload.remainingAmount = total - prepay;
        }

        onUpdatePurchasing(pRecord.id, updatePayload);
      }
    } else {
      let finalNotes = String(plan.notes || '');
      const currentTech = getTechNote(finalNotes);
      const currentDoc = getDocNote(finalNotes);
      const currentFile = getDocFileName(finalNotes);

      if (field === 'notes') {
        const existingTags = finalNotes.match(/(\[order:[\d.]+\]|\[section\]|\[contractor\]|\[owner\])/gi) || [];
        let updatedNote = [...existingTags, typeof tempValue === 'string' ? tempValue.trim() : tempValue].filter(Boolean).join(' | ');
        
        if (subTab === 'DOCS') {
           finalValue = `${currentTech} [DOC-NOTE] ${updatedNote} [DOC-FILENAME] ${currentFile}`;
        } else {
           finalValue = `${updatedNote} [DOC-NOTE] ${currentDoc} [DOC-FILENAME] ${currentFile}`;
        }
      } else if (field === 'fileName') {
        finalValue = `${currentTech} [DOC-NOTE] ${currentDoc} [DOC-FILENAME] ${typeof tempValue === 'string' ? tempValue.trim() : tempValue}`;
        
      } else if (field === 'contractVolume' || field === 'orderedVolume') {
        finalValue = Number(tempValue || 0);
      } else if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
        finalValue = tempValue === true || tempValue === 'true' || tempValue === 'Có';
      } else if (field === 'issueContent') {
        const existingDocData = getIssueContentData(plan.issueContent);
        const newText = typeof tempValue === 'string' ? tempValue.trim() : tempValue;
        finalValue = existingDocData ? `${newText} [DOC-DATA] ${existingDocData}` : newText;
      }
      onUpdateMaterial(id, { ...plan, [field === 'fileName' ? 'notes' : field]: finalValue });
    }
    setEditingCell(null);
  };

  const maxSttWidth = React.useMemo(() => {
    let maxLen = 3;
    data.forEach(t => {
      const len = String(t.stt || "").length;
      if (len > maxLen) maxLen = len;
    });
    return Math.max(50, maxLen * 7.5 + 16);
  }, [data]);

  const colSpanCount = useMemo(() => {
    if (subTab === 'TECH') return 9;
    if (subTab === 'DOCS') return 6;
    if (subTab === 'FINANCE') return 11;
    return 8;
  }, [subTab]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {fastDocType && (
        <FastDocModal
          title={`Cập nhật chứng từ ${fastDocType}`}
          docType={fastDocType}
          initialModels={fastDocModels}
          onClose={() => setFastDocType(null)}
          onSubmit={handleFastDocSubmit}
        />
      )}

      <datalist id="issueStatus-options">
        <option value="Chưa xử lý" />
        <option value="Đang xử lý" />
        <option value="Đã xử lý" />
        <option value="Cần xác nhận" />
      </datalist>
      <datalist id="issueContent-options">
        <option value="Chưa chốt phương án kỹ thuật" />
        <option value="Sai khác so với thiết kế" />
        <option value="Thiết kế thay đổi" />
        <option value="Hàng về chậm" />
        <option value="Nhà máy trễ tiến độ" />
        <option value="Chờ phê duyệt" />
      </datalist>

      <datalist id="issueStatus-options">
        <option value="Chưa xử lý" />
        <option value="Đang xử lý" />
        <option value="Đã xử lý" />
        <option value="Cần xác nhận" />
      </datalist>
      <datalist id="issueContent-options">
        <option value="Chưa chốt phương án kỹ thuật" />
        <option value="Sai khác so với thiết kế" />
        <option value="Thiết kế thay đổi" />
        <option value="Hàng về chậm" />
        <option value="Nhà máy trễ tiến độ" />
        <option value="Chờ phê duyệt" />
      </datalist>

      <div className="flex flex-col border-b border-slate-200 sticky top-0 z-10 bg-slate-50">
        
        

        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap" >
          <div className="flex items-center gap-1.5.5 font-bold text-slate-500 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium whitespace-nowrap">Đầu mục:</span>
              <CustomSelect
                value={filterParent}
                onChange={e => setFilterParent(e.target.value)}
                className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                {parentOptions.map(opt => {
                  let label = opt.label;
                  if (label && label.length > 30) label = label.slice(0, 30) + '...';
                  return <option key={opt.id} value={opt.id}>{opt.id === 'all' ? 'Tất cả' : label}</option>;
                })}
              </CustomSelect>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium whitespace-nowrap">ĐVT:</span>
              <CustomSelect
                value={filterUnit}
                onChange={e => setFilterUnit(e.target.value)}
                className="min-w-[50px] max-w-[90px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                {unitOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                ))}
              </CustomSelect>
            </div>

            {(subTab === 'TECH' || subTab === 'FINANCE') && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Đặt hàng:</span>
                <CustomSelect
                  value={filterOrder}
                  onChange={e => setFilterOrder(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {orderOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                  ))}
                </CustomSelect>
              </div>
            )}
            
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium whitespace-nowrap">Mã hiệu:</span>
              <CustomSelect
                value={filterModel}
                onChange={e => setFilterModel(e.target.value)}
                className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                {modelOptions.map(opt => {
                  let label = opt;
                  if (label && label.length > 20) label = label.slice(0, 20) + '...';
                  return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                })}
              </CustomSelect>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium whitespace-nowrap">Xuất xứ:</span>
              <CustomSelect
                value={filterOrigin}
                onChange={e => setFilterOrigin(e.target.value)}
                className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                {originOptions.map(opt => {
                  let label = opt;
                  if (label && label.length > 20) label = label.slice(0, 20) + '...';
                  return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                })}
              </CustomSelect>
            </div>

            {subTab === 'TECH' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Tình trạng:</span>
                <CustomSelect
                  value={filterProgress}
                  onChange={e => setFilterProgress(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {progressOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}
            
            {subTab === 'TECH' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Ngày có hàng:</span>
                <CustomSelect
                  value={filterExpectedDate}
                  onChange={e => setFilterExpectedDate(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {expectedDateOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'FINANCE' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Tình trạng HĐ:</span>
                <CustomSelect
                  value={filterContractStatus}
                  onChange={e => setFilterContractStatus(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {contractStatusOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'FINANCE' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Hạn TT:</span>
                <CustomSelect
                  value={filterPaymentDate}
                  onChange={e => setFilterPaymentDate(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {paymentDateOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'FINANCE' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Hóa đơn VAT:</span>
                <CustomSelect
                  value={filterInvoiceStatus}
                  onChange={e => setFilterInvoiceStatus(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {invoiceStatusOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'DOCS' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium whitespace-nowrap">Chứng từ:</span>
                <CustomSelect
                  value={filterDocs}
                  onChange={e => setFilterDocs(e.target.value)}
                  className="min-w-[70px] max-w-[110px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {docsOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </CustomSelect>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <div className="relative w-32 sm:w-40">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-100 border-none rounded text-xs focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none"
              />
            </div>

            {onAddSection && subTab !== 'FINANCE' && (
              <button
                onClick={onAddSection}
                className="flex items-center gap-1.5 bg-primary text-white px-2 py-1 rounded text-[11px] font-bold hover:opacity-90 active:scale-95 shadow-xs whitespace-nowrap h-7"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Thêm đầu mục</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full table-fixed border-collapse text-left text-xs" style={{ "--stt-width": `${maxSttWidth}px` } as React.CSSProperties}>
          <thead className="sticky top-0 z-30 border-b border-slate-300 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr className="bg-slate-50">
              <th rowSpan={2} style={{ minWidth: 50, width: "var(--stt-width)", borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold whitespace-nowrap">STT</th>
              <th rowSpan={2} style={{ width: '100%', minWidth: 400, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8', left: "var(--stt-width)" }} className="sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left ">NỘI DUNG</th>
              {(subTab === 'TECH' || subTab === 'DOCS') && (
                <>
                  <th rowSpan={2} style={{ minWidth: 50, width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">ĐVT</th>
                  <th rowSpan={2} style={{ minWidth: 70, width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL HĐ</th>
                  <th rowSpan={2} style={{ width: 120, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">MÃ HIỆU</th>
                  <th rowSpan={2} style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">XUẤT XỨ</th>
                </>
              )}
              
              {subTab === 'TECH' && (
                <>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TÌNH TRẠNG</th>
                  <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL ĐẶT HÀNG</th>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TT ĐẶT HÀNG</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">NGÀY CÓ HÀNG</th>
                  <th rowSpan={2} style={{ width: 200, borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">GHI CHÚ / VƯỚNG MẮC</th>
                </>
              )}

              {subTab === 'DOCS' && (
                <>
                  <th rowSpan={2} style={{ width: 160, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>
                </>
              )}

              {subTab === 'FINANCE' && (
                <>
                  <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL ĐH</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">ĐƠN GIÁ MUA</th>
                  <th rowSpan={2} style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">VAT %</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">TIỀN VAT</th>
                  <th rowSpan={2} style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">THÀNH TIỀN MUA</th>
                  <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">% TẠM ỨNG</th>
                  <th rowSpan={2} style={{ width: 95, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">THỰC CHI (đ)</th>
                  <th rowSpan={2} style={{ width: 95, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">CÒN LẠI (đ)</th>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">TÌNH TRẠNG HĐ</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">HẠN THANH TOÁN</th>
                  <th rowSpan={2} style={{ width: 120, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">HÓA ĐƠN VAT</th>
                </>
              )}

              {subTab !== 'TECH' && <th rowSpan={2} style={{ width: 110, borderBottom: '1px solid #94a3b8', borderLeft: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">GHI CHÚ</th>}
            </tr>
            <tr className="bg-slate-50">
              
              {subTab === 'DOCS' && (
                <>
                  
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
            {(() => {
              const groups: { [key: string]: any[] } = {};
              const order: string[] = [];
              let currentSectionKey = '__default__';

              filteredData.forEach(t => {
                if (isParentRow(t)) {
                  currentSectionKey = t.id;
                  if (!groups[currentSectionKey]) {
                    groups[currentSectionKey] = [];
                    order.push(currentSectionKey);
                  }
                  groups[currentSectionKey].unshift({ ...t, _isHeader: true });
                } else {
                  let targetSection = currentSectionKey;
                  const resolvedParentId = resolveParentId(t);
                  if (resolvedParentId && groups[resolvedParentId]) {
                    targetSection = resolvedParentId;
                  } else if (getSectionIndexForItem(t) !== Infinity) {
                    targetSection = currentSectionKey;
                  }

                  if (!groups[targetSection]) {
                    groups[targetSection] = [];
                    order.push(targetSection);
                  }
                  groups[targetSection].push({ ...t, _isHeader: false });
                }
              });

              const orphanedIdx = order.indexOf('__orphaned__');
              if (orphanedIdx !== -1) {
                order.splice(orphanedIdx, 1);
                order.push('__orphaned__');
              }

              const flattened: any[] = [];
              order.forEach((secKey) => {
                let sectionHeader = groups[secKey].find((t: any) => t._isHeader);
                if (secKey === '__orphaned__' && !sectionHeader) {
                  sectionHeader = {
                    id: '__orphaned__',
                    stt: '',
                    jobContent: 'CHƯA PHÂN NHÓM',
                    content: 'CHƯA PHÂN NHÓM',
                    isSec: true,
                    _isHeader: true
                  };
                }
                const items = groups[secKey].filter((t: any) => !t._isHeader);

                const map = new Map<string, any>();
                const roots: any[] = [];
                items.forEach((t: any) => map.set(t.id, { ...t, children: [] }));
                items.forEach((t: any) => {
                  const resolvedParentId = resolveParentId(t);
                  if (resolvedParentId && resolvedParentId !== secKey && map.has(resolvedParentId)) {
                    map.get(resolvedParentId)!.children.push(map.get(t.id));
                  } else {
                    roots.push(map.get(t.id));
                  }
                });

                const flattenTree = (nodes: any[], depth: number, prefix: string = '', sectionKey: string = '') => {
                  nodes.forEach((node: any, idx: number) => {
                    const currentNum = (idx + 1).toString();
                    const computedStt = node.stt || (depth === 1 ? currentNum : (depth > 1 ? `${prefix}.${currentNum}` : currentNum));
                    flattened.push({ ...node, depth, computedStt, isSec: false, _sectionKey: sectionKey });
                    flattenTree(node.children, depth + 1, computedStt, sectionKey);
                  });
                };

                if (sectionHeader) {
                  flattened.push({ ...sectionHeader, depth: 0, computedStt: sectionHeader.stt, isSec: true, _sectionKey: secKey });
                }
                flattenTree(roots, sectionHeader ? 1 : 0, '', secKey);
              });

              if (flattened.length === 0) {
                return <tr><td colSpan={colSpanCount + 2} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td></tr>;
              }

              return (
                <>
                  {flattened
                    .filter(plan => plan.isSec || !collapsedSections.has(plan._sectionKey || ''))
                    .map((plan, index) => {
                      const parent = plan.isSec;
                      const depth = plan.depth || 0;
                      const suggestedStt = '';
                      const pRecord = parent ? undefined : findPurchasingMatch(plan);

                      if (parent) {
                        const isCollapsed = collapsedSections.has(plan._sectionKey || '');
                        return (
                          <tr key={plan.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                            <td className="sticky left-0 z-10 bg-blue-50/90 border-r border-blue-200 px-1 py-1.5 text-center font-mono font-extrabold text-xs text-primary whitespace-nowrap">
                              {plan.stt}
                            </td>
                            <td colSpan={colSpanCount + 1} className="bg-blue-50/90 px-2 py-1.5 uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap" title={plan.jobContent}>
                              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden whitespace-nowrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleSection(plan._sectionKey || ''); }}
                                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                                  title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                                >
                                  <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                                </button>
                                <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                                <span className="truncate flex-1 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onEditMaterial?.(plan); }}>{plan.jobContent}</span>
                                {onAddSubtask && subTab !== 'FINANCE' && (
                                  <button onClick={(e) => { e.stopPropagation(); onAddSubtask(plan, suggestedStt); }} className="flex-shrink-0 p-0.5 rounded text-blue-300 hover:text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center" title="Thêm hạng mục mới">
                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                  </button>
                                )}
                                {onDelete && (
                                  <button onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }} className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-200 transition-colors inline-flex items-center" title="Xóa">
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      let rowBg = 'bg-white';
                      let stickyBg = 'bg-white';
                      let fontStyle = 'font-bold text-slate-900 text-[13px]';
                      let sttStyle = 'font-bold text-slate-400';
                      
                      if (depth === 1) {
                        rowBg = 'bg-slate-50';
                        stickyBg = 'bg-slate-50';
                        fontStyle = 'font-bold text-slate-900 text-sm';
                        sttStyle = 'font-bold text-slate-600';
                      } else if (depth === 2) {
                        fontStyle = 'font-semibold text-slate-700 text-[13px]';
                        sttStyle = 'font-semibold text-slate-400';
                      } else if (depth >= 3) {
                        sttStyle = 'font-medium text-slate-400 text-[10.5px]';
                      }
                      
                      const rowClass = `group transition-colors border-b border-slate-50 ${rowBg} hover:bg-slate-100`;
                      const paddingLeft = `${depth * 1.5}rem`;

                      return (
                        <tr key={plan.id} onDoubleClick={() => {
                          if (subTab === 'FINANCE') {
                            if (pRecord) onEditPurchasing(pRecord, 'FINANCE');
                          } else {
                            onEditMaterial(plan);
                          }
                        }} className={rowClass}>
                          {/* STT */}
                          <td className={`sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-200 p-0 align-middle text-center font-mono whitespace-nowrap overflow-hidden ${sttStyle}`}>
                            {editingCell?.id === plan.id && editingCell?.field === 'stt' && !editingCell.isPurchasing ? (
                              <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveEditing(plan, pRecord)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                autoFocus
                                className="w-full text-center bg-white text-slate-900 font-bold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                              />
                            ) : (
                              <span onClick={() => startEditing(plan.id, 'stt', plan.stt)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block w-full">{depth > 0 ? plan.computedStt : plan.stt}</span>
                            )}
                          </td>
                          
                          {/* NỘI DUNG */}
                          <td className={`sticky z-10 ${stickyBg} group-hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 p-0 align-middle text-left overflow-hidden ${fontStyle}`} style={{ left: "var(--stt-width)" }}>
                            {editingCell?.id === plan.id && editingCell?.field === 'jobContent' && !editingCell.isPurchasing ? (
                              <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveEditing(plan, pRecord)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                autoFocus
                                className="w-full bg-white text-slate-900 font-bold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5.5 w-full min-w-0 overflow-hidden whitespace-nowrap" style={{ paddingLeft }}>
                                {depth > 1 && (
                                  <span className="material-symbols-outlined flex-shrink-0 text-slate-300 text-[14px] mr-1 translate-y-[1px]">
                                    subdirectory_arrow_right
                                  </span>
                                )}
                                <span onClick={() => startEditing(plan.id, 'jobContent', plan.jobContent)} className="cursor-pointer hover:bg-slate-100 flex-1 px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center whitespace-normal break-words leading-tight" title={plan.jobContent}>
                                  {plan.jobContent}
                                </span>
                                
                                <div className="flex items-center ml-1 transition-opacity">
                                {onAddSubtask && subTab !== 'FINANCE' && (
                                  <button onClick={(e) => { e.stopPropagation(); onAddSubtask(plan, suggestedStt); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center flex-shrink-0" title="thêm hạng mục mới">
                                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                                  </button>
                                )}
                                  {onDelete && (
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center flex-shrink-0" title="Xóa">
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB */}
                          {(subTab === 'TECH' || subTab === 'DOCS') && (
                            <>
                              <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center font-semibold text-[11px] align-middle text-slate-700">
                                {editingCell?.id === plan.id && editingCell?.field === 'unit' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                  />
                                ) : (
                                  <div onClick={() => startEditing(plan.id, 'unit', plan.unit)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center" title={plan.unit || 'Click để nhập'}>
                                    {plan.unit || <span className="text-slate-300 italic">...</span>}
                                  </div>
                                )}
                              </td>
                              <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center font-semibold text-[11px] align-middle text-slate-700">
                                {editingCell?.id === plan.id && editingCell?.field === 'contractVolume' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9.-]/g, '');
                                      setTempValue(val);
                                    }}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-700 font-semibold focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                  />
                                ) : (
                                  <div onClick={() => startEditing(plan.id, 'contractVolume', plan.contractVolume)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center" title={showNumber(plan.contractVolume) || 'Click để nhập'}>
                                    {showNumber(plan.contractVolume) || <span className="text-slate-300 italic">...</span>}
                                  </div>
                                )}
                              </td>
                              <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center text-[11px] align-middle">
                                {editingCell?.id === plan.id && editingCell?.field === 'techSpecModel' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-700 focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                  />
                                ) : (
                                  <div onClick={() => startEditing(plan.id, 'techSpecModel', plan.techSpecModel)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center break-words px-1 text-slate-600" title={plan.techSpecModel || 'Click để nhập'}>
                                    {plan.techSpecModel || <span className="text-slate-300 italic">...</span>}
                                  </div>
                                )}
                              </td>
                              <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center text-[11px] align-middle">
                                {editingCell?.id === plan.id && editingCell?.field === 'techSpecOrigin' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-700 focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                  />
                                ) : (
                                  <div onClick={() => startEditing(plan.id, 'techSpecOrigin', plan.techSpecOrigin)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center break-words px-1 text-slate-600" title={plan.techSpecOrigin || 'Click để nhập'}>
                                    {plan.techSpecOrigin || <span className="text-slate-300 italic">...</span>}
                                  </div>
                                )}
                              </td>
                            </>
                          )}

                          {subTab === 'TECH' && (
                            <>
                              {/* TÌNH TRẠNG */}
                              <td className="w-[125px] p-0 align-middle text-slate-600 border-r border-slate-200">
                                <div className="p-1">
                                  {(() => {
                                    const status = plan.techSpecStatus || '';
                                    let style = 'border-slate-200 bg-slate-50 text-slate-500';
                                    if (status === 'Đáp ứng') style = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                                    else if (status === 'Chưa đáp ứng') style = 'border-red-200 bg-red-50 text-red-700';
                                    else if (status === 'Đang xem xét') style = 'border-amber-200 bg-amber-50 text-amber-700';
                                    return (
                                      <CustomSelect
                                        value={status}
                                        onChange={(e) => { onUpdateMaterial(plan.id, { ...plan, techSpecStatus: e.target.value }) }}
                                        className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${style}`}
                                      >
                                        <option value="">Chưa xác định</option>
                                        <option value="Đáp ứng">Đáp ứng</option>
                                        <option value="Chưa đáp ứng">Chưa đáp ứng</option>
                                        <option value="Đang xem xét">Đang xem xét</option>
                                      </CustomSelect>
                                    );
                                  })()}
                                </div>
                              </td>
                            

                              {/* KL ĐẶT HÀNG */}
                              <td className="p-0 align-middle text-center font-mono font-semibold text-slate-900 border-r border-slate-200 whitespace-normal break-words leading-tight">
                                {editingCell?.id === plan.id && editingCell?.field === 'orderedVolume' && !editingCell.isPurchasing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => startEditing(plan.id, 'orderedVolume', plan.orderedVolume)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5" title={showNumber(plan.orderedVolume)}>{showNumber(plan.orderedVolume)}</span>
                                )}
                              </td>
                              {/* TT ĐẶT HÀNG */}
                              <td className="p-0 align-middle text-center border-r border-slate-200">
                                <div className="p-1">
                                  {(() => {
                                    const currentStatus = plan.orderedStatus || '';
                                    const btnStyle = getStatusColorStyle(currentStatus);
                                    return (
                                      <CustomSelect
                                        value={currentStatus}
                                        onChange={(e) => { onUpdateMaterial(plan.id, { ...plan, orderedStatus: e.target.value }) }}
                                        className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${btnStyle}`}
                                      >
                                        {PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className={getStatusColorStyle(opt)}>{opt}</option>)}
                                      </CustomSelect>
                                    );
                                  })()}
                                </div>
                              </td>
                              {/* NGÀY CÓ HÀNG */}
                              <td className="p-0 align-middle text-center font-mono text-slate-600 truncate border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'expectedDate' && !editingCell.isPurchasing ? (
                                  <input
                                    type="date"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => startEditing(plan.id, 'expectedDate', plan.expectedDate)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5">{plan.expectedDate || ''}</span>
                                )}
                              </td>
                              
</>
)}

                          {subTab === 'DOCS' && (
                            <>
                              {/* CHỨNG TỪ HÀNG HÓA (Combined CO, CQ, PCCC, Tem KĐ) */}
                              <td className="w-[160px] p-0 align-middle border-r border-slate-200 relative group/docs">
                                <div className="flex flex-row flex-wrap gap-x-2 gap-y-2 p-1.5 w-full items-center justify-center cursor-pointer min-h-[34px]">
                                  {plan.docCo && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CO</span>
                                  )}
                                  {plan.docCq && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CQ</span>
                                  )}
                                  {plan.docFireInspection && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">PCCC</span>
                                  )}
                                  {plan.docStamp && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">Tem KĐ</span>
                                  )}
                                  {!plan.docCo && !plan.docCq && !plan.docFireInspection && !plan.docStamp && (
                                    <span className="text-slate-400 text-xs italic group-hover/docs:opacity-0 transition-opacity">--</span>
                                  )}
                                  
                                  {/* Dropdown Menu Toggle */}
                                  {userRole !== 'engineer' && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/docs:opacity-100 transition-opacity">
                                      <div className="relative group/dropdown">
                                        <button type="button" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200 bg-white shadow-sm">
                                          <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                                        </button>
                                        <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 hidden group-hover/dropdown:block z-50 text-left">
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCo} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docCo: e.target.checked })} />
                                            CO
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCq} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docCq: e.target.checked })} />
                                            CQ
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docFireInspection} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docFireInspection: e.target.checked })} />
                                            PCCC
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docStamp} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docStamp: e.target.checked })} />
                                            Tem kiểm định
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                            </>
                          )}

                          {subTab === 'FINANCE' && (
                            <>
                              {/* KL ĐH */}
                              <td className="p-0 align-middle text-center font-mono text-slate-600 border-r border-slate-200 leading-tight">
                                {editingCell?.id === plan.id && editingCell?.field === 'volumeOrder' && editingCell?.isPurchasing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => pRecord && startEditing(plan.id, 'volumeOrder', pRecord.volumeOrder, true)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5" title={showNumber(pRecord?.volumeOrder)}>{showNumber(pRecord?.volumeOrder) || '-'}</span>
                                )}
                              </td>
                              {/* ĐƠN GIÁ MUA */}
                              <td className="p-0 align-middle text-right font-mono text-slate-600 border-r border-slate-200 leading-tight">
                                {editingCell?.id === plan.id && editingCell?.field === 'unitPrice' && editingCell?.isPurchasing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-right bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => pRecord && startEditing(plan.id, 'unitPrice', pRecord.unitPrice, true)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-end px-1.5 py-1.5" title={showNumber(pRecord?.unitPrice)}>{showNumber(pRecord?.unitPrice) || '-'}</span>
                                )}
                              </td>
                              {/* VAT % */}
                              <td className="p-0 align-middle text-center font-mono text-slate-600 border-r border-slate-200 leading-tight">
                                {editingCell?.id === plan.id && editingCell?.field === 'vatRate' && editingCell?.isPurchasing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => pRecord && startEditing(plan.id, 'vatRate', pRecord.vatRate, true)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5" title={showNumber(pRecord?.vatRate)}>{pRecord?.vatRate !== undefined ? `${pRecord.vatRate}%` : '-'}</span>
                                )}
                              </td>
                              {/* TIỀN VAT */}
                              <td className="p-1.5 align-middle text-right font-mono text-slate-500 border-r border-slate-200 leading-tight">
                                {showNumber(pRecord?.vatAmount) || '-'}
                              </td>
                              {/* THÀNH TIỀN MUA */}
                              <td className="p-1.5 align-middle text-right font-mono font-bold text-slate-800 border-r border-slate-200 leading-tight">
                                {showNumber(pRecord?.totalAmount) || '-'}
                              </td>
                              {/* % TẠM ỨNG */}
                              <td className="p-0 align-middle text-center font-mono text-slate-600 border-r border-slate-200 leading-tight">
                                {editingCell?.id === plan.id && editingCell?.field === 'prepayPercent' && editingCell?.isPurchasing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => pRecord && startEditing(plan.id, 'prepayPercent', pRecord.prepayPercent, true)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5" title={showNumber(pRecord?.prepayPercent)}>{pRecord?.prepayPercent !== undefined ? `${pRecord.prepayPercent}%` : '-'}</span>
                                )}
                              </td>
                              {/* THỰC CHI */}
                              <td className="p-0 align-middle text-right font-mono text-slate-600 border-r border-slate-200 leading-tight">
                                {editingCell?.id === plan.id && editingCell?.field === 'prepayAmount' && editingCell?.isPurchasing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-right bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => pRecord && startEditing(plan.id, 'prepayAmount', pRecord.prepayAmount, true)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-end px-1.5 py-1.5" title={showNumber(pRecord?.prepayAmount)}>{showNumber(pRecord?.prepayAmount) || '-'}</span>
                                )}
                              </td>
                              {/* CÒN LẠI */}
                              <td className="p-1.5 align-middle text-right font-mono text-slate-500 border-r border-slate-200 leading-tight">
                                {pRecord ? showNumber((pRecord.totalAmount || 0) - (pRecord.prepayAmount || 0)) : '-'}
                              </td>

                              {/* TÌNH TRẠNG HĐ */}
                              <td className="p-1 align-middle text-center border-r border-slate-200">
                                <CustomSelect
                                  value={pRecord?.contractStatus || 'Chưa ký'}
                                  onChange={(e) => { if (pRecord) onUpdatePurchasing(pRecord.id, { ...pRecord, contractStatus: e.target.value }) }}
                                  className={`w-full font-bold text-[11px] px-1.5 py-1 border border-slate-200 rounded-md focus:outline-primary ${getStatusColorStyle(pRecord?.contractStatus || 'Chưa ký')}`}
                                >
                                  <option value="Chưa ký" className={getStatusColorStyle('Chưa ký')}>Chưa ký</option>
                                  <option value="Đã ký" className={getStatusColorStyle('Đã ký')}>Đã ký</option>
                                  <option value="Đang thương thảo" className={getStatusColorStyle('Đang thương thảo')}>Đang thương thảo</option>
                                </CustomSelect>
                              </td>
                              {/* HẠN THANH TOÁN */}
                              <td className="p-0 align-middle text-center font-mono text-slate-600 truncate border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'paymentDate' && editingCell?.isPurchasing ? (
                                  <input
                                    type="date"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => pRecord && startEditing(plan.id, 'paymentDate', pRecord.paymentDate, true)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5">{pRecord?.paymentDate || ''}</span>
                                )}
                              </td>
                              {/* HÓA ĐƠN VAT */}
                              <td className="p-1 align-middle text-center border-r border-slate-200">
                                <CustomSelect
                                  value={pRecord?.invoiceStatus || 'Chưa xuất'}
                                  onChange={(e) => { if (pRecord) onUpdatePurchasing(pRecord.id, { ...pRecord, invoiceStatus: e.target.value }) }}
                                  className={`w-full font-bold text-[11px] px-1.5 py-1 border border-slate-200 rounded-md focus:outline-primary ${getStatusColorStyle(pRecord?.invoiceStatus || 'Chưa xuất')}`}
                                >
                                  <option value="Chưa xuất" className={getStatusColorStyle('Chưa xuất')}>Chưa xuất</option>
                                  <option value="Đã xuất" className={getStatusColorStyle('Đã xuất')}>Đã xuất</option>
                                  <option value="Không cần VAT" className={getStatusColorStyle('Không cần VAT')}>Không cần VAT</option>
                                </CustomSelect>
                              </td>
                            </>
                          )}

                          {subTab !== 'TECH' ? (
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 align-middle text-slate-500">
                              {editingCell?.id === plan.id && editingCell?.field === 'notes' && editingCell.isPurchasing === (subTab === 'FINANCE') ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full bg-white text-slate-500 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                />
                              ) : (
                                <div onClick={() => {
                                  if (subTab === 'FINANCE') {
                                    if (pRecord) startEditing(plan.id, 'notes', cleanNotes(pRecord.notes) || '', true);
                                  } else {
                                    startEditing(plan.id, 'notes', cleanDocNotes(plan.notes), false);
                                  }
                                }} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={subTab === 'FINANCE' ? cleanNotes(pRecord?.notes) : cleanDocNotes(plan.notes)}>
                                  <span className="truncate flex-1">{subTab === 'FINANCE' ? cleanNotes(pRecord?.notes) : cleanDocNotes(plan.notes)}</span>
                                </div>
                              )}
                            </td>
                          ) : (
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-1 align-middle text-slate-500 min-w-[200px]">
                              <div className="flex flex-col gap-1.5 w-full text-xs">
                                {/* Vướng mắc */}
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[10px] font-bold text-red-500 w-12 shrink-0 mt-0.5" title="Nội dung vướng mắc">V.MẮC:</span>
                                  <div className="flex-1 bg-slate-50 rounded">
                                    {editingCell?.id === plan.id && editingCell?.field === 'issueContent' ? (
                                      <input
                                        type="text"
                                        list="issueContent-options"
                                        value={tempValue}
                                        onChange={(e) => setTempValue(e.target.value)}
                                        onBlur={() => saveEditing(plan, pRecord)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                        autoFocus
                                        placeholder="Nhập hoặc chọn..."
                                        className="w-full bg-white text-red-600 font-semibold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm border border-slate-200 rounded"
                                      />
                                    ) : (
                                      <div onClick={() => startEditing(plan.id, 'issueContent', plan.issueContent)} className="min-h-[20px] cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded text-red-600 font-semibold whitespace-normal break-words leading-tight" title={getIssueContentText(plan.issueContent) || 'Click để nhập'}>
                                        {getIssueContentText(plan.issueContent) || <span className="text-slate-300 italic">...</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* TT Xử lý */}
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[10px] font-bold text-orange-500 w-12 shrink-0 mt-0.5" title="Trạng thái xử lý">XỬ LÝ:</span>
                                  <div className="flex-1 bg-slate-50 rounded">
                                    {editingCell?.id === plan.id && editingCell?.field === 'issueStatus' ? (
                                      <input
                                        type="text"
                                        list="issueStatus-options"
                                        value={tempValue}
                                        onChange={(e) => setTempValue(e.target.value)}
                                        onBlur={() => saveEditing(plan, pRecord)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                        autoFocus
                                        placeholder="Nhập hoặc chọn..."
                                        className="w-full bg-white text-orange-600 font-semibold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm border border-slate-200 rounded"
                                      />
                                    ) : (
                                      <div onClick={() => startEditing(plan.id, 'issueStatus', plan.issueStatus)} className="min-h-[20px] cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded text-orange-600 font-semibold whitespace-normal break-words leading-tight" title={plan.issueStatus || 'Click để nhập'}>
                                        {plan.issueStatus || <span className="text-slate-300 italic">...</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Ghi chú */}
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 w-12 shrink-0 mt-0.5" title="Ghi chú">NOTE:</span>
                                  <div className="flex-1 bg-slate-50 rounded">
                                    {editingCell?.id === plan.id && editingCell?.field === 'notes' ? (
                                      <input
                                        type="text"
                                        value={tempValue}
                                        onChange={(e) => setTempValue(e.target.value)}
                                        onBlur={() => saveEditing(plan, pRecord)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                        autoFocus
                                        placeholder="Nhập ghi chú..."
                                        className="w-full bg-white text-slate-700 focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm border border-slate-200 rounded"
                                      />
                                    ) : (
                                      <div onClick={() => startEditing(plan.id, 'notes', cleanTechNotes(plan.notes))} className="min-h-[20px] cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded text-slate-700 whitespace-normal break-words leading-tight" title={cleanTechNotes(plan.notes) || 'Click để nhập'}>
                                        {cleanTechNotes(plan.notes) || <span className="text-slate-300 italic">...</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                      </tr>
                      );
                    })}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
