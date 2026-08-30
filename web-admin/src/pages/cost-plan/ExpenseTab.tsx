import React, { useMemo, useState } from 'react';
import { ProjectExpense } from '../../types';
import { CustomSelect } from '@/components/common/CustomSelect';

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
  const [filterDate, setFilterDate] = useState('all');
  const [filterContent, setFilterContent] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');

  const dateOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.date).filter(Boolean)))], [data]);
  const contentOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.content).filter(Boolean)))], [data]);
  const unitOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.unit).filter(Boolean)))], [data]);

  const filteredData = useMemo(() => {
    return data.filter((exp) => {
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch = !q ||
        (exp.content || '').toLowerCase().includes(q) ||
        (exp.description || '').toLowerCase().includes(q) ||
        (exp.notes || '').toLowerCase().includes(q);
        
      const matchColumn = 
        (filterDate === 'all' || exp.date === filterDate) &&
        (filterContent === 'all' || exp.content === filterContent) &&
        (filterUnit === 'all' || exp.unit === filterUnit);
        
      return matchSearch && matchColumn;
    });
  }, [data, searchQuery, filterDate, filterContent, filterUnit]);

  return (
    <div className="flex flex-col w-full max-w-full h-full overflow-hidden">
      {/* Filter Bar */}
      <div className="flex border-b border-slate-200 bg-white px-4 py-2 gap-3 sticky top-0 z-10 items-center justify-between text-xs text-slate-600 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 font-bold text-slate-500 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium whitespace-nowrap">Ngày chi:</span>
            <CustomSelect
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="min-w-[70px] max-w-[120px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
            >
              {dateOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
              ))}
            </CustomSelect>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium whitespace-nowrap">Nội dung:</span>
            <CustomSelect
              value={filterContent}
              onChange={e => setFilterContent(e.target.value)}
              className="min-w-[120px] max-w-[250px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
            >
              {contentOptions.map(opt => {
                let label = opt;
                if (label && label.length > 30) label = label.slice(0, 30) + '...';
                return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
              })}
            </CustomSelect>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium whitespace-nowrap">ĐVT:</span>
            <CustomSelect
              value={filterUnit}
              onChange={e => setFilterUnit(e.target.value)}
              className="min-w-[60px] max-w-[90px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
            >
              {unitOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
              ))}
            </CustomSelect>
          </div>
        </div>
        
        <div className="flex-1 w-full max-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto custom-scrollbar flex-1">
        <table className="w-max text-left border-collapse">
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
            <tr>
              
              <th className="w-[85px] px-1.5 py-1.5 text-center">Ngày chi</th>
              <th className="sticky left-0 z-20 w-[160px] bg-slate-50 border-r border-slate-200/70 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nội dung / Diễn giải</th>
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
                
                <td className="w-[85px] px-1.5 py-1 text-center font-semibold text-slate-900 whitespace-nowrap">{exp.date}</td>
                <td className="sticky left-0 z-10 w-[160px] bg-white group-hover:bg-blue-50/30 border-r border-slate-100 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="w-[145px] truncate font-bold text-slate-900">{exp.content}</div>
                  <div className="w-[145px] truncate mt-0.5 text-[11px] leading-relaxed text-slate-500">{exp.description}</div>
                  {exp.notes && <div className="mt-1 inline-block rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Ghi chú: {exp.notes}</div>}
                </td>
                <td className="w-[45px] px-1 py-1 text-center font-medium">{exp.unit}</td>
                <td className="w-[65px] px-1.5 py-1 text-right font-semibold">{exp.quantity}</td>
                <td className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-right">{exp.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-right text-slate-500">{(exp.taxAmount || 0).toLocaleString('vi-VN')}</td>
                <td className="bg-rose-50/30 px-1.5 py-1.5 text-right font-extrabold text-rose-600">-{exp.totalAmount.toLocaleString('vi-VN')}</td>
                <td className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-right font-extrabold text-emerald-600">{(exp.incomeAmount || 0) > 0 ? `+${exp.incomeAmount?.toLocaleString('vi-VN')}` : '-'}</td>
                <td className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-right font-extrabold text-primary">{(exp.balanceFund || 0) > 0 ? exp.balanceFund?.toLocaleString('vi-VN') : '-'}</td>
                <td className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center">
                  {exp.invoiceUrl ? (
                    <a 
                      href={exp.invoiceUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex flex-col items-center gap-2 group/img"
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
