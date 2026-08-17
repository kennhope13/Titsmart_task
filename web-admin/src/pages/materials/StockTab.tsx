import React, { useMemo, useState } from 'react';
import { Material } from '../../types';
import { formatNumber, materialCurrentStock } from './inventoryUtils';

interface StockTabProps {
  materials: Material[];
  onEdit: (material: Material) => void;
}

export const StockTab: React.FC<StockTabProps> = ({ materials, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

  const filtered = useMemo(() => materials.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q);
    const cf = columnFilters;
    const matchColumn =
      (!cf.name || (m.name || '').toLowerCase().includes((cf.name || '').toLowerCase())) &&
      (!cf.code || (m.code || '').toLowerCase().includes((cf.code || '').toLowerCase())) &&
      (!cf.unit || (m.unit || '').toLowerCase().includes((cf.unit || '').toLowerCase())) &&
      (!cf.notes || (m.notes || '').toLowerCase().includes((cf.notes || '').toLowerCase()));
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
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full table-fixed text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
            <tr>
              <th className="w-14 p-3 text-center">STT</th>
              <th className="p-3">Vật tư</th>
              <th className="w-20 p-3 text-center">ĐVT</th>
              <th className="w-24 p-3 text-right">Tồn đầu</th>
              <th className="w-24 p-3 text-right">Nhập</th>
              <th className="w-24 p-3 text-right">Xuất</th>
              <th className="w-24 p-3 text-right">Tồn kho</th>
              <th className="w-44 p-3">Ghi chú</th>
            </tr>
          </thead>
          <tfoot className="bg-slate-50/80 border-t border-slate-200">
            <tr>
              <td className="p-1"></td>
              <td className="p-1"><input value={columnFilters.name || ''} onChange={e => updateColumnFilter('name', e.target.value)} placeholder="Vật tư..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="p-1"><input value={columnFilters.unit || ''} onChange={e => updateColumnFilter('unit', e.target.value)} placeholder="ĐVT..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
              <td className="p-1"></td>
              <td className="p-1"></td>
              <td className="p-1"></td>
              <td className="p-1"></td>
              <td className="p-1"><input value={columnFilters.notes || ''} onChange={e => updateColumnFilter('notes', e.target.value)} placeholder="Ghi chú..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
            </tr>
          </tfoot>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {filtered.map((material, index) => (
          <tr key={material.id} onClick={() => onEdit(material)} className="hover:bg-blue-50/50 transition-colors align-top cursor-pointer">
            <td className="p-3 text-center text-slate-400">{index + 1}</td>
            <td className="p-3 min-w-0">
              <div className="font-bold text-slate-900 truncate" title={material.name}>{material.name}</div>
              <div className="mt-1 text-[11px] font-mono font-normal text-slate-500 truncate" title={material.code || ''}>{material.code || '-'}</div>
            </td>
            <td className="p-3 text-center truncate">{material.unit || '-'}</td>
            <td className="p-3 text-right text-slate-500">{formatNumber(material.initialStock)}</td>
            <td className="p-3 text-right text-emerald-600 font-bold">+{formatNumber(material.totalImport)}</td>
            <td className="p-3 text-right text-amber-600 font-bold">-{formatNumber(material.totalExport)}</td>
            <td className="p-3 text-right font-bold text-primary text-sm">{formatNumber(materialCurrentStock(material))}</td>
            <td className="p-3 text-slate-500 italic truncate" title={material.notes || ''}>{material.notes || '-'}</td>
          </tr>
        ))}
        {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Không có vật tư nào.</td></tr>}
      </tbody>
    </table>
  </div>
</div>
  );
};
