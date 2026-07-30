import React from 'react';
import { ProjectPurchasing } from '../../types';

interface PurchasingTabProps {
  data: ProjectPurchasing[];
  onEdit: (plan: ProjectPurchasing) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}

const money = (value: unknown) => Number(value || 0).toLocaleString('vi-VN');
const numberText = (value: unknown) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
};
const percentText = (value: unknown) => {
  const n = Number(value || 0);
  if (!n) return '';
  return n <= 1 ? `${Math.round(n * 100)}%` : `${n}%`;
};
const isSectionRow = (pur: ProjectPurchasing) => String(pur.notes || '').toLowerCase().includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(pur.stt || '').trim());
const cleanNotes = (value?: string) => String(value || '').replace(/\s*\|?\s*\[section\]\s*/gi, '').trim();
const computedVat = (pur: ProjectPurchasing) => Number(pur.vatAmount || 0) || (Number(pur.volumeOrder || 0) * Number(pur.unitPrice || 0) * Number(pur.vatRate || 0)) / 100;
const computedTotal = (pur: ProjectPurchasing) => Number(pur.totalAmount || 0) || (Number(pur.volumeOrder || 0) * Number(pur.unitPrice || 0)) + computedVat(pur);
const computedPayment = (pur: ProjectPurchasing) => Number(pur.prepayAmount || 0) || (computedTotal(pur) * Number(pur.prepayPercent || 0));

const TEXT = {
  searchPlaceholder: 'Tìm kiếm nội dung mua hàng, hợp đồng, hóa đơn, ghi chú...',
  filter: 'Lọc TT đặt hàng:',
  all: 'Tất cả',
  notOrdered: 'Chưa đặt hàng',
  ordered: 'Đã đặt hàng',
  delivering: 'Đang giao hàng',
  received: 'Đã nhận hàng',
  content: 'NỘI DUNG',
  unit: 'ĐVT',
  contractVolume: 'KHỐI LƯỢNG HĐ',
  orderVolume: 'KHỐI LƯỢNG ĐH',
  unitPrice: 'ĐƠN GIÁ',
  vatRate: 'THUẾ VAT',
  vatAmount: 'TIỀN THUẾ',
  total: 'THÀNH TIỀN',
  prepayPercent: '% TẠM ỨNG',
  payment: 'THANH TOÁN',
  orderStatus: 'TT ĐẶT HÀNG',
  contractStatus: 'TT HỢP ĐỒNG',
  paymentDate: 'NGÀY THANH TOÁN',
  invoice: 'HÓA ĐƠN',
  note: 'GHI CHÚ',
  actions: 'THAO TÁC',
  none: 'Chưa',
  edit: 'Chỉnh sửa',
  delete: 'Xóa',
  confirmDelete: 'Xóa hạng mục mua hàng này?',
  empty: 'Không tìm thấy dữ liệu mua hàng phù hợp.',
};

export const PurchasingTab: React.FC<PurchasingTabProps> = ({
  data, onEdit, onDelete, searchQuery, setSearchQuery, statusFilter, setStatusFilter
}) => {
  const filteredData = data.filter((pur) => {
    const section = isSectionRow(pur);
    const matchesSearch = !searchQuery.trim() || [pur.stt, pur.content, pur.unit, pur.orderStatus, pur.contractStatus, pur.invoiceStatus, pur.notes]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || section || pur.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 md:flex-row">
        <div className="relative w-full flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
          <input
            type="text"
            placeholder={TEXT.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <span className="whitespace-nowrap text-xs font-bold text-slate-500">{TEXT.filter}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">{TEXT.all}</option>
            <option value={TEXT.notOrdered}>{TEXT.notOrdered}</option>
            <option value={TEXT.ordered}>{TEXT.ordered}</option>
            <option value={TEXT.delivering}>{TEXT.delivering}</option>
            <option value={TEXT.received}>{TEXT.received}</option>
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        <table className="w-full min-w-[1680px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr>
              <th className="w-14 px-2 py-3 text-center whitespace-nowrap">STT</th>
              <th className="w-[300px] px-2 py-3 whitespace-nowrap">{TEXT.content}</th>
              <th className="w-16 px-2 py-3 text-center whitespace-nowrap">{TEXT.unit}</th>
              <th className="w-24 px-2 py-3 text-right whitespace-nowrap">{TEXT.contractVolume}</th>
              <th className="w-24 px-2 py-3 text-right whitespace-nowrap">{TEXT.orderVolume}</th>
              <th className="w-28 px-2 py-3 text-right whitespace-nowrap">{TEXT.unitPrice}</th>
              <th className="w-20 px-2 py-3 text-center whitespace-nowrap">{TEXT.vatRate}</th>
              <th className="w-28 px-2 py-3 text-right whitespace-nowrap">{TEXT.vatAmount}</th>
              <th className="w-32 px-2 py-3 text-right whitespace-nowrap">{TEXT.total}</th>
              <th className="w-24 px-2 py-3 text-center whitespace-nowrap">{TEXT.prepayPercent}</th>
              <th className="w-32 px-2 py-3 text-right whitespace-nowrap">{TEXT.payment}</th>
              <th className="w-32 px-2 py-3 text-center whitespace-nowrap">{TEXT.orderStatus}</th>
              <th className="w-32 px-2 py-3 text-center whitespace-nowrap">{TEXT.contractStatus}</th>
              <th className="w-32 px-2 py-3 text-center whitespace-nowrap">{TEXT.paymentDate}</th>
              <th className="w-28 px-2 py-3 text-center whitespace-nowrap">{TEXT.invoice}</th>
              <th className="w-[180px] px-2 py-3 whitespace-nowrap">{TEXT.note}</th>
              <th className="w-24 px-2 py-3 text-center whitespace-nowrap">{TEXT.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            {filteredData.map((pur) => {
              if (isSectionRow(pur)) {
                return (
                  <tr key={pur.id} className="border-y border-blue-200 bg-blue-50/90 font-bold text-primary">
                    <td className="px-2 py-2 text-center font-mono text-xs font-extrabold text-primary whitespace-nowrap">{pur.stt || '-'}</td>
                    <td colSpan={16} className="px-3 py-2 text-xs font-extrabold uppercase tracking-tight text-primary whitespace-nowrap" title={pur.content}>
                      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <span className="material-symbols-outlined flex-shrink-0 text-base">folder_open</span>
                        <span className="truncate">{pur.content}</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={pur.id} onDoubleClick={() => onEdit(pur)} className="group align-middle transition-colors hover:bg-slate-50">
                  <td className="px-2 py-2 text-center font-mono font-bold text-slate-400 whitespace-nowrap">{pur.stt || '-'}</td>
                  <td className="px-2 py-2">
                    <div className="max-w-[290px] truncate font-bold leading-tight text-slate-900" title={pur.content}>{pur.content || '-'}</div>
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500 whitespace-nowrap">{pur.unit || '-'}</td>
                  <td className="px-2 py-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{numberText(pur.volumeContract)}</td>
                  <td className="bg-blue-50/30 px-2 py-2 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">{numberText(pur.volumeOrder)}</td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{money(pur.unitPrice)}</td>
                  <td className="px-2 py-2 text-center font-mono whitespace-nowrap">{percentText(pur.vatRate)}</td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{money(computedVat(pur))}</td>
                  <td className="px-2 py-2 text-right font-mono font-extrabold text-primary whitespace-nowrap">{money(computedTotal(pur))}</td>
                  <td className="px-2 py-2 text-center font-mono whitespace-nowrap">{percentText(pur.prepayPercent)}</td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">{money(computedPayment(pur))}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-flex justify-center rounded-md border px-2 py-1 text-[9px] font-bold ${
                      pur.orderStatus === TEXT.received ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      pur.orderStatus === TEXT.delivering ? 'border-amber-200 bg-amber-50 text-amber-700' :
                      pur.orderStatus === TEXT.ordered ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}>
                      {pur.orderStatus || TEXT.notOrdered}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">{pur.contractStatus || '-'}</td>
                  <td className="px-2 py-2 text-center font-mono text-slate-600 whitespace-nowrap">{pur.paymentDate || ''}</td>
                  <td className="px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">{pur.invoiceStatus || ''}</td>
                  <td className="max-w-[180px] truncate px-2 py-2 text-slate-500" title={cleanNotes(pur.notes)}>{cleanNotes(pur.notes)}</td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => onEdit(pur)} className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700" title={TEXT.edit}>
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => { if (window.confirm(TEXT.confirmDelete)) onDelete(pur.id); }} className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700" title={TEXT.delete}>
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr><td colSpan={17} className="p-12 text-center font-medium text-slate-400">{TEXT.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
