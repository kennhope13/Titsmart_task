import React from 'react';
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
  return (
    <div className="flex flex-col h-full">
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

      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3 w-28">Ngày làm</th>
              <th className="p-3 min-w-[150px]">Họ tên</th>
              <th className="p-3 min-w-[200px]">Nội dung / Diễn giải</th>
              <th className="p-3 w-16 text-center">ĐVT</th>
              <th className="p-3 text-right">Số lượng</th>
              <th className="p-3 text-right">Đơn giá (đ)</th>
              <th className="p-3 text-right">Thành tiền (đ)</th>
              <th className="p-3 min-w-[180px]">Tài khoản & Người nhận</th>
              <th className="p-3 text-center">CCCD</th>
              <th className="p-3 text-center">Tình trạng</th>
              <th className="p-3 text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
            {data.map((lab) => (
              <tr key={lab.id} className="hover:bg-blue-50/30 transition-colors align-middle group">
                <td className="p-3 text-center font-bold text-slate-400">{lab.stt || '-'}</td>
                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{lab.date}</td>
                <td className="p-3 font-extrabold text-slate-900">{lab.workerName || '-'}</td>
                <td className="p-3">
                  <div className="font-bold text-slate-800">{lab.content}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{lab.description}</div>
                  {lab.notes && <div className="text-[10px] font-medium text-amber-700 mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-100">Ghi chú: {lab.notes}</div>}
                </td>
                <td className="p-3 text-center font-medium">{lab.unit}</td>
                <td className="p-3 text-right font-semibold">{lab.quantity}</td>
                <td className="p-3 text-right">{lab.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="p-3 text-right font-extrabold text-primary bg-primary/5">{lab.totalAmount.toLocaleString('vi-VN')}</td>
                <td className="p-3">
                  <div className="font-extrabold text-slate-800">{lab.bankInfo}</div>
                  <div className="font-mono text-[11px] font-bold text-blue-600 mt-0.5">{lab.bankAccount}</div>
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
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(lab)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" title="Chỉnh sửa">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => { if(window.confirm('Xóa thông tin lương công nhật này?')) onDelete(lab.id) }} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors" title="Xóa">
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
