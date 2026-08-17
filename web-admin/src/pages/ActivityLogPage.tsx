import React, { useState, useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';

const parseDateKey = (timestamp: string): string => {
  const value = (timestamp || '').trim();
  if (!value) return 'unknown';

  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString().split('T')[0];
  }

  const parts = value.split(' ');
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const [d, m, y] = datePart.split('/');
  if (y && m && d) return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

  const isoMatch = value.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  return 'unknown';
};

const formatDateLabel = (dateKey: string): string => {
  if (dateKey === 'unknown') return 'Không xác định';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateKey === today) return 'Hôm nay';
  if (dateKey === yesterday) return 'Hôm qua';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

const parseTime = (timestamp: string): string => {
  const value = (timestamp || '').trim();
  if (!value) return '';

  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const parts = value.split(' ');
  if (parts.length > 1) return parts[0];
  return value;
};

// Helper to determine action type for styling
const getActionTypeInfo = (action: string) => {
  const text = action.toLowerCase();
  if (text.includes('xóa') || text.includes('delete') || text.includes('hủy')) {
    return { color: 'text-red-700', bg: 'bg-red-50' };
  }
  if (text.includes('tạo mới') || text.includes('thêm') || text.includes('add') || text.includes('create')) {
    return { color: 'text-emerald-700', bg: 'bg-emerald-50' };
  }
  if (text.includes('chỉnh sửa') || text.includes('cập nhật') || text.includes('update') || text.includes('edit')) {
    return { color: 'text-primary', bg: 'bg-blue-50' };
  }
  return { color: 'text-slate-700', bg: 'bg-slate-100' };
};

const renderActionText = (text: string) => {
  if (!text) return text;
  const splitIndex = text.indexOf(': ');
  if (splitIndex !== -1) {
    const actionPart = text.substring(0, splitIndex + 1);
    const variablePart = text.substring(splitIndex + 2);
    return (
      <>
        {actionPart} <span className="font-extrabold">{variablePart}</span>
      </>
    );
  }
  return text;
};

export const ActivityLogPage: React.FC = () => {
  const { activityLogs } = useRealtimeStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      let matchDate = true;
      const logDate = parseDateKey(log.timestamp || '');
      if (dateFrom && logDate !== 'unknown') matchDate = matchDate && logDate >= dateFrom;
      if (dateTo && logDate !== 'unknown') matchDate = matchDate && logDate <= dateTo;

      let matchSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchSearch = 
          (log.action || '').toLowerCase().includes(query) ||
          (log.user || '').toLowerCase().includes(query) ||
          (log.project || '').toLowerCase().includes(query);
      }

      return matchDate && matchSearch;
    });
  }, [activityLogs, dateFrom, dateTo, searchQuery]);

  const groupedLogs = useMemo(() => {
    return filteredLogs.reduce((acc: Record<string, typeof activityLogs>, log) => {
      const dateKey = parseDateKey(log.timestamp || '');
      const label = formatDateLabel(dateKey);
      const headerText = dateKey !== 'unknown' ? (() => {
        const [y, m, d] = dateKey.split('-');
        return `${d}/${m}/${y}`;
      })() : 'Không xác định';

      const finalLabel = label === headerText ? headerText : `${label} (${headerText})`;
      
      if (!acc[finalLabel]) acc[finalLabel] = [];
      acc[finalLabel].push(log);
      return acc;
    }, {});
  }, [filteredLogs]);

  const hasFilters = dateFrom !== '' || dateTo !== '' || searchQuery !== '';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  let globalIndex = 0;

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-hidden">
      {/* HEADER SECTION */}
      <section className="border-b border-slate-200 bg-white pl-6 pr-[140px] py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">history</span>
          </div>
          <h1 className="page-title text-2xl font-extrabold text-slate-900 border-l-4 border-primary pl-4 uppercase">NHẬT KÝ HOẠT ĐỘNG</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100 whitespace-nowrap">
            {filteredLogs.length} thao tác
          </span>
          <div className="relative w-full sm:w-64 flex items-center">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm hành động, nhân sự..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
              <span className="text-[11px] font-bold text-slate-500 mr-2">Từ</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-28"
              />
            </div>
            
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
              <span className="text-[11px] font-bold text-slate-500 mr-2">Đến</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-28"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              Xóa lọc
            </button>
          )}
        </div>
      </section>

      {/* TABLE SECTION */}
      <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col pb-4">
        <section className="flex-1 grid grid-cols-1 gap-0 overflow-hidden">
          <div className="bg-white border-b border-r border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                  <tr>
                    <th className="text-center p-3 bg-slate-50 w-16">STT</th>
                    <th className="text-left p-3 bg-slate-50 w-40">Thời gian</th>
                    <th className="text-left p-3 bg-slate-50 w-48">Nhân sự</th>
                    <th className="text-left p-3 bg-slate-50 w-64">Dự án</th>
                    <th className="text-left p-3 bg-slate-50">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history_toggle_off</span>
                          <span className="font-semibold text-sm">Chưa có nhật ký hoạt động</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedLogs).map(([dateLabel, logs]) => (
                      <React.Fragment key={dateLabel}>
                        <tr className="bg-slate-50/80 border-t-2 border-slate-200 group">
                          <td colSpan={5} className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-[18px]">calendar_month</span>
                              <span className="text-xs font-extrabold text-slate-700">{dateLabel}</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-400 shadow-xs">
                                {logs.length} thao tác
                              </span>
                            </div>
                          </td>
                        </tr>
                        {logs.map((log) => {
                          globalIndex++;
                          const timeStr = parseTime(log.timestamp || '');
                          const actionInfo = getActionTypeInfo(log.action);

                          return (
                            <tr key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-slate-50 transition-colors border-t border-slate-100">
                              <td className="p-3 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                                {globalIndex}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-slate-600 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  {timeStr}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                  <span className="material-symbols-outlined text-[13px] text-slate-500">person</span>
                                  {log.user}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-primary font-bold border border-blue-100">
                                  <span className="material-symbols-outlined text-[13px]">business_center</span>
                                  {log.project || 'Hệ thống'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${actionInfo.bg} ${actionInfo.color} border border-white leading-relaxed`}>
                                  {renderActionText(log.action)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Chi tiết Nhật ký hoạt động">
        {selectedLog && (
          <div className="space-y-4 text-sm mt-2">
            <div className="flex flex-col gap-1 border-b pb-3 border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Thời gian</span>
              <span className="font-bold text-slate-800">{selectedLog.timestamp}</span>
            </div>
            <div className="flex flex-col gap-1 border-b pb-3 border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Nhân sự</span>
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-slate-400">person</span>
                {selectedLog.user}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-b pb-3 border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Dự án</span>
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">business_center</span>
                {selectedLog.project || 'Hệ thống'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Thao tác / Nội dung chi tiết</span>
              <div className="mt-1 p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium leading-relaxed">
                {renderActionText(selectedLog.action)}
              </div>
            </div>
            <div className="pt-4 mt-4 border-t flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-5 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors">
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
