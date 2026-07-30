import React from 'react';
import { ProjectMaterialPlan } from '../../types';

interface DocumentCertificateTabProps {
  data: ProjectMaterialPlan[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const TEXT = {
  search: 'Tìm hàng hóa, model, xuất xứ, chứng từ...',
  title: 'Theo dõi chứng từ hàng hóa',
  item: 'Danh mục hàng hóa',
  unit: 'ĐV',
  qty: 'SL',
  modelOrigin: 'Model/xuất xứ',
  docs: 'Chứng từ',
  note: 'Ghi chú',
  available: 'Có',
  missing: 'Chưa có',
  empty: 'Chưa có dữ liệu chứng từ.',
};

const docBadge = (label: string, ok?: boolean) => (
  <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-extrabold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
    {label}: {ok ? TEXT.available : TEXT.missing}
  </span>
);

const isSection = (item: ProjectMaterialPlan) => {
  const stt = String(item.stt || '').trim();
  const notes = String(item.notes || '').toLowerCase();
  return notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(stt);
};
const cleanNotes = (value?: string) => String(value || '').replace(/\s*\|?\s*\[(section|owner|contractor)\]\s*/gi, '').trim();

export const DocumentCertificateTab: React.FC<DocumentCertificateTabProps> = ({ data, searchQuery, setSearchQuery }) => {
  const rows = data.filter((item) => {
    if (isSection(item)) return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [item.stt, item.jobContent, item.unit, item.techSpecModel, item.techSpecOrigin, item.notes]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 p-3">
        <div className="relative w-full max-w-lg">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={TEXT.search}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="hidden text-xs font-extrabold text-slate-500 sm:block">{TEXT.title}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr>
              <th className="w-14 px-2 py-3 text-center whitespace-nowrap">TT</th>
              <th className="min-w-[320px] px-2 py-3 whitespace-nowrap">{TEXT.item}</th>
              <th className="w-16 px-2 py-3 text-center whitespace-nowrap">{TEXT.unit}</th>
              <th className="w-20 px-2 py-3 text-right whitespace-nowrap">{TEXT.qty}</th>
              <th className="min-w-[220px] px-2 py-3 whitespace-nowrap">{TEXT.modelOrigin}</th>
              <th className="min-w-[260px] px-2 py-3 whitespace-nowrap">{TEXT.docs}</th>
              <th className="min-w-[180px] px-2 py-3 whitespace-nowrap">{TEXT.note}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
            {rows.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-50">
                <td className="px-2 py-2 text-center font-mono font-bold text-slate-400 whitespace-nowrap">{item.stt || '-'}</td>
                <td className="px-2 py-2 font-bold text-slate-900">{item.jobContent}</td>
                <td className="px-2 py-2 text-center font-mono text-slate-500 whitespace-nowrap">{item.unit || '-'}</td>
                <td className="px-2 py-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{Number(item.contractVolume || 0).toLocaleString('vi-VN')}</td>
                <td className="px-2 py-2">
                  <div className="font-semibold text-slate-800">{item.techSpecModel || '-'}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{item.techSpecOrigin || '-'}</div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {docBadge('CO', item.docCo)}
                    {docBadge('CQ', item.docCq)}
                    {docBadge('Kiểm định PCCC', item.docFireInspection)}
                  </div>
                </td>
                <td className="px-2 py-2 text-slate-500">{cleanNotes(item.notes) || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-12 text-center font-medium text-slate-400">{TEXT.empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
