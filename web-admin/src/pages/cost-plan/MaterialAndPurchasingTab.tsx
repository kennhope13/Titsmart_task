import React, { useMemo, useState } from 'react';
import { ProjectMaterialPlan, ProjectPurchasing, getStatusColorStyle, PURCHASE_STATUS_OPTIONS, CONSTRUCTION_STATUS_OPTIONS } from '../../types';
import { CustomSelect } from '@/components/common/CustomSelect';

interface MaterialAndPurchasingTabProps {
  data: ProjectMaterialPlan[];
  purchasingData: ProjectPurchasing[];
  onEditMaterial: (plan: ProjectMaterialPlan) => void;
  onEditPurchasing: (plan: ProjectPurchasing, subTab: 'PRICING' | 'PAYMENT') => void;
  onDelete: (id: string) => void;
  onUpdateMaterial: (id: string, plan: Partial<ProjectMaterialPlan>) => void | Promise<void>;
  onUpdatePurchasing: (id: string, plan: Partial<ProjectPurchasing>) => void | Promise<void>;
  onAddSubtask?: (plan: ProjectMaterialPlan, suggestedStt?: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  userRole?: string;
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

const showNumber = (value?: number) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
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
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  userRole
}) => {
  const [subTab, setSubTab] = useState<'TECH' | 'ORDER' | 'DOCS' | 'PRICING' | 'PAYMENT'>('TECH');
  const [filterParent, setFilterParent] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterProgress, setFilterProgress] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterConstruction, setFilterConstruction] = useState('all');

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
  const constructionOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.techSpecStatus).filter(Boolean)))], [data]);

  const [editingCell, setEditingCell] = useState<{ id: string; field: string; isPurchasing: boolean } | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

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
          const diff = (ka[i] ?? Infinity) - (kb[i] ?? Infinity);
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
    if (filterConstruction !== 'all') {
      filtered = filtered.filter(p => p.techSpecStatus === filterConstruction || isParentRow(p));
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
        const diff = (ap[i] ?? Infinity) - (bp[i] ?? Infinity);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    return { filteredData: sortedFiltered, resolveParentId, getSectionIndexForItem };
  }, [data, searchQuery, statusFilter, filterParent, filterUnit, filterProgress, filterOrder, filterConstruction]);

  const startEditing = (id: string, field: string, value: any, isPurchasing = false) => {
    if (userRole === 'engineer') return;
    setEditingCell({ id, field, isPurchasing });
    setTempValue(value === undefined || value === null ? '' : value);
  };

  const saveEditing = (plan: ProjectMaterialPlan, pRecord?: ProjectPurchasing) => {
    if (!editingCell) return;
    const { id, field, isPurchasing } = editingCell;
    let finalValue = tempValue;

    if (isPurchasing) {
      if (pRecord) {
        if (field === 'volumeOrder' || field === 'unitPrice' || field === 'vatRate' || field === 'prepayPercent' || field === 'prepayAmount') {
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
      if (field === 'notes') {
        const existingTags = String(plan.notes || '').match(/(\[order:[\d.]+\]|\[section\]|\[contractor\]|\[owner\])/gi) || [];
        finalValue = [...existingTags, typeof tempValue === 'string' ? tempValue.trim() : tempValue].filter(Boolean).join(' | ');
      } else if (field === 'contractVolume' || field === 'orderedVolume') {
        finalValue = Number(tempValue || 0);
      } else if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
        finalValue = tempValue === true || tempValue === 'true' || tempValue === 'Có';
      }
      onUpdateMaterial(id, { ...plan, [field]: finalValue });
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
    if (subTab === 'TECH') return 4;
    if (subTab === 'ORDER') return 5;
    if (subTab === 'DOCS') return 5;
    if (subTab === 'PRICING') return 7;
    if (subTab === 'PAYMENT') return 6;
    return 4;
  }, [subTab]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-col border-b border-slate-200 sticky top-0 z-10 bg-slate-50">
        <div className="flex px-4 gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setSubTab('TECH')}
            className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap font-bold text-xs ${subTab === 'TECH' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            Kỹ thuật
          </button>
          <button
            onClick={() => setSubTab('ORDER')}
            className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap font-bold text-xs ${subTab === 'ORDER' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            Đặt hàng & Logistics
          </button>
          <button
            onClick={() => setSubTab('DOCS')}
            className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap font-bold text-xs ${subTab === 'DOCS' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            Chứng từ
          </button>
          {userRole !== 'engineer' && (
            <>
              <button
                onClick={() => setSubTab('PRICING')}
                className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap font-bold text-xs ${subTab === 'PRICING' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
              >
                Giá mua & Dự toán
              </button>
              <button
                onClick={() => setSubTab('PAYMENT')}
                className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap font-bold text-xs ${subTab === 'PAYMENT' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
              >
                Thanh toán & Hóa đơn
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-slate-500 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
          </div>
          
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-1">
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
            
            <div className="flex items-center gap-1">
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

            {subTab === 'TECH' && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Tiến độ:</span>
                  <CustomSelect
                    value={filterProgress}
                    onChange={e => setFilterProgress(e.target.value)}
                    className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                  >
                    {progressOptions.map(opt => (
                      <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                    ))}
                  </CustomSelect>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Kỹ thuật:</span>
                  <CustomSelect
                    value={filterConstruction}
                    onChange={e => setFilterConstruction(e.target.value)}
                    className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                  >
                    {constructionOptions.map(opt => (
                      <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                    ))}
                  </CustomSelect>
                </div>
              </>
            )}

            {(subTab === 'ORDER' || subTab === 'PRICING') && (
              <div className="flex items-center gap-1">
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
          </div>
        </div>
      </div>

      <div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full table-fixed border-collapse text-left text-xs" style={{ "--stt-width": `${maxSttWidth}px` } as React.CSSProperties}>
          <thead className="sticky top-0 z-30 border-b border-slate-300 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr className="bg-slate-50">
              <th rowSpan={2} style={{ minWidth: 50, width: "var(--stt-width)", borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold whitespace-nowrap">STT</th>
              <th rowSpan={2} style={{ minWidth: 280, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8', left: "var(--stt-width)" }} className="sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left ">NỘI DUNG</th>
              <th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">MÃ HIỆU</th>
              <th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">XUẤT XỨ</th>
              <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">ĐVT</th>
              <th rowSpan={2} style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">KL HĐ</th>

              {subTab === 'TECH' && (
                <>
                  <th colSpan={3} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TIÊU CHUẨN KỸ THUẬT</th>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TIẾN ĐỘ</th>
                </>
              )}

              {subTab === 'ORDER' && (
                <>
                  <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL ĐẶT HÀNG</th>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TT ĐẶT HÀNG</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">NGÀY CÓ HÀNG</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">VƯỚNG MẮC/ TỒN ĐỌNG</th>
                </>
              )}

              {subTab === 'DOCS' && (
                <>
                  <th colSpan={3} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">LUÂN CHUYỂN VẬT TƯ</th>
                </>
              )}

              {subTab === 'PRICING' && (
                <>
                  <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL ĐH</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">ĐƠN GIÁ MUA</th>
                  <th rowSpan={2} style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">VAT %</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">TIỀN VAT</th>
                  <th rowSpan={2} style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">THÀNH TIỀN MUA</th>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">TRẠNG THÁI ĐH</th>
                  <th rowSpan={2} style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">TÌNH TRẠNG HĐ</th>
                </>
              )}

              {subTab === 'PAYMENT' && (
                <>
                  <th rowSpan={2} style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">THÀNH TIỀN MUA</th>
                  <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">% TẠM ỨNG</th>
                  <th rowSpan={2} style={{ width: 95, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">THỰC CHI (đ)</th>
                  <th rowSpan={2} style={{ width: 95, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">CÒN LẠI (đ)</th>
                  <th rowSpan={2} style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">HẠN THANH TOÁN</th>
                  <th rowSpan={2} style={{ width: 120, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">HÓA ĐƠN VAT</th>
                </>
              )}

              <th rowSpan={2} style={{ width: 110, borderBottom: '1px solid #94a3b8' }} className="sticky right-0 z-20 bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">GHI CHÚ</th>
            </tr>
            <tr className="bg-slate-50">
              {subTab === 'TECH' && (
                <>
                  <th style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">CHÀO HÀNG</th>
                  <th style={{ width: 90, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">ĐÁP ỨNG KỸ THUẬT</th>
                  <th style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">TÌNH TRẠNG</th>
                </>
              )}
              {subTab === 'ORDER' && (
                <>
                  <th style={{ width: 110, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">NỘI DUNG</th>
                  <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">TT XỬ LÝ</th>
                </>
              )}
              {subTab === 'DOCS' && (
                <>
                  <th style={{ width: 40, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">CO</th>
                  <th style={{ width: 40, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">CQ</th>
                  <th style={{ width: 60, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">KIỂM ĐỊNH PCCC</th>
                  <th style={{ width: 60, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">ĐÃ GỬI TỚI CT</th>
                  <th style={{ width: 60, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight">NGÀY</th>
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
                return <tr><td colSpan={colSpanCount + 6} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td></tr>;
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
                            <td colSpan={colSpanCount + 5} className="bg-blue-50/90 px-2 py-1.5 uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap" title={plan.jobContent}>
                              <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleSection(plan._sectionKey || ''); }}
                                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                                  title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                                >
                                  <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                                </button>
                                <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                                <span className="truncate flex-1 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onEditMaterial?.(plan); }}>{plan.jobContent}</span>
                                {onAddSubtask && (
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
                      
                      const rowClass = `group transition-colors border-b border-slate-50 ${rowBg} hover:bg-slate-100`;
                      const paddingLeft = `${depth * 1.5}rem`;

                      return (
                        <tr key={plan.id} onDoubleClick={() => onEditMaterial(plan)} className={rowClass}>
                          {/* STT */}
                          <td className={`sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-200 p-0 align-top text-center font-mono whitespace-nowrap overflow-hidden ${sttStyle}`}>
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
                          <td className={`sticky z-10 ${stickyBg} group-hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 p-0 align-top text-left overflow-hidden ${fontStyle}`} style={{ left: "var(--stt-width)" }}>
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
                              <div className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden whitespace-nowrap" style={{ paddingLeft }}>
                                {depth > 1 && (
                                  <span className="material-symbols-outlined flex-shrink-0 text-slate-300 text-[14px] mr-1 translate-y-[1px]">
                                    subdirectory_arrow_right
                                  </span>
                                )}
                                <span onClick={() => startEditing(plan.id, 'jobContent', plan.jobContent)} className="cursor-pointer hover:bg-slate-100 flex-1 px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center whitespace-normal break-words leading-tight" title={plan.jobContent}>
                                  {plan.jobContent}
                                </span>
                                
                                <div className="flex items-center ml-1 transition-opacity">
                                  {onAddSubtask && (
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

                          {/* MÃ HIỆU */}
                          <td className="p-0 align-top text-center text-slate-600 border-r border-slate-200 whitespace-normal break-words leading-tight" title={plan.techSpecModel || ""}>
                            {editingCell?.id === plan.id && editingCell?.field === "techSpecModel" && !editingCell.isPurchasing ? (
                              <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveEditing(plan, pRecord)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditing(plan, pRecord); if (e.key === "Escape") setEditingCell(null); }}
                                autoFocus
                                className="w-full text-center bg-white text-slate-900 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                              />
                            ) : (
                              <span onClick={() => startEditing(plan.id, "techSpecModel", plan.techSpecModel)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-1 block w-full truncate max-w-[100px]">{plan.techSpecModel || "-"}</span>
                            )}
                          </td>

                          {/* XUẤT XỨ */}
                          <td className="p-0 align-top text-center text-slate-600 border-r border-slate-200 whitespace-normal break-words leading-tight" title={plan.techSpecOrigin || ""}>
                            {editingCell?.id === plan.id && editingCell?.field === "techSpecOrigin" && !editingCell.isPurchasing ? (
                              <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveEditing(plan, pRecord)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditing(plan, pRecord); if (e.key === "Escape") setEditingCell(null); }}
                                autoFocus
                                className="w-full text-center bg-white text-slate-900 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                              />
                            ) : (
                              <span onClick={() => startEditing(plan.id, "techSpecOrigin", plan.techSpecOrigin)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-1 block w-full truncate max-w-[100px]">{plan.techSpecOrigin || "-"}</span>
                            )}
                          </td>

                          {/* ĐVT */}
                          <td className="p-0 align-top text-center font-mono text-slate-500 border-r border-slate-200 whitespace-normal break-words leading-tight">
                            {editingCell?.id === plan.id && editingCell?.field === 'unit' && !editingCell.isPurchasing ? (
                              <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveEditing(plan, pRecord)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                autoFocus
                                className="w-full text-center bg-white text-slate-900 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                              />
                            ) : (
                              <span onClick={() => startEditing(plan.id, 'unit', plan.unit)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 flex items-center whitespace-normal break-words leading-tight" title={plan.unit || ''}>{plan.unit || ''}</span>
                            )}
                          </td>

                          {/* KL HĐ */}
                          <td className="p-0 align-top text-center font-mono font-semibold text-slate-900 border-r border-slate-200 whitespace-normal break-words leading-tight">
                            {editingCell?.id === plan.id && editingCell?.field === 'contractVolume' && !editingCell.isPurchasing ? (
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
                              <span onClick={() => startEditing(plan.id, 'contractVolume', plan.contractVolume)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5" title={showNumber(plan.contractVolume)}>{showNumber(plan.contractVolume)}</span>
                            )}
                          </td>

                          {/* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB */}
                          {subTab === 'TECH' && (
                            <>
                              {/* CHÀO HÀNG */}
                              <td className="p-0 align-top text-slate-600 border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'techSpecModel' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => startEditing(plan.id, 'techSpecModel', plan.techSpecModel)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 flex items-center whitespace-normal break-words leading-tight" title={plan.techSpecModel || ''}>{plan.techSpecModel || ''}</span>
                                )}
                              </td>
                              {/* ĐÁP ỨNG KỸ THUẬT */}
                              <td className="p-0 align-top text-slate-600 border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'techSpecOrigin' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => startEditing(plan.id, 'techSpecOrigin', plan.techSpecOrigin)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 flex items-center whitespace-normal break-words leading-tight" title={plan.techSpecOrigin || ''}>{plan.techSpecOrigin || ''}</span>
                                )}
                              </td>
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
                              {/* TIẾN ĐỘ */}
                              <td className="w-[125px] p-0 align-middle text-center font-mono font-bold text-slate-700 whitespace-nowrap border-r border-slate-200">
                                <div className="p-1">
                                  {(() => {
                                    const status = plan.progressStatus || '';
                                    let style = 'border-slate-200 bg-slate-50 text-slate-500';
                                    if (status === 'Đã hoàn thành') style = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                                    else if (status === 'Đang thi công') style = 'border-blue-200 bg-blue-50 text-blue-700';
                                    return (
                                      <CustomSelect
                                        value={status}
                                        onChange={(e) => { onUpdateMaterial(plan.id, { ...plan, progressStatus: e.target.value }) }}
                                        className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${style}`}
                                      >
                                        {CONSTRUCTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className={getStatusColorStyle(opt)}>{opt}</option>)}
                                      </CustomSelect>
                                    );
                                  })()}
                                </div>
                              </td>
                            </>
                          )}

                          {subTab === 'ORDER' && (
                            <>
                              {/* KL ĐẶT HÀNG */}
                              <td className="p-0 align-top text-center font-mono font-semibold text-slate-900 border-r border-slate-200 whitespace-normal break-words leading-tight">
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
                              <td className="p-0 align-top text-center font-mono text-slate-600 truncate border-r border-slate-200">
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
                              {/* NỘI DUNG VƯỚNG MẮC */}
                              <td className="p-0 align-top font-semibold text-red-600 border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'issueContent' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full bg-white text-red-600 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => startEditing(plan.id, 'issueContent', plan.issueContent)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 flex items-center whitespace-normal break-words leading-tight" title={plan.issueContent || ''}>{plan.issueContent || ''}</span>
                                )}
                              </td>
                              {/* TT XỬ LÝ */}
                              <td className="p-0 align-top text-slate-600 border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'issueStatus' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <span onClick={() => startEditing(plan.id, 'issueStatus', plan.issueStatus)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 flex items-center whitespace-normal break-words leading-tight" title={plan.issueStatus || ''}>{plan.issueStatus || ''}</span>
                                )}
                              </td>
                            </>
                          )}

                          {subTab === 'DOCS' && (
                            <>
                              {/* CO */}
                              <td className="p-0 align-top text-center border-r border-slate-200">
                                <button
                                  type="button"
                                  disabled={userRole === 'engineer'}
                                  onClick={() => onUpdateMaterial(plan.id, { ...plan, docCo: !plan.docCo })}
                                  className="flex items-center justify-center w-full h-[34px] transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.docCo ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" fill={plan.docCo ? '#d1fae5' : '#f8fafc'} />
                                    <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </td>
                              {/* CQ */}
                              <td className="p-0 align-top text-center border-r border-slate-200">
                                <button
                                  type="button"
                                  disabled={userRole === 'engineer'}
                                  onClick={() => onUpdateMaterial(plan.id, { ...plan, docCq: !plan.docCq })}
                                  className="flex items-center justify-center w-full h-[34px] transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.docCq ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" fill={plan.docCq ? '#d1fae5' : '#f8fafc'} />
                                    <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </td>
                              {/* KIỂM ĐỊNH PCCC */}
                              <td className="p-0 align-top text-center border-r border-slate-200">
                                <button
                                  type="button"
                                  disabled={userRole === 'engineer'}
                                  onClick={() => onUpdateMaterial(plan.id, { ...plan, docFireInspection: !plan.docFireInspection })}
                                  className="flex items-center justify-center w-full h-[34px] transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.docFireInspection ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" fill={plan.docFireInspection ? '#d1fae5' : '#f8fafc'} />
                                    <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </td>
                              {/* ĐÃ GỬI TỚI CT */}
                              <td className="p-0 align-top text-center border-r border-slate-200">
                                <button
                                  type="button"
                                  disabled={userRole === 'engineer'}
                                  onClick={() => onUpdateMaterial(plan.id, { ...plan, dispatchToSite: !plan.dispatchToSite })}
                                  className="flex items-center justify-center w-full h-[34px] transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.dispatchToSite ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" fill={plan.dispatchToSite ? '#d1fae5' : '#f8fafc'} />
                                    <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </td>
                              {/* NGÀY */}
                              <td className="p-0 align-top text-center font-mono text-slate-600 truncate border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'dispatchDate' && !editingCell.isPurchasing ? (
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
                                  <span onClick={() => startEditing(plan.id, 'dispatchDate', plan.dispatchDate)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5">{plan.dispatchDate || ''}</span>
                                )}
                              </td>
                            </>
                          )}

                          {subTab === 'PRICING' && (
                            <>
                              {/* KL ĐH */}
                              <td className="p-0 align-top text-center font-mono text-slate-600 border-r border-slate-200 leading-tight">
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
                              <td className="p-0 align-top text-right font-mono text-slate-600 border-r border-slate-200 leading-tight">
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
                              <td className="p-0 align-top text-center font-mono text-slate-600 border-r border-slate-200 leading-tight">
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
                              <td className="p-1.5 align-top text-right font-mono text-slate-500 border-r border-slate-200 leading-tight">
                                {showNumber(pRecord?.vatAmount) || '-'}
                              </td>
                              {/* THÀNH TIỀN MUA */}
                              <td className="p-1.5 align-top text-right font-mono font-bold text-slate-800 border-r border-slate-200 leading-tight">
                                {showNumber(pRecord?.totalAmount) || '-'}
                              </td>
                              {/* TRẠNG THÁI ĐH */}
                              <td className="p-1 align-middle text-center border-r border-slate-200">
                                <CustomSelect
                                  value={pRecord?.orderStatus || 'Chưa đặt hàng'}
                                  onChange={(e) => { if (pRecord) onUpdatePurchasing(pRecord.id, { ...pRecord, orderStatus: e.target.value }) }}
                                  className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${getStatusColorStyle(pRecord?.orderStatus || '')}`}
                                >
                                  {PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className={getStatusColorStyle(opt)}>{opt}</option>)}
                                </CustomSelect>
                              </td>
                              {/* TÌNH TRẠNG HĐ */}
                              <td className="p-1 align-middle text-center border-r border-slate-200">
                                <CustomSelect
                                  value={pRecord?.contractStatus || 'Chưa ký'}
                                  onChange={(e) => { if (pRecord) onUpdatePurchasing(pRecord.id, { ...pRecord, contractStatus: e.target.value }) }}
                                  className="w-full font-bold text-[11px] px-1.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-primary"
                                >
                                  <option value="Chưa ký">Chưa ký</option>
                                  <option value="Đã ký">Đã ký</option>
                                  <option value="Đang thương thảo">Đang thương thảo</option>
                                </CustomSelect>
                              </td>
                            </>
                          )}

                          {subTab === 'PAYMENT' && (
                            <>
                              {/* THÀNH TIỀN MUA */}
                              <td className="p-1.5 align-top text-right font-mono font-bold text-slate-800 border-r border-slate-200 leading-tight">
                                {showNumber(pRecord?.totalAmount) || '-'}
                              </td>
                              {/* % TẠM ỨNG */}
                              <td className="p-0 align-top text-center font-mono text-slate-600 border-r border-slate-200 leading-tight">
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
                              <td className="p-0 align-top text-right font-mono text-slate-600 border-r border-slate-200 leading-tight">
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
                              <td className="p-1.5 align-top text-right font-mono text-slate-500 border-r border-slate-200 leading-tight">
                                {pRecord ? showNumber((pRecord.totalAmount || 0) - (pRecord.prepayAmount || 0)) : '-'}
                              </td>
                              {/* HẠN THANH TOÁN */}
                              <td className="p-0 align-top text-center font-mono text-slate-600 truncate border-r border-slate-200">
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
                                  className="w-full font-bold text-[11px] px-1.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-primary"
                                >
                                  <option value="Chưa xuất">Chưa xuất</option>
                                  <option value="Đã xuất">Đã xuất</option>
                                  <option value="Không cần VAT">Không cần VAT</option>
                                </CustomSelect>
                              </td>
                            </>
                          )}

                          {/* GHI CHÚ */}
                          <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 align-top text-slate-500">
                            {editingCell?.id === plan.id && editingCell?.field === 'notes' && !editingCell.isPurchasing ? (
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
                              <div onClick={() => startEditing(plan.id, 'notes', cleanNotes(plan.notes))} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={cleanNotes(plan.notes)}>
                                <span className="truncate flex-1">{cleanNotes(plan.notes)}</span>
                              </div>
                            )}
                          </td>
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
