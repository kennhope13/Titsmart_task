import React, { useMemo, useState } from 'react';
import { ProjectMaterialPlan } from '../../types';
import { CustomSelect } from '@/components/common/CustomSelect';

interface MaterialPlanTabProps {
  data: ProjectMaterialPlan[];
  onEdit: (plan: ProjectMaterialPlan) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, plan: Partial<ProjectMaterialPlan>) => void | Promise<void>;
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

const showProgress = (value?: string) => {
  if (!value) return '';
  const n = Number(value);
  if (Number.isFinite(n) && n > 0 && n <= 1) return `${Math.round(n * 100)}%`;
  return value;
};



const yesNo = (value?: boolean) => value ? 'Có' : '';

export const MaterialPlanTab: React.FC<MaterialPlanTabProps> = ({
  data, onEdit, onDelete, onUpdate, onAddSubtask, searchQuery, setSearchQuery, statusFilter, setStatusFilter, userRole
}) => {
  const [subTab, setSubTab] = useState<'TECH' | 'ORDER' | 'DOCS'>('TECH');
  const [filterParent, setFilterParent] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterProgress, setFilterProgress] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterConstruction, setFilterConstruction] = useState('all');

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

  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof ProjectMaterialPlan } | null>(null);
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
    return { filteredData: sortedFiltered, resolveParentId, getSectionIndexForItem };
  }, [data, searchQuery, statusFilter, filterParent, filterUnit, filterProgress, filterOrder, filterConstruction]);

  const startEditing = (id: string, field: keyof ProjectMaterialPlan, value: any) => {
    if (userRole === 'engineer') return;
    setEditingCell({ id, field });
    if (field === 'progressStatus' || field === 'orderedStatus') {
      setTempValue(value || '');
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
    } else if (field === 'progressStatus' || field === 'orderedStatus') {
      finalValue = tempValue;
    } else if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
      finalValue = tempValue === true || tempValue === 'true' || tempValue === 'Có';
    }

    onUpdate(id, { ...plan, [field]: finalValue });
    setEditingCell(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="flex flex-col border-b border-slate-200 sticky top-0 z-10 bg-slate-50">
        <div className="flex px-4 gap-4 border-b border-slate-200">
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
              <span className="text-slate-500 font-medium whitespace-nowrap">Mua hàng:</span>
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

            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium whitespace-nowrap">Tình trạng:</span>
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
          </div>
        </div>
      </div>

      <div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full table-fixed border-collapse text-left text-xs">
          <thead className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr className="bg-slate-50">
              <th rowSpan={2} style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-0 z-20 bg-slate-50 bg-clip-padding px-1 py-1.5 text-center font-extrabold">STT</th>
              <th rowSpan={2} style={{ width: 280, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="sticky left-[50px] z-20 bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">NỘI DUNG</th>
              <th rowSpan={2} style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">ĐVT</th>
              <th rowSpan={2} style={{ width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL HĐ</th>

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
                  <th colSpan={2} style={{ borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">LUÂN CHUYỂN VẬT TƯ</th>
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
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {(() => {
              const groups: { [key: string]: any[] } = {};
              const order: string[] = [];
              let currentSectionKey = '__default__';

              // Group by section. True orphans go to __orphaned__
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

                // Build tree within this section (for sub-items with parentId)
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
                return <tr><td colSpan={subTab === 'TECH' ? 9 : 10} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td></tr>;
              }

              const colSpanCount = subTab === 'TECH' ? 8 : 9;

              return (
                <>
                  {flattened
                    .filter(plan => plan.isSec || !collapsedSections.has(plan._sectionKey || ''))
                    .map((plan, index) => {
                      const parent = plan.isSec;
                      const depth = plan.depth || 0;
                      
                      const suggestedStt = '';

                      if (parent) {
                        const isCollapsed = collapsedSections.has(plan._sectionKey || '');
                    return (
                      <tr key={plan.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                        <td className="sticky left-0 z-10 bg-blue-50/90 border-r border-blue-200 px-1 py-1.5 text-center font-mono font-extrabold text-xs text-primary whitespace-nowrap">
                          {plan.stt}
                        </td>
                        <td colSpan={colSpanCount} className="sticky left-[50px] z-10 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-2 py-1.5 uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap" title={plan.jobContent}>
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSection(plan._sectionKey || ''); }}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                              title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                            >
                              <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                            </button>
                            <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                            <span className="truncate flex-1 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onEdit?.(plan); }}>{plan.jobContent}</span>
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
                <tr key={plan.id} onDoubleClick={() => onEdit(plan)} className={rowClass}>
                  {/* STT */}
                  <td className={`sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 p-0 align-top text-center font-mono whitespace-nowrap overflow-hidden ${sttStyle}`}>
                    {editingCell?.id === plan.id && editingCell?.field === 'stt' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full text-center bg-white text-slate-900 font-bold focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, 'stt', plan.stt)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-0.5 rounded block w-full">{depth > 0 ? plan.computedStt : plan.stt}</span>
                    )}
                  </td>
                  {/* NỘI DUNG */}
                  <td className={`sticky left-[50px] z-10 ${stickyBg} group-hover:bg-slate-100 border-r border-slate-100 p-0 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left overflow-hidden ${fontStyle}`}>
                    {editingCell?.id === plan.id && editingCell?.field === 'jobContent' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full bg-white text-slate-900 font-bold focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden whitespace-nowrap" style={{ paddingLeft }}>
                        {depth > 1 && (
                          <span className="material-symbols-outlined flex-shrink-0 text-slate-300 text-[14px] mr-1 translate-y-[1px]">
                            subdirectory_arrow_right
                          </span>
                        )}
                        <span onClick={() => startEditing(plan.id, 'jobContent', plan.jobContent)} className="cursor-pointer hover:bg-slate-100 flex-1 truncate px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={plan.jobContent}>
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
                  {/* ĐVT */}
                  <td className="p-0 align-top text-center font-mono text-slate-500">
                    {editingCell?.id === plan.id && editingCell?.field === 'unit' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full text-center bg-white text-slate-900 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, 'unit', plan.unit)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center truncate px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={plan.unit || ''}>{plan.unit || ''}</span>
                    )}
                  </td>
                  {/* KL HĐ */}
                  <td className="p-0 align-top text-right font-mono font-semibold text-slate-900">
                    {editingCell?.id === plan.id && editingCell?.field === 'contractVolume' ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full text-right bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, 'contractVolume', plan.contractVolume)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={showNumber(plan.contractVolume)}>{showNumber(plan.contractVolume)}</span>
                    )}
                  </td>

                  {subTab === 'TECH' && (
                    <>
                      {/* CHÀO HÀNG */}
                      <td className="p-0 align-top text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'techSpecModel' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'techSpecModel', plan.techSpecModel)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center truncate px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={plan.techSpecModel || ''}>{plan.techSpecModel || ''}</span>
                        )}
                      </td>
                      {/* ĐÁP ỨNG KỸ THUẬT */}
                      <td className="p-0 align-top text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'techSpecOrigin' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'techSpecOrigin', plan.techSpecOrigin)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center truncate px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={plan.techSpecOrigin || ''}>{plan.techSpecOrigin || ''}</span>
                        )}
                      </td>
                      {/* TÌNH TRẠNG */}
                      <td className="w-[125px] p-0 align-middle text-slate-600">
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
                                onChange={(e) => { onUpdate(plan.id, { ...plan, techSpecStatus: e.target.value }) }}
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
                      <td className="w-[125px] p-0 align-middle text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                        <div className="p-1">
                          {(() => {
                            const status = plan.progressStatus || '';
                            let style = 'border-slate-200 bg-slate-50 text-slate-500';
                            if (status === 'Đã hoàn thành') style = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                            else if (status === 'Đang thi công') style = 'border-blue-200 bg-blue-50 text-blue-700';
                            return (
                              <CustomSelect
                                value={status}
                                onChange={(e) => { onUpdate(plan.id, { ...plan, progressStatus: e.target.value }) }}
                                className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${style}`}
                              >
                                <option value="Chưa thi công">Chưa thi công</option>
                                <option value="Đang thi công">Đang thi công</option>
                                <option value="Đã hoàn thành">Đã hoàn thành</option>
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
                      <td className="p-0 align-top text-right font-mono font-semibold text-slate-900">
                        {editingCell?.id === plan.id && editingCell?.field === 'orderedVolume' ? (
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-right bg-white text-slate-900 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'orderedVolume', plan.orderedVolume)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={showNumber(plan.orderedVolume)}>{showNumber(plan.orderedVolume)}</span>
                        )}
                      </td>
                      {/* TT ĐẶT HÀNG */}
                      <td className="p-0 align-middle text-center">
                        <div className="p-1">
                          {(() => {
                            const currentStatus = plan.orderedStatus || '';
                            let btnStyle = 'border-slate-200 bg-slate-50 text-slate-500';
                            if (currentStatus === 'Đã nhận hàng') {
                              btnStyle = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                            } else if (currentStatus === 'Đang giao hàng') {
                              btnStyle = 'border-amber-200 bg-amber-50 text-amber-700';
                            } else if (currentStatus === 'Đã đặt hàng') {
                              btnStyle = 'border-blue-200 bg-blue-50 text-blue-700';
                            }
                            return (
                              <CustomSelect
                                value={currentStatus}
                                onChange={(e) => { onUpdate(plan.id, { ...plan, orderedStatus: e.target.value }) }}
                                className={`w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors ${btnStyle}`}
                              >
                                <option value="">Chưa đặt hàng</option>
                                <option value="Đã đặt hàng">Đã đặt hàng</option>
                                <option value="Đang giao hàng">Đang giao hàng</option>
                                <option value="Đã nhận hàng">Đã nhận hàng</option>
                              </CustomSelect>
                            );
                          })()}
                        </div>
                      </td>
                      {/* NGÀY CÓ HÀNG */}
                      <td className="p-0 align-top text-center font-mono text-slate-600 truncate">
                        {editingCell?.id === plan.id && editingCell?.field === 'expectedDate' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-center bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'expectedDate', plan.expectedDate)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center">{plan.expectedDate || ''}</span>
                        )}
                      </td>
                      {/* NỘI DUNG VƯỚNG MẮC */}
                      <td className="p-0 align-top font-semibold text-red-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'issueContent' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full bg-white text-red-600 font-semibold focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'issueContent', plan.issueContent)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center truncate px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={plan.issueContent || ''}>{plan.issueContent || ''}</span>
                        )}
                      </td>
                      {/* TT XỬ LÝ */}
                      <td className="p-0 align-top text-slate-600">
                        {editingCell?.id === plan.id && editingCell?.field === 'issueStatus' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'issueStatus', plan.issueStatus)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center truncate px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={plan.issueStatus || ''}>{plan.issueStatus || ''}</span>
                        )}
                      </td>
                    </>
                  )}

                  {subTab === 'DOCS' && (
                    <>
                      {/* CO */}
                      <td className="p-0 align-top text-center">
                        <button
                          type="button"
                          onClick={() => onUpdate(plan.id, { ...plan, docCo: !plan.docCo })}
                          className="flex items-center justify-center w-full h-[34px] transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.docCo ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                            <circle cx="12" cy="12" r="10" fill={plan.docCo ? '#d1fae5' : '#f8fafc'} />
                            <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                      {/* CQ */}
                      <td className="p-0 align-top text-center">
                        <button
                          type="button"
                          onClick={() => onUpdate(plan.id, { ...plan, docCq: !plan.docCq })}
                          className="flex items-center justify-center w-full h-[34px] transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.docCq ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                            <circle cx="12" cy="12" r="10" fill={plan.docCq ? '#d1fae5' : '#f8fafc'} />
                            <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                      {/* KIỂM ĐỊNH PCCC */}
                      <td className="p-0 align-top text-center">
                        <button
                          type="button"
                          onClick={() => onUpdate(plan.id, { ...plan, docFireInspection: !plan.docFireInspection })}
                          className="flex items-center justify-center w-full h-[34px] transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.docFireInspection ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                            <circle cx="12" cy="12" r="10" fill={plan.docFireInspection ? '#d1fae5' : '#f8fafc'} />
                            <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                      {/* ĐÃ GỬI TỚI CT */}
                      <td className="p-0 align-top text-center">
                        <button
                          type="button"
                          onClick={() => onUpdate(plan.id, { ...plan, dispatchToSite: !plan.dispatchToSite })}
                          className="flex items-center justify-center w-full h-[34px] transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" stroke={plan.dispatchToSite ? '#10b981' : '#cbd5e1'} strokeWidth="2">
                            <circle cx="12" cy="12" r="10" fill={plan.dispatchToSite ? '#d1fae5' : '#f8fafc'} />
                            <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </td>
                      {/* NGÀY */}
                      <td className="p-0 align-top text-center font-mono text-slate-600 truncate">
                        {editingCell?.id === plan.id && editingCell?.field === 'dispatchDate' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => saveEditing(plan)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                            autoFocus
                            className="w-full text-center bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                          />
                        ) : (
                          <span onClick={() => startEditing(plan.id, 'dispatchDate', plan.dispatchDate)} className="cursor-pointer hover:bg-slate-100 flex items-center min-h-[32px] w-full justify-center px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center">{plan.dispatchDate || ''}</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* GHI CHÚ */}
                  <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-100 p-0 align-top text-slate-500">
                    {editingCell?.id === plan.id && editingCell?.field === 'notes' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="w-full bg-white text-slate-500 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <div onClick={() => startEditing(plan.id, 'notes', plan.notes)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center" title={cleanNotes(plan.notes)}>
                        <span className="truncate flex-1">{cleanNotes(plan.notes)}</span>
                      </div>
                    )}
                  </td>
                  </tr>
                );
            })}</>
          )})()}
          </tbody>
        </table>
      </div>
    </div>
  );



};
