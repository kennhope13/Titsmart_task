import React, { useMemo, useState } from 'react';
import { ProjectExpense } from '../../types';

interface ExpenseTabProps {
  data: ProjectExpense[];
  onEdit: (plan: ProjectExpense) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const ExpenseTab: React.FC<ExpenseTabProps> = ({ 
  data, onEdit, onDelete, searchQuery, setSearchQuery 
}) => {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

  const filteredData = useMemo(() => {
    return data.filter((exp) => {
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch = !q ||
        (exp.content || '').toLowerCase().includes(q) ||
        (exp.description || '').toLowerCase().includes(q) ||
        (exp.notes || '').toLowerCase().includes(q);
      const cf = columnFilters;
      const matchColumn =
        (!cf.content || (exp.content || '').toLowerCase().includes((cf.content || '').toLowerCase())) &&
        (!cf.description || (exp.description || '').toLowerCase().includes((cf.description || '').toLowerCase())) &&
        (!cf.unit || (exp.unit || '').toLowerCase().includes((cf.unit || '').toLowerCase())) &&
        (!cf.date || (exp.date || '').includes(cf.date));
      return matchSearch && matchColumn;
    });
  }, [data, searchQuery, columnFilters]);
  return (
    <div className="flex flex-col w-full max-w-full h-full overflow-hidden">
      {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full max-w-md relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm phiếu chi, nội dung..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              />
            </div>
            {(searchQuery || Object.values(columnFilters).some(v => v)) && (
              <button type="button" onClick={() => { setSearchQuery(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
            )}
          </div>

      <div className="w-full max-w-full overflow-x-auto custom-scrollbar flex-1">
        <table className="w-max text-left border-collapse">
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="sticky left-0 z-20 w-[36px] bg-slate-50 border-r border-slate-200/70 px-1 py-1.5 text-center">STT</th>
              <th className="w-[85px] px-1.5 py-1.5 text-center">Ngày chi</th>
              <th className="sticky left-[36px] z-20 w-[160px] bg-slate-50 border-r border-slate-200/70 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nội dung / Diễn giải</th>
              <th className="w-[45px] px-1 py-1.5 text-center">ĐVT</th>
              <th className="w-[65px] px-1.5 py-1.5 text-right">Số lượng</th>
              <th className="w-[90px] px-1.5 py-1.5 text-right">Đơn giá (đ)</th>
              <th className="w-[85px] px-1.5 py-1.5 text-right">Thuế VAT (đ)</th>
              <th className="w-[95px] px-1.5 py-1.5 text-right">Thành tiền (đ)</th>
              <th className="w-[90px] px-1.5 py-1.5 text-right">Thực thu (đ)</th>
              <th className="w-[90px] px-1.5 py-1.5 text-right">Tồn quỹ (đ)</th>
              <th className="w-[70px] px-1.5 py-1.5 text-center">Hóa đơn</th>
              <th className="w-[60px] px-1.5 py-1.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
            {filteredData.map((exp) => (
              <tr key={exp.id} className="group align-middle transition-colors hover:bg-blue-50/30">
                <td className="sticky left-0 z-10 w-[36px] bg-white group-hover:bg-blue-50/30 border-r border-slate-100 px-1 py-1 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                <td className="w-[85px] px-1.5 py-1 text-center font-semibold text-slate-900 whitespace-nowrap">{exp.date}</td>
                <td className="sticky left-[36px] z-10 w-[160px] bg-white group-hover:bg-blue-50/30 border-r border-slate-100 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="w-[145px] truncate font-bold text-slate-900">{exp.content}</div>
                  <div className="w-[145px] truncate mt-0.5 text-[11px] leading-relaxed text-slate-500">{exp.description}</div>
                  {exp.notes && <div className="mt-1 inline-block rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Ghi chú: {exp.notes}</div>}
                </td>
                <td className="w-[45px] px-1 py-1 text-center font-medium">{exp.unit}</td>
                <td className="w-[65px] px-1.5 py-1 text-right font-semibold">{exp.quantity}</td>
                <td className="px-1.5 py-1.5 text-right">{exp.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="px-1.5 py-1.5 text-right text-slate-500">{(exp.taxAmount || 0).toLocaleString('vi-VN')}</td>
                <td className="bg-rose-50/30 px-1.5 py-1.5 text-right font-extrabold text-rose-600">-{exp.totalAmount.toLocaleString('vi-VN')}</td>
                <td className="px-1.5 py-1.5 text-right font-extrabold text-emerald-600">{(exp.incomeAmount || 0) > 0 ? `+${exp.incomeAmount?.toLocaleString('vi-VN')}` : '-'}</td>
                <td className="px-1.5 py-1.5 text-right font-extrabold text-primary">{(exp.balanceFund || 0) > 0 ? exp.balanceFund?.toLocaleString('vi-VN') : '-'}</td>
                <td className="px-1.5 py-1.5 text-center">
                  {exp.invoiceUrl ? (
                    <a 
                      href={exp.invoiceUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex flex-col items-center gap-1 group/img"
                    >
                      <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden shadow-sm group-hover/img:border-primary transition-colors">
                        <img src={exp.invoiceUrl} alt="invoice" className="w-full h-full object-cover opacity-90 group-hover/img:opacity-100" />
                      </div>
                      <span className="text-[9px] font-bold text-primary">Xem</span>
                    </a>
                  ) : (
                    <span className="text-slate-300 material-symbols-outlined text-lg" title="Không có hóa đơn">image_not_supported</span>
                  )}
                 </td>
                 <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50/30 border-l border-slate-100 p-3 text-center">
                   <div className="flex items-center justify-center gap-2 transition-opacity">
                    <button onClick={() => onEdit(exp)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" title="Chỉnh sửa">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => onDelete(exp.id)} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors" title="Xóa">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr><td colSpan={12} className="p-12 text-center text-slate-400 font-medium">Chưa có giao dịch chi phí nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
