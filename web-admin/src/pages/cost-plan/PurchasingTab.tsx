import React from 'react';
import { ProjectPurchasing } from '../../types';

interface PurchasingTabProps {
  data: ProjectPurchasing[];
  onEdit: (plan: ProjectPurchasing, subTab: 'PRICING' | 'PAYMENT') => void;
  onUpdate: (id: string, plan: ProjectPurchasing) => void;
  onDelete: (id: string) => void;
  onAddSubtask?: (plan: ProjectPurchasing) => void;
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
const cleanNotes = (value?: string) => String(value || '').replace(/\s*\|?\s*\[section\]\s*/gi, '').trim();
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
  data, onEdit, onUpdate, onDelete, onAddSubtask, searchQuery, setSearchQuery, statusFilter, setStatusFilter
}) => {
  const [subTab, setSubTab] = React.useState<'PRICING' | 'PAYMENT'>('PRICING');
  const [editingCell, setEditingCell] = React.useState<{ id: string; field: keyof ProjectPurchasing } | null>(null);
  const [tempValue, setTempValue] = React.useState<any>('');
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

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
  const originalOrderMap = new Map<string, number>(data.map((r, i) => [r.id, orderTagValue(r.notes) ?? i]));

  const getSectionIndexForItem = (pur: ProjectPurchasing): number => {
    if (isSectionRow(pur)) return sectionOrder.get(pur.id) ?? Infinity;
    // User-added subtasks carry a real parentId — group them under that section
    // even when the item sits before its section in the data array.
    if (pur.parentId && sectionOrder.has(pur.parentId)) return sectionOrder.get(pur.parentId)!;
    // If parentId points to a regular item (not a section), walk up the parentId
    // chain to find the owning section. This handles items created via task sync
    // where parentId → parent item → section header.
    if (pur.parentId) {
      let cursor: ProjectPurchasing | undefined = data.find(r => r.id === pur.parentId);
      while (cursor) {
        const current = cursor;
        if (isSectionRow(current)) {
          const secIdx = sectionOrder.get(current.id);
          if (secIdx !== undefined) return secIdx;
          break;
        }
        cursor = current.parentId ? data.find(r => r.id === current.parentId) : undefined;
      }
    }
    // Find the nearest section whose Excel position is before this item's
    // position (sections always precede their items in the Excel order).
    const myPos = originalOrderMap.get(pur.id) ?? Infinity;
    let bestSecIdx = -1;
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
    return bestSecIdx === -1 ? -1 : bestSecIdx;
  };

  const filteredData = data
    .filter((pur) => {
      const section = isSectionRow(pur);
      const matchesSearch = !searchQuery.trim() || [pur.stt, pur.content, pur.unit, pur.orderStatus, pur.contractStatus, pur.invoiceStatus, pur.notes]
        .join(' ')
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || section || pur.orderStatus === statusFilter;

      const cf = columnFilters;
      const matchColumn =
        (!cf.content || (pur.content || '').toLowerCase().includes((cf.content || '').toLowerCase())) &&
        (!cf.unit || (pur.unit || '').toLowerCase().includes((cf.unit || '').toLowerCase())) &&
        (!cf.orderStatus || (pur.orderStatus || '').toLowerCase().includes((cf.orderStatus || '').toLowerCase())) &&
        (!cf.contractStatus || (pur.contractStatus || '').toLowerCase().includes((cf.contractStatus || '').toLowerCase())) &&
        (!cf.invoiceStatus || (pur.invoiceStatus || '').toLowerCase().includes((cf.invoiceStatus || '').toLowerCase())) &&
        (!cf.notes || (pur.notes || '').toLowerCase().includes((cf.notes || '').toLowerCase()));

      return matchesSearch && matchesStatus && matchColumn;
    })
    .sort((a, b) => {
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

  const colSpanCount = subTab === 'PRICING' ? 12 : 9;

  return (
    <div className="flex w-full max-w-full h-full min-h-0 flex-col bg-white overflow-hidden">
      {/* Search and Filter */}
      <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 md:flex-row">
        <div className="relative w-full flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
          <input
            type="text"
            placeholder={TEXT.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {(searchQuery || Object.values(columnFilters).some(v => v)) && (
          <button type="button" onClick={() => { setSearchQuery(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
        )}
        <div className="flex w-full items-center gap-2 md:w-auto">
          <span className="whitespace-nowrap text-xs font-bold text-slate-500">{TEXT.filter}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">{TEXT.all}</option>
            <option value={TEXT.notOrdered}>{TEXT.notOrdered}</option>
            <option value={TEXT.ordered}>{TEXT.ordered}</option>
            <option value={TEXT.delivering}>{TEXT.delivering}</option>
            <option value={TEXT.received}>{TEXT.received}</option>
          </select>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-3 py-1.5 gap-2 sticky top-0 z-10">
        {[
          { id: 'PRICING', label: '1. Đơn giá & Hợp đồng', icon: 'payments' },
          { id: 'PAYMENT', label: '2. Thanh toán & Hóa đơn', icon: 'account_balance_wallet' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
              className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${
                subTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <span className="material-symbols-outlined text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-full overflow-x-auto custom-scrollbar flex-1 min-h-0">
        <table className="w-full table-fixed border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 border-b border-slate-300 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            {subTab === 'PRICING' ? (
              <tr className="bg-slate-50">
                <th style={{ width: 32, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold">STT</th>
                <th style={{ width: 155, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-[32px] z-20 bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{TEXT.content}</th>
                <th style={{ width: 38, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center">{TEXT.unit}</th>
                <th style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.contractVolume}</th>
                <th style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.orderVolume}</th>
                <th style={{ width: 75, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.unitPrice}</th>
                <th style={{ width: 42, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">{TEXT.vatRate}</th>
                <th style={{ width: 72, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">{TEXT.vatAmount}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">{TEXT.total}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">{TEXT.orderStatus}</th>
                <th style={{ width: 75, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">{TEXT.contractStatus}</th>
                <th style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.note}</th>
                <th style={{ width: 44, borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center">{TEXT.actions}</th>
              </tr>
            ) : (
              <tr className="bg-slate-50">
                <th style={{ width: 32, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold">STT</th>
                <th style={{ width: 155, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-[32px] z-20 bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{TEXT.content}</th>
                <th style={{ width: 38, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center">{TEXT.unit}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.total}</th>
                <th style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">{TEXT.prepayPercent}</th>
                <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.payment}</th>
                <th style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.paymentDate}</th>
                <th style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.invoice}</th>
                <th style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">{TEXT.note}</th>
                <th style={{ width: 44, borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center">{TEXT.actions}</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            {(() => {
              // Group items by section — same approach as TaskManagementPage
              const groups: { [key: string]: any[] } = {};
              const order: string[] = [];
              let currentSectionKey = '__default__';

              filteredData.forEach(t => {
                if (isSectionRow(t)) {
                  currentSectionKey = t.id;
                  if (!groups[currentSectionKey]) {
                    groups[currentSectionKey] = [];
                    order.push(currentSectionKey);
                  }
                  groups[currentSectionKey].unshift({ ...t, _isHeader: true });
                } else {
                  const targetSection = (t.parentId && groups[t.parentId]) ? t.parentId : currentSectionKey;
                  if (!groups[targetSection]) {
                    groups[targetSection] = [];
                    order.push(targetSection);
                  }
                  groups[targetSection].push({ ...t, _isHeader: false });
                }
              });

              const flattened: any[] = [];
              order.forEach((secKey) => {
                const sectionHeader = groups[secKey].find((t: any) => t._isHeader);
                const items = groups[secKey].filter((t: any) => !t._isHeader);

                const map = new Map<string, any>();
                const roots: any[] = [];
                items.forEach((t: any) => map.set(t.id, { ...t, children: [] }));
                items.forEach((t: any) => {
                  if (t.parentId && t.parentId !== secKey && map.has(t.parentId)) {
                    map.get(t.parentId)!.children.push(map.get(t.id));
                  } else {
                    roots.push(map.get(t.id));
                  }
                });

                const flattenTree = (nodes: any[], depth: number, prefix: string = '', sectionKey: string = '') => {
                  nodes.forEach((node: any, idx: number) => {
                    const currentNum = (idx + 1).toString();
                    const computedStt = depth === 1 ? currentNum : (depth > 1 ? `${prefix}.${currentNum}` : currentNum);
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

                if (parent) {
                  const isCollapsed = collapsedSections.has(pur._sectionKey || '');
                  return (
                    <tr key={pur.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                      <td className="sticky left-0 z-10 bg-blue-50/90 border-r border-blue-200 px-1 py-1.5 text-center font-mono font-extrabold text-xs text-primary whitespace-nowrap">
                        {pur.stt}
                      </td>
                      <td colSpan={colSpanCount} className="sticky left-[32px] z-10 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-2 py-1.5 uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap" title={pur.content}>
                        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSection(pur._sectionKey || ''); }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                            title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                          >
                            <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                          </button>
                          <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                          <span className="truncate flex-1">{pur.content}</span>
                          {onAddSubtask && (
                            <button onClick={(e) => { e.stopPropagation(); onAddSubtask(pur); }} className="flex-shrink-0 p-0.5 rounded text-blue-300 hover:text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center" title="Thêm hạng mục mới">
                              <span className="material-symbols-outlined text-[16px]">add_circle</span>
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
                      <span onClick={() => startEditing(pur.id, 'stt', pur.computedStt || pur.stt)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block w-full">{pur.computedStt || pur.stt || index + 1}</span>
                    )}
                  </td>

                  {/* NỘI DUNG MUA SẮM */}
                  <td className={`sticky left-[32px] z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left overflow-hidden ${fontStyle}`}>
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
                          <button onClick={(e) => { e.stopPropagation(); onAddSubtask(pur); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center flex-shrink-0" title="thêm hạng mục mới">
                            <span className="material-symbols-outlined text-[14px]">add_circle</span>
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
                      <span onClick={() => startEditing(pur.id, 'unit', pur.unit)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{pur.unit || '-'}</span>
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
                          <span onClick={() => startEditing(pur.id, 'volumeContract', pur.volumeContract)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{numberText(pur.volumeContract)}</span>
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
                          <span onClick={() => startEditing(pur.id, 'volumeOrder', pur.volumeOrder)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{numberText(pur.volumeOrder)}</span>
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
                          <span onClick={() => startEditing(pur.id, 'unitPrice', pur.unitPrice)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{money(pur.unitPrice)}</span>
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
                          <span onClick={() => startEditing(pur.id, 'vatRate', pur.vatRate)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{percentText(pur.vatRate)}</span>
                        )}
                      </td>

                      {/* TIỀN THUẾ */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono whitespace-nowrap overflow-hidden">{money(computedVat(pur))}</td>

                      {/* THÀNH TIỀN */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-mono font-extrabold text-primary whitespace-nowrap overflow-hidden">{money(computedTotal(pur))}</td>

                      {/* TT ĐẶT HÀNG */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'orderStatus' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => {
                              onUpdate(pur.id, { ...pur, orderStatus: e.target.value });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-900 text-[10px]"
                          >
                            <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                            <option value="Đã đặt hàng">Đã đặt hàng</option>
                            <option value="Đang giao hàng">Đang giao hàng</option>
                            <option value="Đã nhận hàng">Đã nhận hàng</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'orderStatus', pur.orderStatus)} className="cursor-pointer">
                            <span className={`inline-flex justify-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
                              pur.orderStatus === TEXT.received ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                              pur.orderStatus === TEXT.delivering ? 'border-amber-200 bg-amber-50 text-amber-700' :
                              pur.orderStatus === TEXT.ordered ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}>
                              {pur.orderStatus || TEXT.notOrdered}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* TT HỢP ĐỒNG */}
                      <td className="border-r border-slate-100 px-1.5 py-1 text-center font-semibold text-slate-700 whitespace-nowrap overflow-hidden">
                        {editingCell?.id === pur.id && editingCell?.field === 'contractStatus' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => {
                              onUpdate(pur.id, { ...pur, contractStatus: e.target.value });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-900 text-[10px]"
                          >
                            <option value="Chưa ký">Chưa ký</option>
                            <option value="Đang trình duyệt">Đang trình duyệt</option>
                            <option value="Đã ký">Đã ký</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'contractStatus', pur.contractStatus)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate">{pur.contractStatus || '-'}</span>
                        )}
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
                          <span onClick={() => startEditing(pur.id, 'prepayPercent', pur.prepayPercent)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{percentText(pur.prepayPercent)}</span>
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
                          <span onClick={() => startEditing(pur.id, 'paymentDate', pur.paymentDate)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{pur.paymentDate || ''}</span>
                        )}
                      </td>

                      {/* HÓA ĐƠN */}
                      <td className="w-[70px] border-r border-slate-100 px-1.5 py-1 text-center font-semibold text-slate-700 whitespace-nowrap">
                        {editingCell?.id === pur.id && editingCell?.field === 'invoiceStatus' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => {
                              onUpdate(pur.id, { ...pur, invoiceStatus: e.target.value });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-900 text-[10px]"
                          >
                            <option value="Chưa xuất">Chưa xuất</option>
                            <option value="Đang kiểm tra">Đang kiểm tra</option>
                            <option value="Đã xuất">Đã xuất</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(pur.id, 'invoiceStatus', pur.invoiceStatus)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate">{pur.invoiceStatus || ''}</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* GHI CHÚ */}
                  <td className="w-[120px] min-w-[90px] max-w-[160px] border-r border-slate-100 px-1.5 py-1 text-slate-500 text-center">
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
                  
                  {/* Actions Column */}
                  <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-100 w-[50px] min-w-[50px] max-w-[50px] px-1 py-1 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => onEdit(pur, subTab)} className="rounded-lg bg-blue-50 p-1 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700" title={TEXT.edit}>
                        <span className="material-symbols-outlined text-xs">edit</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(pur.id); }} className="rounded-lg bg-rose-50 p-1 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700" title={TEXT.delete}>
                        <span className="material-symbols-outlined text-xs">delete</span>
                      </button>
                    </div>
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
