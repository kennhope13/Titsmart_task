import React, { useState, useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

const parseDateKey = (timestamp: string): string => {
  const value = (timestamp || '').trim();
  if (!value) return 'unknown';

  // Try ISO datetime first
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString().split('T')[0];
  }

  // Try `HH:mm DD/MM/YYYY` or `DD/MM/YYYY`
  const parts = value.split(' ');
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const [d, m, y] = datePart.split('/');
  if (y && m && d) return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

  // Try yyyy-mm-dd substring
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

export const ActivityLogPage: React.FC = () => {
  const { activityLogs } = useRealtimeStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      let matchDate = true;
      const logDate = parseDateKey(log.timestamp || '');
      if (dateFrom && logDate !== 'unknown') matchDate = matchDate && logDate >= dateFrom;
      if (dateTo && logDate !== 'unknown') matchDate = matchDate && logDate <= dateTo;

      return matchDate;
    });
  }, [activityLogs, dateFrom, dateTo]);

  const groupedLogs = useMemo(() => {
    return filteredActivityLogs.reduce((acc: Record<string, typeof activityLogs>, log) => {
      const dateKey = parseDateKey(log.timestamp || '');
      const label = formatDateLabel(dateKey);
      if (!acc[label]) acc[label] = [];
      acc[label].push(log);
      return acc;
    }, {});
  }, [filteredActivityLogs]);

  const hasFilters =
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      {/* HEADER SECTION */}
      <section className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">history</span>
          </div>
          <h1 className="page-title text-2xl font-extrabold text-slate-900 border-l-4 border-primary pl-4 uppercase">NHẬT KÝ HOẠT ĐỘNG</h1>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="text-[11px] font-bold text-slate-500">Từ</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="text-[11px] font-bold text-slate-500">đến</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              Xóa lọc
            </button>
          )}
        </div>
      </section>

      {/* LIST SECTION */}
      <section className="bg-white flex-1 p-6">
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_toggle_off</span>
            <h3 className="mt-2 text-sm font-bold text-slate-800">Chưa có nhật ký hoạt động</h3>
            <p className="text-xs text-slate-400 mt-1">Các hành động chỉnh sửa, cập nhật tiến độ, chi tiêu của bạn sẽ được ghi nhận tại đây.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, logs]) => (
              <div key={date} className="space-y-4 w-full">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-primary/60 text-lg">calendar_month</span>
                  <h3 className="text-sm font-extrabold text-slate-800">{date}</h3>
                  <span className="text-[10px] font-bold text-slate-400">({logs.length} thao tác)</span>
                </div>
                
                <div className="space-y-2.5 w-full">
                  {logs.map((log) => {
                     const timeStr = parseTime(log.timestamp || '');
                      
                     return (
                      <div key={log.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm border border-white ${log.badgeBg || 'bg-slate-50'}`}>
                          <span className={`material-symbols-outlined text-[16px] ${log.iconColor || 'text-slate-500'}`}>{log.icon || 'history'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-800 leading-relaxed break-words">{log.action}</p>
                            {timeStr && (
                              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 whitespace-nowrap mt-0.5">
                                <span className="material-symbols-outlined text-[11px]">schedule</span>
                                {timeStr}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                              <span className="material-symbols-outlined text-[11px]">person</span>
                              {log.user}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary/70">
                              <span className="material-symbols-outlined text-[11px]">business_center</span>
                              {log.project || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
