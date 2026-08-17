import React, { useMemo, useState } from 'react';
import { InventoryTransaction } from '../../types';
import { formatNumber } from './inventoryUtils';

interface InventoryLogTabProps {
  rows: InventoryTransaction[];
  kind: 'IMPORT' | 'EXPORT';
}

export const InventoryLogTab: React.FC<InventoryLogTabProps> = ({ rows, kind }) => {
  const isImport = kind === 'IMPORT';
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

  const filtered = useMemo(() => rows.filter((tx) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || (tx.materialName || '').toLowerCase().includes(q) || (tx.materialCode || '').toLowerCase().includes(q) || (tx.sourceOrProject || '').toLowerCase().includes(q) || (tx.notes || '').toLowerCase().includes(q);
    const cf = columnFilters;
    const matchColumn =
      (!cf.materialName || (tx.materialName || '').toLowerCase().includes((cf.materialName || '').toLowerCase())) &&
      (!cf.materialCode || (tx.materialCode || '').toLowerCase().includes((cf.materialCode || '').toLowerCase())) &&
      (!cf.sourceOrProject || (tx.sourceOrProject || '').toLowerCase().includes((cf.sourceOrProject || '').toLowerCase())) &&
      (!cf.notes || (tx.notes || '').toLowerCase().includes((cf.notes || '').toLowerCase())) &&
      (!cf.receiverName || (tx.receiverName || '').toLowerCase().includes((cf.receiverName || '').toLowerCase()));
    return matchSearch && matchColumn;
  }), [rows, searchTerm, columnFilters]);

  return (
    <div>
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-white">
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm giao dịch..." className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
        {(searchTerm || Object.values(columnFilters).some(v => v)) && (
          <button type="button" onClick={() => { setSearchTerm(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
        )}
      </div>
      <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full table-fixed text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
          <tr>
            <th className="w-14 p-3 text-center">STT</th>
            <th className="w-28 p-3">Ngày</th>
            <th className="p-3">Vật tư</th>
            <th className="w-20 p-3 text-center">ĐVT</th>
            <th className="w-28 p-3 text-right">Số lượng</th>
            <th className="w-52 p-3">{isImport ? 'Nguồn nhập' : 'Dự án nhận'}</th>
            {!isImport && <th className="w-36 p-3">Người nhận</th>}
            <th className="w-40 p-3">Ghi chú</th>
          </tr>
        </thead>
        <tfoot className="bg-slate-50/80 border-t border-slate-200">
          <tr>
            <td className="w-14 p-1"></td>
            <td className="w-28 p-1"></td>
            <td className="p-1"><input value={columnFilters.materialName || ''} onChange={e => updateColumnFilter('materialName', e.target.value)} placeholder="Vật tư..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
            <td className="w-20 p-1"></td>
            <td className="w-28 p-1"></td>
            <td className="w-52 p-1"><input value={columnFilters.sourceOrProject || ''} onChange={e => updateColumnFilter('sourceOrProject', e.target.value)} placeholder={isImport ? 'Nguồn...' : 'Dự án...'} className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
            {!isImport && <td className="w-36 p-1"><input value={columnFilters.receiverName || ''} onChange={e => updateColumnFilter('receiverName', e.target.value)} placeholder="Người nhận..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>}
            <td className="w-40 p-1"><input value={columnFilters.notes || ''} onChange={e => updateColumnFilter('notes', e.target.value)} placeholder="Ghi chú..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
          </tr>
        </tfoot>
        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
          {filtered.map((tx, index) => (
            <tr key={tx.id} className="hover:bg-slate-50 transition-colors align-top">
              <td className="p-3 text-center text-slate-400">{index + 1}</td>
              <td className="p-3 font-bold text-slate-900 truncate" title={tx.date}>{tx.date || '-'}</td>
              <td className="p-3 min-w-0">
                <div className="font-bold text-slate-800 truncate" title={tx.materialName}>{tx.materialName}</div>
                <div className="mt-1 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-[11px] font-normal text-slate-500">
                  <span className="font-mono truncate" title={tx.materialCode}>{tx.materialCode || '-'}</span>
                  <span className="truncate" title={tx.specs || ''}>{tx.specs || '-'}</span>
                  {isImport && <span className="text-slate-400">Danh mục</span>}
                  {isImport && <span className="truncate" title={tx.category || ''}>{tx.category || '-'}</span>}
                </div>
              </td>
              <td className="p-3 text-center text-slate-500 truncate">{tx.unit}</td>
              <td className={`p-3 text-right font-bold ${isImport ? 'text-emerald-600' : 'text-amber-600'}`}>{isImport ? '+' : '-'}{formatNumber(tx.quantity)}</td>
              <td className="p-3 text-slate-700 truncate" title={tx.sourceOrProject || ''}>{tx.sourceOrProject || '-'}</td>
              {!isImport && <td className="p-3 text-slate-600 truncate" title={tx.receiverName || ''}>{tx.receiverName || '-'}</td>}
              <td className="p-3 text-slate-500 italic truncate" title={tx.notes || ''}>{tx.notes || '-'}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={isImport ? 7 : 8} className="p-8 text-center text-slate-500">Chưa có giao dịch {isImport ? 'nhập' : 'xuất'} kho nào.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
  );
};
