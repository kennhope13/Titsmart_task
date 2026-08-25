import React, { useMemo, useState } from 'react';
import { ActivityLog } from '../../types';
import { CustomSelect } from '@/components/common/CustomSelect';

interface ActivityLogTabProps {
  data: ActivityLog[];
  selectedProject: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

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

const ICON_MAP: Record<string, { icon: string; badgeBg: string; iconColor: string }> = {
  'tien-do': { icon: 'trending_up', badgeBg: 'bg-blue-50', iconColor: 'text-blue-500' },
  'chi-phi': { icon: 'payments', badgeBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  'vat-tu': { icon: 'warehouse', badgeBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  'ho-so': { icon: 'drafts', badgeBg: 'bg-violet-50', iconColor: 'text-violet-500' },
  'khac': { icon: 'history', badgeBg: 'bg-slate-50', iconColor: 'text-slate-500' },
};

const BADGE_LABEL: Record<string, { label: string; cls: string }> = {
  'tien-do': { label: 'Tiến độ', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'chi-phi': { label: 'Chi phí', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'vat-tu': { label: 'Vật tư', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  'ho-so': { label: 'Hồ sơ', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  'khac': { label: 'Khác', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

// Parse date từ timestamp "HH:mm DD/MM/YYYY"
const parseDateKey = (timestamp: string): string => {
  const parts = (timestamp || '').split(' ');
  const datePart = parts[1] || '';
  const [d, m, y] = datePart.split('/');
  if (y && m && d) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
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

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  data,
  selectedProject,
  searchQuery,
  setSearchQuery,
}) => {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('ALL');

  const projectLogs = useMemo(() => {
    if (!selectedProject) return data;
    return data.filter(
      (log) =>
        !log.project ||
        log.project === selectedProject ||
        log.project.toLowerCase().includes(selectedProject.toLowerCase()),
    );
  }, [data, selectedProject]);

  const uniqueUsers = useMemo(() => {
    const users = Array.from(new Set(projectLogs.map((l) => l.user).filter(Boolean)));
    return users.sort();
  }, [projectLogs]);

  const filteredLogs = useMemo(() => {
    return projectLogs.filter((log) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.user || '').toLowerCase().includes(q) ||
        (log.project || '').toLowerCase().includes(q);

      const type = classifyAction(log.action || '');
      const matchType = typeFilter === 'ALL' || type === typeFilter;
      const matchUser = userFilter === 'ALL' || log.user === userFilter;

      let matchDate = true;
      if (dateFrom || dateTo) {
        const dateKey = parseDateKey(log.timestamp || '');
        if (dateKey !== 'unknown') {
          if (dateFrom) matchDate = matchDate && dateKey >= dateFrom;
          if (dateTo) matchDate = matchDate && dateKey <= dateTo;
        }
      }

      return matchSearch && matchType && matchUser && matchDate;
    });
  }, [projectLogs, searchQuery, typeFilter, userFilter, dateFrom, dateTo]);

  // Group by date
  const groupedLogs = useMemo(() => {
    const groups: { dateKey: string; label: string; logs: ActivityLog[] }[] = [];
    const map = new Map<string, ActivityLog[]>();
    for (const log of filteredLogs) {
      const key = parseDateKey(log.timestamp || '');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    // Sort groups descending
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    for (const key of sortedKeys) {
      groups.push({ dateKey: key, label: formatDateLabel(key), logs: map.get(key)! });
    }
    return groups;
  }, [filteredLogs]);

  const hasFilters =
    !!searchQuery ||
    typeFilter !== 'ALL' ||
    userFilter !== 'ALL' ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setUserFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const stats = useMemo(() => {
    const byType = Object.fromEntries(
      ['tien-do', 'chi-phi', 'vat-tu', 'ho-so', 'khac'].map((t) => [
        t,
        projectLogs.filter((l) => classifyAction(l.action || '') === t).length,
      ]),
    );
    return { total: projectLogs.length, byType };
  }, [projectLogs]);

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ minHeight: 0 }}>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-4 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        {(['tien-do', 'chi-phi', 'vat-tu', 'ho-so', 'khac'] as const).map((type) => {
          const badge = BADGE_LABEL[type];
          const iconInfo = ICON_MAP[type];
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'ALL' : type)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all shadow-sm hover:shadow-md ${
                typeFilter === type
                  ? `${badge.cls} border-current ring-2 ring-offset-1 ring-current/30`
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${iconInfo.iconColor}`}>{iconInfo.icon}</span>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{badge.label}</div>
                <div className="text-lg font-black text-slate-800 leading-tight">{stats.byType[type]}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap flex-shrink-0">
        <div className="relative min-w-[200px] max-w-xs w-full md:w-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm thao tác, người dùng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <CustomSelect
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
        >
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </CustomSelect>

        <CustomSelect
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
        >
          <option value="ALL">Tất cả người dùng</option>
          {uniqueUsers.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </CustomSelect>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400">Từ</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
          <span className="text-[11px] font-bold text-slate-400">đến</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
            Xóa lọc
          </button>
        )}

        <div className="ml-auto text-[11px] font-bold text-slate-400">
          {filteredLogs.length}/{stats.total} nhật ký
        </div>
      </div>

      {/* Log list — scrollable body */}
      <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">history</span>
            <p className="font-bold text-sm">Không có nhật ký hoạt động nào.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs text-primary font-bold hover:underline">
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-4 space-y-6">
            {groupedLogs.map(({ dateKey, label, logs }) => (
              <div key={dateKey}>
                {/* Date group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[15px] text-primary/60">calendar_today</span>
                  <span className="text-[11px] font-extrabold text-primary/80 uppercase tracking-widest">{label}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400">{logs.length} thao tác</span>
                </div>

                {/* Items — NO absolute timeline line, use border-left on item instead */}
                <div className="space-y-2 pl-1">
                  {logs.map((log) => {
                    const type = classifyAction(log.action || '');
                    const iconInfo = ICON_MAP[type] || ICON_MAP['khac'];
                    const badge = BADGE_LABEL[type] || BADGE_LABEL['khac'];
                    const icon = log.icon || iconInfo.icon;
                    const badgeBg = log.badgeBg || iconInfo.badgeBg;
                    const iconColor = log.iconColor || iconInfo.iconColor;

                    return (
                      <div key={log.id} className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white ${badgeBg}`}>
                          <span className={`material-symbols-outlined text-[15px] ${iconColor}`}>{icon}</span>
                        </div>

                        {/* Card */}
                        <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-slate-800 leading-relaxed break-words">
                                {log.action}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                                  <span className="material-symbols-outlined text-[11px]">person</span>
                                  {log.user}
                                </span>
                                {log.project && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary/70">
                                    <span className="material-symbols-outlined text-[11px]">folder</span>
                                    {log.project}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                            {/* Time only (no date — already grouped) */}
                            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                              {(log.timestamp || '').split(' ')[0]}
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
      </div>
    </div>
  );
};
