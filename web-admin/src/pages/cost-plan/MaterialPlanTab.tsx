import React, { useMemo, useState } from 'react';
import { ProjectMaterialPlan } from '../../types';

interface MaterialPlanTabProps {
  data: ProjectMaterialPlan[];
  onEdit: (plan: ProjectMaterialPlan) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, plan: ProjectMaterialPlan) => void;
  onAddSubtask?: (plan: ProjectMaterialPlan) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
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

const cleanNotes = (value?: string) => String(value || '').replace(/\s*\|?\s*\[(section|owner|contractor)\]\s*/gi, '').trim();

const showNumber = (value?: number) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
};

const showProgress = (value?: string) => {
  if (!value) return '';
  const n = Number(value);
  if (Number.isFinite(n) && n > 0 && n <= 1) return `${Math.round(n * 100)}%`;
  return value;
};



const yesNo = (value?: boolean) => value ? 'Có' : '';

export const MaterialPlanTab: React.FC<MaterialPlanTabProps> = ({
  data, onEdit, onDelete, onUpdate, onAddSubtask, searchQuery, setSearchQuery, statusFilter, setStatusFilter
}) => {
  const [subTab, setSubTab] = useState<'TECH' | 'ORDER' | 'DOCS'>('TECH');
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof ProjectMaterialPlan } | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => setColumnFilters(prev => ({ ...prev, [key]: value }));
  const clearColumnFilters = () => setColumnFilters({});

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) { next.delete(sectionKey); } else { next.add(sectionKey); }
      return next;
    });
  };

  const filteredData = useMemo(() => {
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

    // Sort sections by their stt: Roman sections by Roman value, numeric sections
    // by numeric parts (e.g. '33' < '34' < '105'). Then assign items to their
    // section based on the nearest section header BEFORE them in the data array.
    const sectionSortKey = (r: ProjectMaterialPlan): number[] => {
      const stt = String(r.stt || '').trim();
      if (/^[IVXLCDM]+$/i.test(stt)) return [0, romanToInt(stt)];
      return [1, ...numericSttParts(stt)];
    };
    const sectionOrder = new Map<string, number>();
    [...data]
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

    // Position = Excel [order:NNN] tag when present (true file order regardless
    // of array order: imports PREPEND records, API returns created_at order);
    // fall back to the array index for records created outside the import flow.
    const orderTagValue = (notes?: string): number | null => {
      const m = String(notes || '').match(/\[order:([\d.]+)\]/);
      return m ? parseFloat(m[1]) : null;
    };
    const originalOrderMap = new Map<string, number>(data.map((r, i) => [r.id, orderTagValue(r.notes) ?? i]));

    const getSectionIndexForItem = (plan: ProjectMaterialPlan): number => {
      if (isParentRow(plan)) return sectionOrder.get(plan.id) ?? Infinity;
      // User-added subtasks carry a real parentId — group them under that section
      // even when the item sits before its section in the data array.
      if (plan.parentId && sectionOrder.has(plan.parentId)) return sectionOrder.get(plan.parentId)!;
      // If parentId points to a regular item (not a section), walk up the parentId
      // chain to find the owning section. This handles items created via task sync
      // where parentId → parent item → section header.
      if (plan.parentId) {
        let cursor: ProjectMaterialPlan | undefined = data.find(r => r.id === plan.parentId);
        while (cursor) {
          const current = cursor;
          if (isParentRow(current)) {
            const secIdx = sectionOrder.get(current.id);
            if (secIdx !== undefined) return secIdx;
            break;
          }
          cursor = current.parentId ? data.find(r => r.id === current.parentId) : undefined;
        }
      }
      // Find the nearest section whose Excel position is before this item's
      // position (sections always precede their items in the Excel order).
      const myPos = originalOrderMap.get(plan.id) ?? Infinity;
      let bestSecIdx = -1;
      let bestSecPos = -1;
      data.forEach(r => {
        if (isParentRow(r)) {
          const secPos = originalOrderMap.get(r.id) ?? Infinity;
          if (secPos <= myPos && secPos > bestSecPos) {
            bestSecPos = secPos;
            bestSecIdx = sectionOrder.get(r.id) ?? -1;
          }
        }
      });
      return bestSecIdx === -1 ? -1 : bestSecIdx;
    };

    return data
      .filter((plan) => {
        const q = (searchQuery || '').trim().toLowerCase();
        const matchSearch = !q ||
          (plan.jobContent || '').toLowerCase().includes(q) ||
          (plan.techSpecModel || '').toLowerCase().includes(q) ||
          (plan.notes || '').toLowerCase().includes(q);
        const cf = columnFilters;
        const matchColumn =
          (!cf.jobContent || (plan.jobContent || '').toLowerCase().includes((cf.jobContent || '').toLowerCase())) &&
          (!cf.techSpecModel || (plan.techSpecModel || '').toLowerCase().includes((cf.techSpecModel || '').toLowerCase())) &&
          (!cf.unit || (plan.unit || '').toLowerCase().includes((cf.unit || '').toLowerCase())) &&
          (!cf.progressStatus || String(plan.progressStatus || '').includes(cf.progressStatus)) &&
          (!cf.orderedStatus || String(plan.orderedStatus || '').includes(cf.orderedStatus));
        return matchSearch && matchColumn;
      })
      .sort((a, b) => {
        const secA = getSectionIndexForItem(a);
        const secB = getSectionIndexForItem(b);
        if (secA !== secB) return secA - secB;
        // Within same section: header first, then items by numeric stt
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
  }, [data, searchQuery, columnFilters]);

  const startEditing = (id: string, field: keyof ProjectMaterialPlan, value: any) => {
    setEditingCell({ id, field });
    if (field === 'progressStatus') {
      const n = Number(value || 0);
      setTempValue(n <= 1 ? Math.round(n * 100) : n);
    } else {
      setTempValue(value === undefined || value === null ? '' : value);
    }
  };

  const saveEditing = (plan: ProjectMaterialPlan) => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    let finalValue = tempValue;
    if (field === 'contractVolume' || field === 'orderedVolume') {
      finalValue = Number(tempValue || 0);
    } else if (field === 'progressStatus') {
      finalValue = Number(tempValue || 0) / 100;
    } else if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
      finalValue = tempValue === true || tempValue === 'true' || tempValue === 'Có';
    }

    onUpdate(id, { ...plan, [field]: finalValue });
    setEditingCell(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 md:flex-row">
        <div className="relative w-full flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
          <input
            type="text"
            placeholder={TEXT.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {(searchQuery || Object.values(columnFilters).some(v => v)) && (
          <button type="button" onClick={() => { setSearchQuery(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
        )}
        <div className="flex w-full items-center gap-2 md:w-auto">
          <span className="whitespace-nowrap text-xs font-bold text-slate-500">{TEXT.statusFilter}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">{TEXT.all}</option>
            <option value={TEXT.notStarted}>{TEXT.notStarted}</option>
            <option value={TEXT.doing}>{TEXT.doing}</option>
            <option value={TEXT.done}>{TEXT.done}</option>
          </select>
        </div>
      </div>

      <div className="flex border-b border-slate-200 px-4 bg-slate-50 gap-4 sticky top-0 z-10">
        <button
          onClick={() => setSubTab('TECH')}
          className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${subTab === 'TECH' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          Kỹ thuật & tiến độ
        </button>
        <button
          onClick={() => setSubTab('ORDER')}
          className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${subTab === 'ORDER' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          Đặt hàng & vướng mắc
        </button>
        <button
          onClick={() => setSubTab('DOCS')}
          className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${subTab === 'DOCS' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          Chứng từ & giao hàng
        </button>
      </div>

      <div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full table-fixed border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr className="bg-slate-50">
              <th rowSpan={2} style={{ width: 32, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold">STT</th>
              <th rowSpan={2} style={{ width: 280, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-[32px] z-20 bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">NỘI DUNG</th>
              <th rowSpan={2} style={{ width: 40, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">ĐVT</th>
              <th rowSpan={2} style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">KL HĐ</th>

              {subTab === 'TECH' && (
                <>
                  <th colSpan={3} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">TIÊU CHUẨN KỸ THUẬT</th>
                  <th rowSpan={2} style={{ width: 60, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">TIẾN ĐỘ</th>
                </>
              )}

              {subTab === 'ORDER' && (
                <>
                  <th rowSpan={2} style={{ width: 52, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">KL ĐẶT HÀNG</th>
                  <th rowSpan={2} style={{ width: 75, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">TT ĐẶT HÀNG</th>
                  <th rowSpan={2} style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">NGÀY CÓ HÀNG</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">VƯỚNG MẮC/ TỒN ĐỌNG</th>
                </>
              )}

              {subTab === 'DOCS' && (
                <>
                  <th colSpan={3} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1.5 text-center leading-tight">LUÂN CHUYỂN VẬT TƯ</th>
                </>
              )}
              <th rowSpan={2} style={{ width: 110, borderBottom: '1px solid #94a3b8' }} className="px-1.5 py-1.5 text-center leading-tight">GHI CHÚ</th>
            </tr>
            <tr className="bg-slate-50">
              {subTab === 'TECH' && (
                <>
                  <th style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">CHÀO HÀNG</th>
                  <th style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">ĐÁP ỨNG KỸ THUẬT</th>
                  <th style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">TÌNH TRẠNG</th>
                </>
              )}
              {subTab === 'ORDER' && (
                <>
                  <th style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">NỘI DUNG</th>
                  <th style={{ width: 80, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">TT XỬ LÝ</th>
                </>
              )}
              {subTab === 'DOCS' && (
                <>
                  <th style={{ width: 40, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">CO</th>
                  <th style={{ width: 40, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">CQ</th>
                  <th style={{ width: 60, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">KIỂM ĐỊNH PCCC</th>
                  <th style={{ width: 60, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">ĐÃ GỬI TỚI CT</th>
                  <th style={{ width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="px-1 py-1 text-center leading-tight">NGÀY</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {(() => {
              // Group items by section — same approach as TaskManagementPage
              const groups: { [key: string]: any[] } = {};
              const order: string[] = [];
              let currentSectionKey = '__default__';

              // First pass: group by section
              filteredData.forEach(t => {
                if (isParentRow(t)) {
                  currentSectionKey = t.id;
                  if (!groups[currentSectionKey]) {
                    groups[currentSectionKey] = [];
                    order.push(currentSectionKey);
                  }
                  groups[currentSectionKey].unshift({ ...t, _isHeader: true });
                } else {
                  // Use parentId if available, otherwise use current section
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

                // Build tree within this section (for sub-items with parentId)
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
                return <tr><td colSpan={subTab === 'TECH' ? 9 : 10} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td></tr>;
              }

              const colSpanCount = subTab === 'TECH' ? 8 : 9;

              return flattened
                .filter(plan => plan.isSec || !collapsedSections.has(plan._sectionKey || ''))
                .map((plan, index) => {
                const parent = plan.isSec;
                const depth = plan.depth || 0;
                
                if (parent) {
                  const isCollapsed = collapsedSections.has(plan._sectionKey || '');
                  return (
                    <tr key={plan.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                      <td className="sticky left-0 z-10 bg-blue-50/90 border-r border-blue-200 px-1 py-1.5 text-center font-mono font-extrabold text-xs text-primary whitespace-nowrap">
                        {plan.stt}
                      </td>
                      <td colSpan={colSpanCount} className="sticky left-[32px] z-10 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-2 py-1.5 uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap" title={plan.jobContent}>
                        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSection(plan._sectionKey || ''); }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                            title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                          >
                            <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                          </button>
                          <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                          <span className="truncate flex-1">{plan.jobContent}</span>
                          {onAddSubtask && (
                            <button onClick={(e) => { e.stopPropagation(); onAddSubtask(plan); }} className="flex-shrink-0 p-0.5 rounded text-blue-300 hover:text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center" title="Thêm hạng mục mới">
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
                <tr key={plan.id} onDoubleClick={() => onEdit(plan)} className={rowClass}>
                  {/* STT */}
                  <td className={`sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 px-1 py-2 text-center font-mono whitespace-nowrap overflow-hidden ${sttStyle}`}>
                    {editingCell?.id === plan.id && editingCell?.field === 'stt' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 font-bold focus:outline-primary text-xs"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, 'stt', plan.computedStt || plan.stt)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block w-full">{plan.computedStt || plan.stt || index + 1}</span>
                    )}
                  </td>
                  {/* NỘI DUNG */}
                  <td className={`sticky left-[32px] z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left overflow-hidden ${fontStyle}`}>
                    {editingCell?.id === plan.id && editingCell?.field === 'jobContent' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
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
                        <span onClick={() => startEditing(plan.id, 'jobContent', plan.jobContent)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block truncate flex-1">{plan.jobContent}</span>
                        {onAddSubtask && (
                          <button onClick={(e) => { e.stopPropagation(); onAddSubtask(plan); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center flex-shrink-0" title="thêm hạng mục mới">
                            <span className="material-symbols-outlined text-[14px]">add_circle</span>
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center flex-shrink-0" title="Xóa">
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  {/* ĐVT */}
                  <td className="overflow-hidden truncate px-1 py-2 text-center font-mono text-slate-500">
                    {editingCell?.id === plan.id && editingCell?.field === 'unit' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-900 focus:outline-primary text-xs"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, 'unit', plan.unit)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate" title={plan.unit || ''}>{plan.unit || ''}</span>
                    )}
                  </td>
                  {/* KL HĐ */}
                  <td className="overflow-hidden truncate px-1 py-2 text-right font-mono font-semibold text-slate-900">
                    {editingCell?.id === plan.id && editingCell?.field === 'contractVolume' ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full text-right border rounded px-0.5 py-0.5 bg-white text-slate-900 font-semibold focus:outline-primary text-xs"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, 'contractVolume', plan.contractVolume)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full" title={showNumber(plan.contractVolume)}>{showNumber(plan.contractVolume)}</span>
                    )}
                  </td>

                  {subTab === 'TECH' && (
                    <>
                      {/* CHÀO HÀNG */}
                      <td className="overflow-hidden truncate px-1 py-1.5 text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'techSpecModel' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-600 focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'techSpecModel', plan.techSpecModel)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate" title={plan.techSpecModel || ''}>{plan.techSpecModel || ''}</span>
                        )}
                      </td>
                      {/* ĐÁP ỨNG KỸ THUẬT */}
                      <td className="overflow-hidden truncate px-1 py-1.5 text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'techSpecOrigin' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-600 focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'techSpecOrigin', plan.techSpecOrigin)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate" title={plan.techSpecOrigin || ''}>{plan.techSpecOrigin || ''}</span>
                        )}
                      </td>
                      {/* TÌNH TRẠNG */}
                      <td className="overflow-hidden truncate px-1 py-1.5 text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'techSpecStatus' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => { onUpdate(plan.id, { ...plan, techSpecStatus: e.target.value }); setEditingCell(null); }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-600 focus:outline-primary text-xs"
                          >
                            <option value="">Chưa xác định</option>
                            <option value="Đáp ứng">Đáp ứng</option>
                            <option value="Chưa đáp ứng">Chưa đáp ứng</option>
                            <option value="Đang xem xét">Đang xem xét</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'techSpecStatus', plan.techSpecStatus)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate">{plan.techSpecStatus || ''}</span>
                        )}
                      </td>
                      {/* TIẾN ĐỘ */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                        {editingCell?.id === plan.id && editingCell?.field === 'progressStatus' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-700 font-bold focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'progressStatus', plan.progressStatus)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{showProgress(plan.progressStatus)}</span>
                        )}
                      </td>
                    </>
                  )}

                  {subTab === 'ORDER' && (
                    <>
                      {/* KL ĐẶT HÀNG */}
                      <td className="overflow-hidden truncate px-1 py-1.5 text-right font-mono font-semibold text-slate-900">
                        {editingCell?.id === plan.id && editingCell?.field === 'orderedVolume' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-right border rounded px-0.5 py-0.5 bg-white text-slate-900 font-semibold focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'orderedVolume', plan.orderedVolume)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full" title={showNumber(plan.orderedVolume)}>{showNumber(plan.orderedVolume)}</span>
                        )}
                      </td>
                      {/* TT ĐẶT HÀNG */}
                      <td className="overflow-hidden truncate px-1 py-1.5 text-center font-semibold text-slate-700">
                        {editingCell?.id === plan.id && editingCell?.field === 'orderedStatus' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => { onUpdate(plan.id, { ...plan, orderedStatus: e.target.value }); setEditingCell(null); }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-700 font-semibold focus:outline-primary text-xs"
                          >
                            <option value="">Chưa đặt hàng</option>
                            <option value="Đã đặt hàng">Đã đặt hàng</option>
                            <option value="Đang giao hàng">Đang giao hàng</option>
                            <option value="Đã nhận hàng">Đã nhận hàng</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'orderedStatus', plan.orderedStatus)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate" title={plan.orderedStatus || ''}>{plan.orderedStatus || ''}</span>
                        )}
                      </td>
                      {/* NGÀY CÓ HÀNG */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-mono text-slate-600 truncate">
                        {editingCell?.id === plan.id && editingCell?.field === 'expectedDate' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-600 focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'expectedDate', plan.expectedDate)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{plan.expectedDate || ''}</span>
                        )}
                      </td>
                      {/* NỘI DUNG VƯỚNG MẮC */}
                      <td className="overflow-hidden truncate px-1 py-1.5 font-semibold text-red-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'issueContent' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-red-600 font-semibold focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'issueContent', plan.issueContent)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate" title={plan.issueContent || ''}>{plan.issueContent || ''}</span>
                        )}
                      </td>
                      {/* TT XỬ LÝ */}
                      <td className="overflow-hidden truncate px-1 py-1.5 text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'issueStatus' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-600 focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'issueStatus', plan.issueStatus)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full truncate" title={plan.issueStatus || ''}>{plan.issueStatus || ''}</span>
                        )}
                      </td>
                    </>
                  )}

                  {subTab === 'DOCS' && (
                    <>
                      {/* CO */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-bold text-emerald-700">
                        {editingCell?.id === plan.id && editingCell?.field === 'docCo' ? (
                          <select
                            value={tempValue ? 'true' : 'false'}
                            onChange={(e) => { onUpdate(plan.id, { ...plan, docCo: e.target.value === 'true' }); setEditingCell(null); }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-emerald-700 font-bold focus:outline-primary text-xs"
                          >
                            <option value="false">Không</option>
                            <option value="true">Có</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'docCo', plan.docCo)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{yesNo(plan.docCo)}</span>
                        )}
                      </td>
                      {/* CQ */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-bold text-emerald-700">
                        {editingCell?.id === plan.id && editingCell?.field === 'docCq' ? (
                          <select
                            value={tempValue ? 'true' : 'false'}
                            onChange={(e) => { onUpdate(plan.id, { ...plan, docCq: e.target.value === 'true' }); setEditingCell(null); }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-emerald-700 font-bold focus:outline-primary text-xs"
                          >
                            <option value="false">Không</option>
                            <option value="true">Có</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'docCq', plan.docCq)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{yesNo(plan.docCq)}</span>
                        )}
                      </td>
                      {/* KIỂM ĐỊNH PCCC */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-bold text-emerald-700">
                        {editingCell?.id === plan.id && editingCell?.field === 'docFireInspection' ? (
                          <select
                            value={tempValue ? 'true' : 'false'}
                            onChange={(e) => { onUpdate(plan.id, { ...plan, docFireInspection: e.target.value === 'true' }); setEditingCell(null); }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-emerald-700 font-bold focus:outline-primary text-xs"
                          >
                            <option value="false">Không</option>
                            <option value="true">Có</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'docFireInspection', plan.docFireInspection)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{yesNo(plan.docFireInspection)}</span>
                        )}
                      </td>
                      {/* ĐÃ GỬI TỚI CT */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-semibold text-slate-700">
                        {editingCell?.id === plan.id && editingCell?.field === 'dispatchToSite' ? (
                          <select
                            value={tempValue ? 'true' : 'false'}
                            onChange={(e) => { onUpdate(plan.id, { ...plan, dispatchToSite: e.target.value === 'true' }); setEditingCell(null); }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full border rounded px-0.5 py-0.5 bg-white text-slate-700 font-semibold focus:outline-primary text-xs"
                          >
                            <option value="false">Không</option>
                            <option value="true">Có</option>
                          </select>
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'dispatchToSite', plan.dispatchToSite)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{yesNo(plan.dispatchToSite)}</span>
                        )}
                      </td>
                      {/* NGÀY */}
                      <td className="overflow-hidden px-1 py-1.5 text-center font-mono text-slate-600 truncate">
                        {editingCell?.id === plan.id && editingCell?.field === 'dispatchDate' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-center border rounded px-0.5 py-0.5 bg-white text-slate-600 focus:outline-primary text-xs"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'dispatchDate', plan.dispatchDate)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{plan.dispatchDate || ''}</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* GHI CHÚ */}
                  <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-100 overflow-hidden truncate px-1.5 py-1.5 text-slate-500">
                    {editingCell?.id === plan.id && editingCell?.field === 'notes' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full border rounded px-1 py-0.5 bg-white text-slate-500 focus:outline-primary text-xs"
                      />
                    ) : (
                      <div onClick={() => startEditing(plan.id, 'notes', plan.notes)} className="w-full truncate cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded" title={cleanNotes(plan.notes)}>{cleanNotes(plan.notes)}</div>
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




