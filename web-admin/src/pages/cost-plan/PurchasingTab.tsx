import React from 'react';
import { ProjectPurchasing, getStatusColorStyle, PURCHASE_STATUS_OPTIONS } from '../../types';
import { CustomSelect } from '@/components/common/CustomSelect';

interface PurchasingTabProps {
  data: ProjectPurchasing[];
  onEdit: (plan: ProjectPurchasing, subTab: 'PRICING' | 'PAYMENT') => void;
  onUpdate: (id: string, plan: Partial<ProjectPurchasing>) => void | Promise<void>;
  onDelete: (id: string) => void;
  onAddSubtask?: (plan: ProjectPurchasing, suggestedStt?: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}

const money = (value: unknown) => Number(value || 0).toLocaleString('vi-VN');
const numberText = (value: unknown) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
};
const percentText = (value: unknown) => {
  const n = Number(value || 0);
  if (!n) return '';
  return n <= 1 ? `${Math.round(n * 100)}%` : `${n}%`;
};
const isSectionRow = (pur: ProjectPurchasing) => String(pur.notes || '').toLowerCase().includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(pur.stt || '').trim());
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
const computedVat = (pur: ProjectPurchasing) => Number(pur.vatAmount || 0) || (Number(pur.volumeOrder || 0) * Number(pur.unitPrice || 0) * Number(pur.vatRate || 0)) / 100;
const computedTotal = (pur: ProjectPurchasing) => Number(pur.totalAmount || 0) || (Number(pur.volumeOrder || 0) * Number(pur.unitPrice || 0)) + computedVat(pur);
const computedPayment = (pur: ProjectPurchasing) => Number(pur.prepayAmount || 0) || (computedTotal(pur) * Number(pur.prepayPercent || 0));



const TEXT = {
  searchPlaceholder: 'Tìm kiếm nội dung mua hàng, hợp đồng, hóa đơn, ghi chú...',
  filter: 'Lọc TT đặt hàng:',
  all: 'Tất cả',
  notOrdered: 'Chưa đặt hàng',
  ordered: 'Đã đặt hàng',
  delivering: 'Đang giao hàng',
  received: 'Đã nhận hàng',
  content: 'NỘI DUNG',
  unit: 'ĐVT',
  contractVolume: 'KHỐI LƯỢNG HĐ',
  orderVolume: 'KHỐI LƯỢNG ĐH',
  unitPrice: 'ĐƠN GIÁ',
  vatRate: 'THUẾ VAT',
  vatAmount: 'TIỀN THUẾ',
  total: 'THÀNH TIỀN',
  prepayPercent: '% TẠM ỨNG',
  payment: 'THANH TOÁN',
  orderStatus: 'TT ĐẶT HÀNG',
  contractStatus: 'TT HỢP ĐỒNG',
  paymentDate: 'NGÀY THANH TOÁN',
  invoice: 'HÓA ĐƠN',
  note: 'GHI CHÚ',
  actions: 'THAO TÁC',
  none: 'Chưa',
  edit: 'Chỉnh sửa',
  delete: 'Xóa',
  confirmDelete: 'Xóa hạng mục mua hàng này?',
  empty: 'Không tìm thấy dữ liệu mua hàng phù hợp.',
};

export const PurchasingTab: React.FC<PurchasingTabProps> = ({
  data, onEdit, onDelete, onUpdate, onAddSubtask, searchQuery, setSearchQuery, statusFilter, setStatusFilter
}) => {
  const [subTab, setSubTab] = React.useState<'PRICING' | 'PAYMENT'>('PRICING');
  const [editingCell, setEditingCell] = React.useState<{ id: string; field: keyof ProjectPurchasing } | null>(null);
  const [tempValue, setTempValue] = React.useState<any>('');
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) { next.delete(sectionKey); } else { next.add(sectionKey); }
      return next;
    });
  };

  // Build an order map: assign each item a [sectionIndex, itemStt] composite sort key
  // by doing a single pass over the full data sorted by Roman-numeral sections first.
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
  const isRoman = (s: string) => /^[IVXLCDM]+$/i.test(s.trim()) && romanToInt(s.trim()) > 0;
  const numericSttParts = (stt?: string): number[] => {
    const text = String(stt || '').trim();
    if (!text) return [Infinity];
    return text.split(/[.\-]/).map(p => { const n = parseInt(p, 10); return isNaN(n) ? Infinity : n; });
  };

  // Sort sections by their stt: Roman sections by Roman value, numeric sections
  // by numeric parts (e.g. '33' < '34' < '105'). Strategy: assign each record a
  // composite key (sectionIndex, numericParts) via a single pass over the data.
  const sectionSortKey = (r: ProjectPurchasing): number[] => {
    const stt = String(r.stt || '').trim();
    if (/^[IVXLCDM]+$/i.test(stt)) return [0, romanToInt(stt)];
    return [1, ...numericSttParts(stt)];
  };
  const sectionOrder = new Map<string, number>();
  [...data]
    .filter(r => isSectionRow(r))
    .sort((a, b) => {
      const ka = sectionSortKey(a), kb = sectionSortKey(b);
      for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
        const diff = (ka[i] ?? Infinity) - (kb[i] ?? Infinity);
        if (diff !== 0) return diff;
      }
      return 0;
    })
    .forEach((r, i) => sectionOrder.set(r.id, i));

  // Pass 2: for each non-section item, find its owning section by matching stt range.
  // We assign items to the largest Roman-section-stt that is still ≤ the item position
  // Position = Excel [order:NNN] tag when present (true file order regardless
  // of array order: imports PREPEND records, API returns created_at order);
  // fall back to the array index for records created outside the import flow.
  const orderTagValue = (notes?: string): number | null => {
    const m = String(notes || '').match(/\[order:([\d.]+)\]/);
    return m ? parseFloat(m[1]) : null;
  };
  const originalOrderMap = new Map<string, number>(data.map((r, i) => [r.id, orderTagValue(r.notes) ?? (1000000 - i)]));

  const resolveParentId = (pur: ProjectPurchasing): string | undefined => {
    if (pur.stt && pur.stt.includes('.')) {
      const parts = pur.stt.split('.');
      parts.pop();
      const parentStt = parts.join('.');
      const parentItem = data.find(r => r.stt === parentStt);
      if (parentItem) return parentItem.id;
    }
    return pur.parentId;
  };

  const sectionIndexCache = new Map<string, number>();
  const getSectionIndexForItem = (pur: ProjectPurchasing, visited = new Set<string>()): number => {
    if (sectionIndexCache.has(pur.id)) return sectionIndexCache.get(pur.id)!;
    if (visited.has(pur.id)) return Infinity;
    visited.add(pur.id);

    if (isSectionRow(pur)) {
      const res = sectionOrder.get(pur.id) ?? Infinity;
      sectionIndexCache.set(pur.id, res);
      return res;
    }
    
    const resolvedParentId = resolveParentId(pur);
    if (resolvedParentId) {
      if (sectionOrder.has(resolvedParentId)) {
        const res = sectionOrder.get(resolvedParentId)!;
        sectionIndexCache.set(pur.id, res);
        return res;
      }
      
      const parentItem = data.find(r => r.id === resolvedParentId);
      if (parentItem) {
        const parentSecIdx = getSectionIndexForItem(parentItem, visited);
        if (parentSecIdx !== -1) {
          sectionIndexCache.set(pur.id, parentSecIdx);
          return parentSecIdx;
        }
      }
    }

    // Use originalOrderMap to find the closest preceding section
    // If it's a manually added item (no order tag), it stays at root (-1)
    const hasOrderTag = /\[order:([\d.]+)\]/.test(String(pur.notes || ''));
    if (!hasOrderTag) {
      sectionIndexCache.set(pur.id, Infinity);
      return Infinity;
    }

    const myPos = originalOrderMap.get(pur.id) ?? Infinity;
    let bestSecIdx = Infinity;
    let bestSecPos = -1;
    data.forEach(r => {
      if (isSectionRow(r)) {
        const secPos = originalOrderMap.get(r.id) ?? Infinity;
        if (secPos <= myPos && secPos > bestSecPos) {
          bestSecPos = secPos;
          bestSecIdx = sectionOrder.get(r.id) ?? -1;
        }
      }
    });
    const finalRes = bestSecIdx === -1 ? Infinity : bestSecIdx;
    sectionIndexCache.set(pur.id, finalRes);
    return finalRes;
  };

  const [filterParent, setFilterParent] = React.useState('all');
  const [filterUnit, setFilterUnit] = React.useState('all');
  const [filterOrder, setFilterOrder] = React.useState('all');
  const [filterContract, setFilterContract] = React.useState('all');

  const parentOptions = React.useMemo(() => {
    const parents = data.filter(p => isSectionRow(p));
    return [{ id: 'all', label: 'Tất cả' }, ...parents.map(p => ({ id: p.id, label: p.content }))];
  }, [data]);

  const unitOptions = React.useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.unit).filter(Boolean)))], [data]);
  const orderOptions = React.useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.orderStatus).filter(Boolean)))], [data]);
  const contractOptions = React.useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.contractStatus).filter(Boolean)))], [data]);

  let processedData = [...data];
  if (searchQuery) {
      const q = searchQuery.toLowerCase();
      processedData = processedData.filter(p => 
          p.content?.toLowerCase().includes(q) || 
          p.unit?.toLowerCase().includes(q) || 
          p.notes?.toLowerCase().includes(q)
      );
  }
  if (filterParent !== 'all') {
    processedData = processedData.filter(p => {
      if (p.id === filterParent) return true;
      let currentParentId = resolveParentId(p);
      let safety = 0;
      while (currentParentId && safety < 100) {
        if (currentParentId === filterParent) return true;
        const parentItem = data.find(r => r.id === currentParentId);
        if (!parentItem) break;
        currentParentId = resolveParentId(parentItem);
        safety++;
      }
      return getSectionIndexForItem(p) === sectionOrder.get(filterParent);
    });
  }
  if (filterUnit !== 'all') {
    processedData = processedData.filter(p => isSectionRow(p) || p.unit === filterUnit);
  }
  if (filterOrder !== 'all') {
    processedData = processedData.filter(p => isSectionRow(p) || p.orderStatus === filterOrder);
  }
  if (filterContract !== 'all') {
    processedData = processedData.filter(p => isSectionRow(p) || p.contractStatus === filterContract);
  }

  const filteredData = [...processedData].sort((a, b) => {
      const secA = getSectionIndexForItem(a);
      const secB = getSectionIndexForItem(b);
      if (secA !== secB) return secA - secB;
      // Within same section: section header always first, then items by numeric stt
      const aIsSec = isSectionRow(a) ? 0 : 1;
      const bIsSec = isSectionRow(b) ? 0 : 1;
      if (aIsSec !== bIsSec) return aIsSec - bIsSec;
      const ap = numericSttParts(a.stt), bp = numericSttParts(b.stt);
      for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
        const diff = (ap[i] ?? Infinity) - (bp[i] ?? Infinity);
        if (diff !== 0) return diff;
      }
      return 0;
    });

  const startEditing = (id: string, field: keyof ProjectPurchasing, value: any) => {
    setEditingCell({ id, field });
    if (field === 'prepayPercent') {
      const val = Number(value || 0);
      setTempValue(val <= 1 ? Math.round(val * 100) : val);
    } else {
      setTempValue(value === undefined || value === null ? '' : value);
    }
  };

  const saveEditing = (pur: ProjectPurchasing) => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    let finalValue = tempValue;
    if (
      field === 'volumeContract' ||
      field === 'volumeOrder' ||
      field === 'unitPrice' ||
      field === 'vatRate'
    ) {
      finalValue = Number(tempValue || 0);
    } else if (field === 'prepayPercent') {
      finalValue = Number(tempValue || 0) / 100;
    }

    const updated = {
      ...pur,
      [field]: finalValue
    };

    // Auto recalculate monetary fields
    const contractVol = Number(updated.volumeContract || 0);
    const unitPrice = Number(updated.unitPrice || 0);
    const vat = Number(updated.vatRate || 0);
    const prepayPct = Number(updated.prepayPercent || 0);

    const rawTotal = contractVol * unitPrice;
    const taxAmt = rawTotal * (vat / 100);
    const totalAmt = rawTotal + taxAmt;
    const prepayAmt = totalAmt * prepayPct;
    const remainingAmt = totalAmt - prepayAmt;

    onUpdate(id, {
      ...updated,
      vatAmount: taxAmt,
      totalAmount: totalAmt,
      prepayAmount: prepayAmt,
      remainingAmount: remainingAmt
    });
    setEditingCell(null);
  };

  const colSpanCount = subTab === 'PRICING' ? 11 : 8;

    const maxSttWidth = React.useMemo(() => {
    let maxLen = 3;
    data.forEach(t => {
      const len = String(t.stt || "").length;
      if (len > maxLen) maxLen = len;
    });
    return Math.max(50, maxLen * 7.5 + 16);
  }, [data]);

  return (
    <div className="flex w-full max-w-full h-full min-h-0 flex-col bg-white overflow-hidden">
      {/* Sub Tabs Selector */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-3 py-1.5 gap-2 sticky top-0 z-10">
        {[
          { id: 'PRICING', label: 'Đơn giá & Hợp đồng' },
          { id: 'PAYMENT', label: 'Thanh toán & Hóa đơn' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
              className={`app-tab-button px-3 py-3 border-b-2 transition-all whitespace-nowrap ${
                subTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex border-b border-slate-200 bg-white px-4 py-2 gap-3 sticky top-[45px] z-10 items-center justify-between text-xs text-slate-600 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-500 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium whitespace-nowrap">Đầu mục:</span>
            <CustomSelect
              value={filterParent}
              onChange={e => setFilterParent(e.target.value)}
              className="min-w-[120px] max-w-[200px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
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
              className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
            >
              {unitOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
              ))}
            </CustomSelect>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium whitespace-nowrap">TT Đặt hàng:</span>
            <CustomSelect
              value={filterOrder}
              onChange={e => setFilterOrder(e.target.value)}
              className="min-w-[100px] max-w-[150px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
            >
              {orderOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
              ))}
            </CustomSelect>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium whitespace-nowrap">TT Hợp đồng:</span>
            <CustomSelect
              value={filterContract}
              onChange={e => setFilterContract(e.target.value)}
              className="min-w-[100px] max-w-[150px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
            >
              {contractOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
              ))}
            </CustomSelect>
          </div>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto custom-scrollbar flex-1 min-h-0">
        <table className="w-full table-fixed border-collapse text-left text-xs" style={{ "--stt-width": `${maxSttWidth}px` } as React.CSSProperties}>
          <thead className="sticky top-0 z-20 border-b border-slate-300 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            {subTab === 'PRICING' ? (
              <tr className="bg-slate-50">
                <th style={{ minWidth: 32, width: "var(--stt-width)", borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8'   }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold whitespace-nowrap">STT</th>
                <th style={{ width: "100%", minWidth: 280, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8'  , left: "var(--stt-width)" }} className="sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left " >{TEXT.content}</th>
                <th style={{ width: 38, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center">{TEXT.unit}</th>
                <th style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.contractVolume}</th>
                <th style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.orderVolume}</th>
                <th style={{ width: 75, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.unitPrice}</th>
                <th style={{ width: 42, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">{TEXT.vatRate}</th>
                <th style={{ width: 72, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">{TEXT.vatAmount}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">{TEXT.total}</th>
                <th style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">{TEXT.orderStatus}</th>
                <th style={{ width: 125, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">{TEXT.contractStatus}</th>
                <th style={{ width: 119, borderBottom: '1px solid #94a3b8' }} className="sticky right-0 z-20 bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.note}</th>
              </tr>
            ) : (
              <tr className="bg-slate-50">
                <th style={{ minWidth: 32, width: "var(--stt-width)", borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8'   }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold whitespace-nowrap">STT</th>
                <th style={{ width: "100%", minWidth: 280, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8'  , left: "var(--stt-width)" }} className="sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left " >{TEXT.content}</th>
                <th style={{ width: 38, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center">{TEXT.unit}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.total}</th>
                <th style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">{TEXT.prepayPercent}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.payment}</th>
                <th style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.paymentDate}</th>
                <th style={{ width: 120, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.invoice}</th>
                <th style={{ width: 119, borderBottom: '1px solid #94a3b8' }} className="sticky right-0 z-20 bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">{TEXT.note}</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            {(() => {
              const groups: { [key: string]: any[] } = {};
              const order: string[] = [];
              let currentSectionKey = '__default__';

              // First pass: group by section. True orphans go to __orphaned__
              filteredData.forEach(t => {
                if (isSectionRow(t)) {
                  currentSectionKey = t.id;
                  if (!groups[currentSectionKey]) {
                    groups[currentSectionKey] = [];
                    order.push(currentSectionKey);
                  }
                  groups[currentSectionKey].unshift({ ...t, _isHeader: true });
                } else {
                  let targetSection: string | null = null;
                  const resolvedParentId = resolveParentId(t);
                  if (resolvedParentId && groups[resolvedParentId]) {
                    targetSection = resolvedParentId;
                  } else if (getSectionIndexForItem(t) !== Infinity) {
                    targetSection = currentSectionKey;
                  }
                  
                  if (targetSection && !groups[targetSection]) {
                    groups[targetSection] = [];
                    order.push(targetSection);
                  }
                  
                  const finalSection = targetSection || '__orphaned__';
                  if (!groups[finalSection]) {
                    groups[finalSection] = [];
                    order.push(finalSection);
                  }
                  groups[finalSection].push({ ...t, _isHeader: false });
                }
              });

              // Push orphaned items to the absolute bottom
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
                return <tr><td colSpan={colSpanCount + 1} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td></tr>;
              }

              return flattened
                .filter(pur => pur.isSec || !collapsedSections.has(pur._sectionKey || ''))
                .map((pur, index) => {
                const parent = pur.isSec;
                const depth = pur.depth || 0;
                
                const realIndex = flattened.indexOf(pur);
                const suggestedStt = '';

                if (parent) {
                  const isCollapsed = collapsedSections.has(pur._sectionKey || '');
                  return (
                    <tr key={pur.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                      <td className="sticky left-0 z-10 bg-blue-50/90 border-r border-blue-200 px-1 py-1.5 text-center font-mono font-extrabold text-xs text-primary whitespace-nowrap">
                        {pur.stt}
                      </td>
                      <td colSpan={colSpanCount} className=" bg-blue-50/90  px-2 py-1.5 uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap" title={pur.content}>
                        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSection(pur._sectionKey || ''); }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                            title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                          >
                            <span className={`material-symbols-outlined text-base transition-transform duration-200 text-primary ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                          </button>
                          <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                          <span className="truncate flex-1 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onEdit?.(pur, subTab); }}>{pur.content}</span>
                          {onAddSubtask && (
                            <button onClick={(e) => { e.stopPropagation(); onAddSubtask(pur, suggestedStt); }} className="flex-shrink-0 p-0.5 rounded text-blue-300 hover:text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center" title="Thêm hạng mục mới">
                              <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(pur.id); }} className="flex-shrink-0 p-0.5 rounded text-blue-300 hover:text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center ml-1" title="Xóa">
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
                
                const paddingLeft = depth > 1 ? `${(depth - 1) * 1.5}rem` : '0';
                const rowClass = `group transition-colors border-b border-slate-50 ${rowBg} hover:bg-slate-100`;

                return (
                <tr key={pur.id} onDoubleClick={() => onEdit(pur, subTab)} className={rowClass}>
                  {/* STT */}
                  <td className={`sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 px-1 py-1 text-center font-mono whitespace-nowrap overflow-hidden ${sttStyle}`}>
                    {editingCell?.id === pur.id && editingCell?.field === 'stt' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(pur)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(pur);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 font-bold focus:outline-primary text-xs"
                      />
                    ) : (
                      <span onClick={() => startEditing(pur.id, 'stt', pur.stt)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block w-full">{depth > 0 ? pur.computedStt : (pur.stt || index + 1)}</span>
                    )}
                  </td>

                  {/* NỘI DUNG MUA SẮM */}
                  <td className={`sticky z-10 ${stickyBg} group-hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 px-1.5 py-1  text-left overflow-hidden ${fontStyle}`} style={{ left: "var(--stt-width)" }}>
                    {editingCell?.id === pur.id && editingCell?.field === 'content' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(pur)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(pur);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="w-full border rounded px-1 py-0.5 bg-white text-slate-900 font-bold focus:outline-primary text-xs"
                      />
                    ) : (
                      <div style={{ paddingLeft }} className={`flex items-center gap-1 overflow-hidden whitespace-nowrap group-hover:bg-slate-100 ${stickyBg}`}>
                        {depth >= 1 && (
                          <span className="material-symbols-outlined flex-shrink-0 text-slate-300 text-lg mr-1 translate-y-[2px]">
                            subdirectory_arrow_right
                          </span>
                        )}
                        <span onClick={() => startEditing(pur.id, 'content', pur.content)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block truncate flex-1">{pur.content}</span>
                        {onAddSubtask && (
                          <button onClick={(e) => { e.stopPropagation(); onAddSubtask(pur, suggestedStt); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center flex-shrink-0" title="thêm hạng mục mới">
                            <span className="material-symbols-outlined text-[14px]">add_circle</span>
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={(e) => { e.stopPropagation(); onDelete(pur.id); }} className="p-0.5 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center flex-shrink-0" title="Xóa">
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* ĐVT */}
                  <td className="border-r border-slate-100 px-1 py-1 text-center font-mono text-slate-500 whitespace-nowrap overflow-hidden">
                    {editingCell?.id === pur.id && editingCell?.field === 'unit' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(pur)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(pur);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="w-full text-center border rounded px-1 py-0.5 bg-white text-slate-900 focus:outline-primary"
                      />
                    ) : (
                      <span onClick={() => startEditing(pur.id, 'unit', pur.unit)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{pur.unit || '-'}</span>
                    )}
                  </td>

                  {subTab === 'PRICING' ? (
                    <>
                      {/* KL HỢP ĐỒNG */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono font-semibold text-slate-900 whitespace-nowrap overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'volumeContract' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(pur)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(pur);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 font-semibold focus:outline-primary"
                          />
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'volumeContract', pur.volumeContract)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{numberText(pur.volumeContract)}</span>
                        )}
                      </td>

                      {/* KL ĐƠN ĐẶT */}
                      <td className="border-r border-slate-100 bg-blue-50/30 px-1.5 py-1 text-center font-mono font-semibold text-blue-700 whitespace-nowrap overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'volumeOrder' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(pur)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(pur);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 font-semibold focus:outline-primary"
                          />
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'volumeOrder', pur.volumeOrder)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{numberText(pur.volumeOrder)}</span>
                        )}
                      </td>

                      {/* ĐƠN GIÁ */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono whitespace-nowrap overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'unitPrice' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(pur)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(pur);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 font-semibold focus:outline-primary"
                          />
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'unitPrice', pur.unitPrice)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{money(pur.unitPrice)}</span>
                        )}
                      </td>

                      {/* THUẾ VAT */}
                      <td className="border-r border-slate-100 px-1 py-1 text-center font-mono whitespace-nowrap overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'vatRate' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(pur)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(pur);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 focus:outline-primary"
                          />
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'vatRate', pur.vatRate)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{percentText(pur.vatRate)}</span>
                        )}
                      </td>

                      {/* TIỀN THUẾ */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono whitespace-nowrap overflow-hidden">{money(computedVat(pur))}</td>

                      {/* THÀNH TIỀN */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono font-extrabold text-primary whitespace-nowrap overflow-hidden">{money(computedTotal(pur))}</td>

                      {/* TT ĐẶT HÀNG */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center overflow-hidden">
                        <div className="p-1 flex justify-center">
                          {(() => {
                            const currentStatus = pur.orderStatus || 'Chưa đặt hàng';
                            const btnStyle = getStatusColorStyle(currentStatus);
                            return (
                              <CustomSelect
                                value={currentStatus}
                                onChange={(e) => { onUpdate(pur.id, { ...pur, orderStatus: e.target.value }); }}
                                className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${btnStyle}`}
                              >
                                {PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className={getStatusColorStyle(opt)}>{opt}</option>)}
                              </CustomSelect>
                            );
                          })()}
                        </div>
                      </td>

                      {/* TT HỢP ĐỒNG */}
                      <td className="w-[125px] border-r border-slate-100 px-0 py-0 text-center font-semibold text-slate-700">
                        <div className="p-1">
                          {(() => {
                            const currentContractStatus = pur.contractStatus || 'Chưa ký';
                            const contractBtnStyle = getStatusColorStyle(currentContractStatus);
                            return (
                              <CustomSelect
                                value={currentContractStatus}
                                onChange={(e) => { onUpdate(pur.id, { ...pur, contractStatus: e.target.value }); }}
                                className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${contractBtnStyle}`}
                              >
                                <option value="Chưa ký" className={getStatusColorStyle("Chưa ký")}>Chưa ký</option>
                                <option value="Đang trình duyệt" className={getStatusColorStyle("Đang trình duyệt")}>Đang trình duyệt</option>
                                <option value="Đã ký" className={getStatusColorStyle("Đã ký")}>Đã ký</option>
                              </CustomSelect>
                            );
                          })()}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* THÀNH TIỀN (tab PAYMENT) */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono font-extrabold text-primary whitespace-nowrap overflow-hidden">{money(computedTotal(pur))}</td>

                      {/* % TẠM ỨNG */}
                      <td className="border-r border-slate-100 px-1 py-1 text-center font-mono whitespace-nowrap overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'prepayPercent' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(pur)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(pur);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 focus:outline-primary"
                          />
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'prepayPercent', pur.prepayPercent)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{percentText(pur.prepayPercent)}</span>
                        )}
                      </td>

                      {/* THANH TOÁN */}
                      <td className="w-[85px] min-w-[85px] max-w-[85px] border-r border-slate-100 px-1.5 py-1 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">{money(computedPayment(pur))}</td>

                      {/* NGÀY THANH TOÁN */}
                      <td className="w-[75px] border-r border-slate-100 px-1.5 py-1 text-center font-mono text-slate-600 whitespace-nowrap">
                        {editingCell?.id === pur.id && editingCell?.field === 'paymentDate' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(pur)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(pur);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 focus:outline-primary text-[10px]"
                          />
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'paymentDate', pur.paymentDate)} className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center">{pur.paymentDate || ''}</span>
                        )}
                      </td>

                      {/* HÓA ĐƠN */}
                      <td className="w-[120px] border-r border-slate-100 px-0 py-0 text-center font-semibold text-slate-700">
                        <div className="p-1">
                          {(() => {
                            const currentInvoiceStatus = pur.invoiceStatus || 'Chưa xuất';
                            const invoiceBtnStyle = getStatusColorStyle(currentInvoiceStatus);
                            return (
                              <CustomSelect
                                value={currentInvoiceStatus}
                                onChange={(e) => { onUpdate(pur.id, { ...pur, invoiceStatus: e.target.value }); }}
                                className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${invoiceBtnStyle}`}
                              >
                                <option value="Chưa xuất" className={getStatusColorStyle("Chưa xuất")}>Chưa xuất</option>
                                <option value="Đang kiểm tra" className={getStatusColorStyle("Đang kiểm tra")}>Đang kiểm tra</option>
                                <option value="Đã xuất" className={getStatusColorStyle("Đã xuất")}>Đã xuất</option>
                              </CustomSelect>
                            );
                          })()}
                        </div>
                      </td>
                    </>
                  )}

                  {/* GHI CHÚ */}
                  <td className="w-[120px] min-w-[90px] max-w-[160px] px-1.5 py-1 text-slate-500 text-center">
                    {editingCell?.id === pur.id && editingCell?.field === 'notes' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(pur)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(pur);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="w-full border rounded px-1.5 py-0.5 bg-white text-slate-900 focus:outline-primary"
                      />
                    ) : (
                      <div onClick={() => startEditing(pur.id, 'notes', pur.notes)} className="w-full truncate cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 rounded" title={cleanNotes(pur.notes)}>{cleanNotes(pur.notes) || '-'}</div>
                    )}
                  </td>
                </tr>
              );
            })})()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
