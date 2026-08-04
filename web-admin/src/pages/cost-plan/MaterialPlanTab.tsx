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

const compareStt = (a?: string, b?: string) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const aStr = a.toString().trim();
  const bStr = b.toString().trim();
  const aParts = aStr.split('.').map(p => parseInt(p, 10));
  const bParts = bStr.split('.').map(p => parseInt(p, 10));
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? -1;
    const bVal = bParts[i] ?? -1;
    if (aVal !== bVal) return aVal - bVal;
  }
  return aStr.localeCompare(bStr, 'vi', { numeric: true, sensitivity: 'base' });
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

  const filteredData = useMemo(() => {
    return data.filter((plan) => {
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
          <tfoot className="bg-slate-50/80 border-t border-slate-200">
            <tr>
              <td style={{ width: 32 }} className="px-1 py-1"></td>
              <td style={{ width: 280 }} className="px-1 py-1"><input value={columnFilters.jobContent || ''} onChange={e => updateColumnFilter('jobContent', e.target.value)} placeholder="Nội dung..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td style={{ width: 40 }} className="px-1 py-1"><input value={columnFilters.unit || ''} onChange={e => updateColumnFilter('unit', e.target.value)} placeholder="ĐVT..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td style={{ width: 50 }} className="px-1 py-1"></td>
              {subTab === 'TECH' && (
                <>
                  <td style={{ width: 70 }} className="px-1 py-1"></td>
                  <td style={{ width: 70 }} className="px-1 py-1"></td>
                  <td style={{ width: 70 }} className="px-1 py-1"></td>
                  <td style={{ width: 60 }} className="px-1 py-1"></td>
                </>
              )}
              {subTab === 'ORDER' && (
                <>
                  <td style={{ width: 52 }} className="px-1 py-1"></td>
                  <td style={{ width: 75 }} className="px-1 py-1"></td>
                  <td style={{ width: 70 }} className="px-1 py-1"></td>
                  <td style={{ width: 80 }} className="px-1 py-1"></td>
                  <td style={{ width: 80 }} className="px-1 py-1"></td>
                </>
              )}
              {subTab === 'DOCS' && (
                <>
                  <td style={{ width: 40 }} className="px-1 py-1"></td>
                  <td style={{ width: 40 }} className="px-1 py-1"></td>
                  <td style={{ width: 60 }} className="px-1 py-1"></td>
                  <td style={{ width: 60 }} className="px-1 py-1"></td>
                  <td style={{ width: 70 }} className="px-1 py-1"></td>
                </>
              )}
              <td style={{ width: 110 }} className="px-1 py-1"><input value={columnFilters.notes || ''} onChange={e => updateColumnFilter('notes', e.target.value)} placeholder="Ghi chú..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
            </tr>
          </tfoot>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {(() => {
              const map = new Map<string, any>();
              const roots: any[] = [];
              const source = filteredData;
              source.forEach(t => map.set(t.id, { ...t, children: [] }));
              source.forEach(t => {
                if (t.parentId && map.has(t.parentId)) {
                  map.get(t.parentId)!.children.push(map.get(t.id));
                } else {
                  roots.push(map.get(t.id));
                }
              });

              const flattened: any[] = [];
              const flattenTree = (nodes: any[], depth: number = 0, prefix: string = '') => {
                nodes.sort((a, b) => {
                  const sttCompare = compareStt(a.stt, b.stt);
                  if (sttCompare !== 0) return sttCompare;
                  return (a.jobContent || '').localeCompare((b.jobContent || ''), 'vi', { numeric: true, sensitivity: 'base' });
                });
                nodes.forEach((node, idx) => {
                  let computedStt = node.stt;
                  let isSec = isParentRow(node);
                  if (depth > 0) {
                      const currentNum = (idx + 1).toString();
                      computedStt = depth === 1 ? currentNum : (depth > 1 ? `${prefix}.${currentNum}` : currentNum);
                      isSec = false;
                  }
                  flattened.push({ ...node, depth, computedStt, isSec });
                  flattenTree(node.children, depth + 1, computedStt || '');
                });
              };
              flattenTree(roots, 0);

              if (flattened.length === 0) {
                return <tr><td colSpan={subTab === 'TECH' ? 9 : 10} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td></tr>;
              }

              return flattened.map((plan, index) => {
                const parent = plan.isSec;
                const depth = plan.depth || 0;
                const paddingLeft = depth > 0 ? `${depth * 1.5}rem` : '0';
                
                if (parent) {
                return (
                  <tr key={plan.id} className="border-y border-blue-200 bg-blue-50/90 font-bold text-primary">
                    <td
                      onClick={() => onEdit(plan)}
                      className="sticky left-0 z-10 bg-blue-50/95 cursor-pointer px-1 py-2 text-center font-mono text-xs font-extrabold text-primary hover:underline whitespace-nowrap border-r border-blue-200"
                    >
                      {plan.stt || index + 1}
                    </td>
                    <td
                      colSpan={subTab === 'TECH' ? 8 : 9}
                      onClick={() => onEdit(plan)}
                      className="sticky left-[32px] z-10 bg-blue-50/95 cursor-pointer px-3 py-2 text-xs font-extrabold uppercase tracking-tight text-primary hover:underline whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                      title={plan.jobContent}
                    >
                      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <span className="material-symbols-outlined flex-shrink-0 text-base">folder_open</span>
                        <span className="truncate">{plan.jobContent}</span>
                        {onAddSubtask && (
                          <button onClick={(e) => { e.stopPropagation(); onAddSubtask(plan); }} className="ml-1 p-0.5 rounded text-blue-300 hover:text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center flex-shrink-0" title="Thêm mục con">
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }} className="ml-1 p-0.5 rounded text-blue-300 hover:text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center flex-shrink-0" title="Xóa">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={plan.id} onDoubleClick={() => onEdit(plan)} className="group transition-colors hover:bg-slate-50">
                  {/* STT */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 px-1 py-2 text-center font-mono font-bold text-slate-400 whitespace-nowrap overflow-hidden">
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
                      <span onClick={() => startEditing(plan.id, 'stt', plan.computedStt || plan.stt)} className="cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded block w-full">{plan.computedStt || plan.stt || index + 1}</span>
                    )}
                  </td>
                  {/* NỘI DUNG */}
                  <td className="sticky left-[32px] z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left font-bold text-slate-900 overflow-hidden">
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
                      <div style={{ paddingLeft }} className="flex items-center gap-1 overflow-hidden whitespace-nowrap group-hover:bg-slate-100">
                        {depth > 0 && <span className="material-symbols-outlined text-[12px] text-slate-400 flex-shrink-0">subdirectory_arrow_right</span>}
                        <span onClick={() => startEditing(plan.id, 'jobContent', plan.jobContent)} className="cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded block truncate flex-1">{plan.jobContent}</span>
                        {onAddSubtask && (
                          <button onClick={(e) => { e.stopPropagation(); onAddSubtask(plan); }} className="ml-1 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-slate-200 transition-colors inline-flex items-center flex-shrink-0" title="Thêm mục con">
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
                  <td className="overflow-hidden truncate px-1.5 py-1.5 text-slate-500">
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




