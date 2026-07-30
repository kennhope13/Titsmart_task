import React from 'react';
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
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
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
      </div>

      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3 w-28">Ngày chi</th>
              <th className="p-3 min-w-[220px]">Nội dung / Diễn giải</th>
              <th className="p-3 w-16 text-center">ĐVT</th>
              <th className="p-3 text-right">Số lượng</th>
              <th className="p-3 text-right">Đơn giá (đ)</th>
              <th className="p-3 text-right">Thuế VAT (đ)</th>
              <th className="p-3 text-right">Thành tiền (đ)</th>
              <th className="p-3 text-right">Thực thu (đ)</th>
              <th className="p-3 text-right">Tồn quỹ (đ)</th>
              <th className="p-3 text-center">Hóa đơn</th>
              <th className="p-3 text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
            {data.map((exp) => (
              <tr key={exp.id} className="hover:bg-blue-50/30 transition-colors align-middle group">
                <td className="p-3 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{exp.date}</td>
                <td className="p-3">
                  <div className="font-bold text-slate-900">{exp.content}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{exp.description}</div>
                  {exp.notes && <div className="text-[10px] font-medium text-amber-700 mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-100">Ghi chú: {exp.notes}</div>}
                </td>
                <td className="p-3 text-center font-medium">{exp.unit}</td>
                <td className="p-3 text-right font-semibold">{exp.quantity}</td>
                <td className="p-3 text-right">{exp.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right text-slate-500">{(exp.taxAmount || 0).toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right font-extrabold text-rose-600 bg-rose-50/30">-{exp.totalAmount.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right text-emerald-600 font-extrabold">{(exp.incomeAmount || 0) > 0 ? `+${exp.incomeAmount?.toLocaleString('vi-VN')}` : '-'}</td>
                <td className="p-3 text-right font-extrabold text-primary">{(exp.balanceFund || 0) > 0 ? exp.balanceFund?.toLocaleString('vi-VN') : '-'}</td>
                <td className="p-3 text-center">
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
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(exp)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" title="Chỉnh sửa">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => { if(window.confirm('Xóa phiếu chi này?')) onDelete(exp.id) }} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors" title="Xóa">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={12} className="p-12 text-center text-slate-400 font-medium">Chưa có giao dịch chi phí nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
