import React, { useState, useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

const ACTION_TYPES = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Tiến độ', value: 'tien-do' },
  { label: 'Chi phí / Lương', value: 'chi-phi' },
  { label: 'Vật tư / Kho', value: 'vat-tu' },
  { label: 'Hồ sơ', value: 'ho-so' },
  { label: 'Khác', value: 'khac' },
];

const classifyAction = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('tiến độ') || lower.includes('thi công') || lower.includes('nhập khẩu') || lower.includes('đồng bộ')) return 'tien-do';
  if (lower.includes('chi') || lower.includes('lương') || lower.includes('hợp đồng') || lower.includes('thanh toán') || lower.includes('chi phí')) return 'chi-phi';
  if (lower.includes('kho') || lower.includes('vật tư') || lower.includes('mua sắm') || lower.includes('mua hàng') || lower.includes('đặt hàng')) return 'vat-tu';
  if (lower.includes('hồ sơ') || lower.includes('chứng từ') || lower.includes('tài liệu')) return 'ho-so';
  return 'khac';
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(activityLogs.map((log) => log.user).filter(Boolean))).sort();
  }, [activityLogs]);

  const filteredActivityLogs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return activityLogs.filter((log) => {
      const matchSearch =
        !keyword ||
        (log.user || '').toLowerCase().includes(keyword) ||
        (log.action || '').toLowerCase().includes(keyword) ||
        (log.project || '').toLowerCase().includes(keyword);

      const type = classifyAction(log.action || '');
      const matchType = typeFilter === 'ALL' || type === typeFilter;
      const matchUser = userFilter === 'ALL' || log.user === userFilter;

      let matchDate = true;
      const logDate = parseDateKey(log.timestamp || '');
      if (dateFrom && logDate !== 'unknown') matchDate = matchDate && logDate >= dateFrom;
      if (dateTo && logDate !== 'unknown') matchDate = matchDate && logDate <= dateTo;

      return matchSearch && matchType && matchUser && matchDate;
    });
  }, [activityLogs, searchTerm, typeFilter, userFilter, dateFrom, dateTo]);

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
    searchTerm.trim() !== '' ||
    typeFilter !== 'ALL' ||
    userFilter !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setUserFilter('ALL');
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
        <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3 w-full">
            <div className="relative flex-1 min-w-0">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm thao tác, người dùng, dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-1/2 xl:w-auto min-w-[170px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full sm:w-1/2 xl:w-auto min-w-[170px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">Tất cả người dùng</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
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
                  <span className="material-symbols-outlined text-slate-400 text-lg">calendar_month</span>
                  <h3 className="text-sm font-bold text-slate-800">{date}</h3>
                </div>
                
                <div className="space-y-3 w-full">
                  {logs.map((log) => {
                     const timeStr = parseTime(log.timestamp || '');
                     
                     return (
                      <div key={log.id} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <span className="block w-full text-sm font-bold text-slate-800 break-words">{log.action}</span>
                          <div className="flex w-full flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1 text-slate-600 text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-xs">person</span>
                              {log.user}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="inline-flex items-center gap-1 text-primary text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-xs">business_center</span>
                              {log.project || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                        {timeStr && (
                          <span className="text-[12px] text-slate-500 font-medium flex-shrink-0 flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-md">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {timeStr}
                          </span>
                        )}
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
