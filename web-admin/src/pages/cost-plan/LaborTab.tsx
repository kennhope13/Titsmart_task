import React, { useMemo, useState } from 'react';
import { LaborPayroll } from '../../types';

interface LaborTabProps {
  data: LaborPayroll[];
  onEdit: (plan: LaborPayroll) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}

export const LaborTab: React.FC<LaborTabProps> = ({ 
  data, onEdit, onDelete, searchQuery, setSearchQuery, statusFilter, setStatusFilter 
}) => {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

  const filteredData = useMemo(() => {
    return data.filter((lab) => {
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch = !q ||
        (lab.workerName || '').toLowerCase().includes(q) ||
        (lab.content || '').toLowerCase().includes(q) ||
        (lab.description || '').toLowerCase().includes(q) ||
        (lab.bankInfo || '').toLowerCase().includes(q);
      const cf = columnFilters;
      const matchColumn =
        (!cf.workerName || (lab.workerName || '').toLowerCase().includes((cf.workerName || '').toLowerCase())) &&
        (!cf.content || (lab.content || '').toLowerCase().includes((cf.content || '').toLowerCase())) &&
        (!cf.unit || (lab.unit || '').toLowerCase().includes((cf.unit || '').toLowerCase())) &&
        (!cf.date || (lab.date || '').includes(cf.date)) &&
        (!cf.bankAccount || (lab.bankAccount || '').toLowerCase().includes((cf.bankAccount || '').toLowerCase()));
      return matchSearch && matchColumn;
    });
  }, [data, searchQuery, columnFilters]);
  return (
    <div className="flex flex-col w-full max-w-full h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm nhân công, diễn giải..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
        {(searchQuery || Object.values(columnFilters).some(v => v)) && (
          <button type="button" onClick={() => { setSearchQuery(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
        )}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Lọc thanh toán:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm min-w-[150px]"
          >
            <option value="ALL">Tất cả</option>
            <option value="Chưa thanh toán">Chưa thanh toán</option>
            <option value="Đã thanh toán">Đã thanh toán</option>
          </select>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto custom-scrollbar flex-1">
        <table className="w-max text-left border-collapse">
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="sticky left-0 z-20 w-[36px] bg-slate-50 border-r border-slate-200/70 px-1 py-1.5 text-center">STT</th>
              <th className="w-[85px] px-1.5 py-1.5 text-center">Ngày làm</th>
              <th className="sticky left-[36px] z-20 w-[160px] bg-slate-50 border-r border-slate-200/70 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Họ tên</th>
              <th className="w-[160px] px-1.5 py-1">Nội dung / Diễn giải</th>
              <th className="w-[45px] px-1 py-1.5 text-center">ĐVT</th>
              <th className="w-[65px] px-1.5 py-1.5 text-right">Số lượng</th>
              <th className="w-[85px] px-1.5 py-1.5 text-right">Đơn giá (đ)</th>
              <th className="w-[95px] px-1.5 py-1.5 text-right">Thành tiền (đ)</th>
              <th className="w-[180px] px-1.5 py-1.5">Tài khoản & Người nhận</th>
              <th className="w-[95px] px-1.5 py-1.5 text-center">CCCD</th>
              <th className="w-[85px] px-1.5 py-1.5 text-center">Tình trạng</th>
              <th className="w-[60px] px-1.5 py-1.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
            {filteredData.map((lab) => (
              <tr key={lab.id} className="group align-middle transition-colors hover:bg-blue-50/30">
                <td className="sticky left-0 z-10 w-[36px] bg-white group-hover:bg-blue-50/30 border-r border-slate-100 px-1 py-1 text-center font-bold text-slate-400">{lab.stt || '-'}</td>
                <td className="w-[85px] px-1.5 py-1 text-center font-semibold text-slate-900 whitespace-nowrap">{lab.date}</td>
                <td className="sticky left-[36px] z-20 w-[160px] bg-white group-hover:bg-blue-50/30 border-r border-slate-100 px-1.5 py-1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="w-[145px] truncate font-extrabold text-slate-900">{lab.workerName || '-'}</div>
                </td>
                <td className="w-[160px] px-1.5 py-1">
                  <div className="w-[145px] truncate font-bold text-slate-800">{lab.content}</div>
                  <div className="w-[145px] truncate mt-0.5 text-[11px] text-slate-500">{lab.description}</div>
                  {lab.notes && <div className="mt-1 inline-block rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Ghi chú: {lab.notes}</div>}
                </td>
                <td className="w-[45px] px-1 py-1 text-center font-medium">{lab.unit}</td>
                <td className="w-[65px] px-1.5 py-1 text-right font-semibold">{lab.quantity}</td>
                <td className="px-1.5 py-1.5 text-right">{lab.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="bg-primary/5 px-1.5 py-1.5 text-right font-extrabold text-primary">{lab.totalAmount.toLocaleString('vi-VN')}</td>
                <td className="px-1.5 py-1.5">
                  <div className="font-extrabold text-slate-800">{lab.bankInfo}</div>
                  <div className="mt-0.5 font-mono text-[11px] font-bold text-blue-600">{lab.bankAccount}</div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {lab.idCardFrontUrl && (
                      <a href={lab.idCardFrontUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors">
                        <span className="material-symbols-outlined text-[12px]">badge</span> Mặt trước
                      </a>
                    )}
                    {lab.idCardBackUrl && (
                      <a href={lab.idCardBackUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors">
                        <span className="material-symbols-outlined text-[12px]">badge</span> Mặt sau
                      </a>
                    )}
                    {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300 text-[10px] italic">Không có</span>}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold border ${
                    lab.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className="material-symbols-outlined text-[12px]">{lab.paymentStatus === 'Đã thanh toán' ? 'check_circle' : 'pending'}</span>
                    {lab.paymentStatus}
                  </span>
                 </td>
                 <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50/30 border-l border-slate-100 p-3 text-center">
                   <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(lab)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" title="Chỉnh sửa">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => onDelete(lab.id)} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors" title="Xóa">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={12} className="p-12 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu nhân công phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
