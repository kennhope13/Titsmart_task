import React, { useState, useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

export const ActivityLogPage: React.FC = () => {
  const { activityLogs } = useRealtimeStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and group logs based on search term
  const groupedLogs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const filtered = activityLogs.filter(log => {
      const matchSearch = 
        log.user.toLowerCase().includes(keyword) ||
        log.action.toLowerCase().includes(keyword) ||
        log.project.toLowerCase().includes(keyword);
      return matchSearch;
    });

    return filtered.reduce((acc: Record<string, typeof activityLogs>, log) => {
      const dateObj = new Date(log.timestamp);
      let dateKey = 'Không xác định';
      if (!Number.isNaN(dateObj.getTime())) {
        const today = new Date();
        const isToday = dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
        dateKey = isToday ? 'Hôm nay' : dateObj.toLocaleDateString('vi-VN');
      } else if (log.timestamp) {
        dateKey = log.timestamp.split('T')[0].split(' ')[0]; // fallback
      }
      
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(log);
      return acc;
    }, {});
  }, [activityLogs, searchTerm]);

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      {/* HEADER SECTION */}
      <section className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">history</span>
          </div>
          <h1 className="page-title text-2xl font-extrabold text-slate-900 border-l-4 border-primary pl-4">Nhật ký Hoạt động</h1>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm hành động, dự án, người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          />
        </div>
      </section>

      <div className="p-6 space-y-4">
      {/* LIST SECTION */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_toggle_off</span>
            <h3 className="mt-2 text-sm font-bold text-slate-800">Chưa có nhật ký hoạt động</h3>
            <p className="text-xs text-slate-400 mt-1">Các hành động chỉnh sửa, cập nhật tiến độ, chi tiêu của bạn sẽ được ghi nhận tại đây.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, logs]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-slate-400 text-lg">calendar_month</span>
                  <h3 className="text-sm font-bold text-slate-800">{date}</h3>
                </div>
                
                <div className="space-y-3">
                  {logs.map((log) => {
                     const dateObj = new Date(log.timestamp);
                     const timeStr = !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                     
                     return (
                      <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold text-slate-800">{log.action}</span>
                          <div className="flex items-center gap-3 flex-wrap">
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
    </div>
  );
};
