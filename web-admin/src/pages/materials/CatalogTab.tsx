import React, { useMemo, useState } from 'react';
import { Material } from '../../types';

interface CatalogTabProps {
  materials: Material[];
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({ materials, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

  const filtered = useMemo(() => materials.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q) || (m.specs || '').toLowerCase().includes(q);
    const cf = columnFilters;
    const matchColumn =
      (!cf.name || (m.name || '').toLowerCase().includes((cf.name || '').toLowerCase())) &&
      (!cf.code || (m.code || '').toLowerCase().includes((cf.code || '').toLowerCase())) &&
      (!cf.category || (m.category || '').toLowerCase().includes((cf.category || '').toLowerCase())) &&
      (!cf.specs || (m.specs || '').toLowerCase().includes((cf.specs || '').toLowerCase())) &&
      (!cf.unit || (m.unit || '').toLowerCase().includes((cf.unit || '').toLowerCase()));
    return matchSearch && matchColumn;
  }), [materials, searchTerm, columnFilters]);

  return (
    <div>
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-white">
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm vật tư..." className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
        {(searchTerm || Object.values(columnFilters).some(v => v)) && (
          <button type="button" onClick={() => { setSearchTerm(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
        )}
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '7%' }} />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200 text-[12px] font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-2 py-3 text-center">STT</th>
              <th className="px-2 py-3">Danh mục</th>
              <th className="px-2 py-3">Tên Vật Tư / Thiết Bị</th>
              <th className="px-2 py-3">Mã vật tư</th>
              <th className="px-2 py-3">Thông số / Quy cách</th>
              <th className="px-2 py-3 text-center">ĐVT</th>
              <th className="px-2 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tfoot className="bg-slate-50/80 border-t border-slate-200">
            <tr>
              <td className="px-2 py-1"></td>
              <td className="px-2 py-1"><input value={columnFilters.category || ''} onChange={e => updateColumnFilter('category', e.target.value)} placeholder="Danh mục..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="px-2 py-1"><input value={columnFilters.name || ''} onChange={e => updateColumnFilter('name', e.target.value)} placeholder="Tên VT..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="px-2 py-1"><input value={columnFilters.code || ''} onChange={e => updateColumnFilter('code', e.target.value)} placeholder="Mã VT..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="px-2 py-1"><input value={columnFilters.specs || ''} onChange={e => updateColumnFilter('specs', e.target.value)} placeholder="Quy cách..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="px-2 py-1"><input value={columnFilters.unit || ''} onChange={e => updateColumnFilter('unit', e.target.value)} placeholder="ĐVT..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="px-2 py-1"></td>
            </tr>
          </tfoot>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {filtered.map((material, index) => (
          <tr key={material.id} onClick={() => onEdit(material)} className="hover:bg-blue-50/50 transition-colors align-top cursor-pointer">
            <td className="px-2 py-3 text-center text-slate-400">{index + 1}</td>
            <td className="px-2 py-3 text-slate-600 truncate" title={material.category || ''}>{material.category || '-'}</td>
            <td className="px-2 py-3 min-w-0">
              <div className="font-bold text-slate-900 truncate" title={material.name}>{material.name}</div>
            </td>
            <td className="px-2 py-3 font-mono text-slate-600 truncate" title={material.code || ''}>{material.code || '-'}</td>
            <td className="px-2 py-3 text-slate-500 truncate" title={material.specs || material.englishName || ''}>{material.specs || material.englishName || '-'}</td>
            <td className="px-2 py-3 text-center truncate">{material.unit || '-'}</td>
            <td className="px-2 py-3 text-center" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => onDelete(material)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors" title={'X\u00f3a v\u1eadt t\u01b0'}>
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </td>
          </tr>
        ))}
        {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">{'Kh\u00f4ng c\u00f3 v\u1eadt t\u01b0 n\u00e0o.'}</td></tr>}
      </tbody>
    </table>
  </div>
</div>
  );
};
