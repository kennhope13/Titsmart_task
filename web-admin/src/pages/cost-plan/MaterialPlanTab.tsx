import React from 'react';
import { ProjectMaterialPlan } from '../../types';

interface MaterialPlanTabProps {
  data: ProjectMaterialPlan[];
  onEdit: (plan: ProjectMaterialPlan) => void;
  onDelete: (id: string) => void;
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

const yesNo = (value?: boolean) => value ? 'Có' : '';

export const MaterialPlanTab: React.FC<MaterialPlanTabProps> = ({
  data, onEdit, onDelete: _onDelete, searchQuery, setSearchQuery, statusFilter, setStatusFilter
}) => {
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

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">STT</th>
              <th rowSpan={2} className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">NỘI DUNG CÔNG VIỆC</th>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">ĐVT</th>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-right whitespace-nowrap">KHỐI LƯỢNG HĐ</th>
              <th colSpan={3} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">TIÊU CHUẨN KỸ THUẬT</th>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">TIẾN ĐỘ</th>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-right whitespace-nowrap">KL ĐẶT HÀNG</th>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">TT ĐẶT HÀNG</th>
              <th rowSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">NGÀY CÓ HÀNG</th>
              <th colSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">VƯỚNG MẮC/ TỒN ĐỌNG</th>
              <th colSpan={3} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">CHỨNG TỪ HÀNG HÓA</th>
              <th colSpan={2} className="border-b border-slate-200 px-1.5 py-2 text-center whitespace-nowrap">LUÂN CHUYỂN VẬT TƯ</th>
              <th rowSpan={2} className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">GHI CHÚ</th>
            </tr>
            <tr>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">CHÀO HÀNG</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">ĐÁP ỨNG KỸ THUẬT</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">TÌNH TRẠNG</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">NỘI DUNG</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">TT XỬ LÝ</th>
              <th className="border-b border-slate-200 px-1 py-1.5 text-center whitespace-nowrap">CO</th>
              <th className="border-b border-slate-200 px-1 py-1.5 text-center whitespace-nowrap">CQ</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">KIỂM ĐỊNH PCCC</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">ĐÃ GỬI TỚI CT</th>
              <th className="border-b border-slate-200 px-1.5 py-1.5 text-center whitespace-nowrap">NGÀY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={19} className="p-8 text-center text-slate-400 whitespace-nowrap">{TEXT.empty}</td>
              </tr>
            ) : data.map((plan, index) => {
              const parent = isParentRow(plan);
              if (parent) {
                return (
                  <tr key={plan.id} className="border-y border-blue-200 bg-blue-50/90 font-bold text-primary">
                    <td
                      onClick={() => onEdit(plan)}
                      className="cursor-pointer px-2 py-2 text-center font-mono text-xs font-extrabold text-primary hover:underline whitespace-nowrap"
                    >
                      {plan.stt || index + 1}
                    </td>
                    <td
                      colSpan={18}
                      onClick={() => onEdit(plan)}
                      className="cursor-pointer px-3 py-2 text-xs font-extrabold uppercase tracking-tight text-primary hover:underline whitespace-nowrap"
                      title={plan.jobContent}
                    >
                      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <span className="material-symbols-outlined flex-shrink-0 text-base">folder_open</span>
                        <span className="truncate">{plan.jobContent}</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={plan.id} onDoubleClick={() => onEdit(plan)} className="group transition-colors hover:bg-slate-50">
                  <td className="px-1.5 py-2 text-center font-mono font-bold text-slate-400 whitespace-nowrap">{plan.stt || index + 1}</td>
                  <td className="max-w-[220px] truncate px-2 py-2 font-bold leading-tight text-slate-900" title={plan.jobContent}>{plan.jobContent}</td>
                  <td className="px-1.5 py-2 text-center font-mono text-slate-500 whitespace-nowrap">{plan.unit || ''}</td>
                  <td className="px-1.5 py-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{showNumber(plan.contractVolume)}</td>
                  <td className="max-w-[90px] truncate px-1.5 py-2 text-slate-600" title={plan.techSpecModel || ''}>{plan.techSpecModel || ''}</td>
                  <td className="max-w-[90px] truncate px-1.5 py-2 text-slate-600" title={plan.techSpecOrigin || ''}>{plan.techSpecOrigin || ''}</td>
                  <td className="max-w-[70px] truncate px-1.5 py-2 text-slate-600"></td>
                  <td className="px-1.5 py-2 text-center font-mono font-bold text-slate-700 whitespace-nowrap">{showProgress(plan.progressStatus)}</td>
                  <td className="px-1.5 py-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{showNumber(plan.orderedVolume)}</td>
                  <td className="max-w-[90px] truncate px-1.5 py-2 text-center font-semibold text-slate-700" title={plan.orderedStatus || ''}>{plan.orderedStatus || ''}</td>
                  <td className="px-1.5 py-2 text-center font-mono text-slate-600 whitespace-nowrap">{plan.expectedDate || ''}</td>
                  <td className="max-w-[110px] truncate px-1.5 py-2 font-semibold text-red-600" title={plan.issueContent || ''}>{plan.issueContent || ''}</td>
                  <td className="max-w-[80px] truncate px-1.5 py-2 text-slate-600" title={plan.issueStatus || ''}>{plan.issueStatus || ''}</td>
                  <td className="px-1 py-2 text-center font-bold text-emerald-700 whitespace-nowrap">{yesNo(plan.docCo)}</td>
                  <td className="px-1 py-2 text-center font-bold text-emerald-700 whitespace-nowrap">{yesNo(plan.docCq)}</td>
                  <td className="px-1 py-2 text-center font-bold text-emerald-700 whitespace-nowrap">{yesNo(plan.docFireInspection)}</td>
                  <td className="px-1.5 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">{yesNo(plan.dispatchToSite)}</td>
                  <td className="px-1.5 py-2 text-center font-mono text-slate-600 whitespace-nowrap">{plan.dispatchDate || ''}</td>
                  <td className="max-w-[120px] truncate px-1.5 py-2 text-slate-500" title={cleanNotes(plan.notes)}>{cleanNotes(plan.notes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};




