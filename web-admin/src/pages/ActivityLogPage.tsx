import React, { useState, useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

export const ActivityLogPage: React.FC = () => {
  const { activityLogs } = useRealtimeStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logs based on search term
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchSearch = 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.project.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
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
      {/* TIMELINE SECTION */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_toggle_off</span>
            <h3 className="mt-2 text-sm font-bold text-slate-800">Chưa có nhật ký hoạt động</h3>
            <p className="text-xs text-slate-400 mt-1">Các hành động chỉnh sửa, cập nhật tiến độ, chi tiêu của bạn sẽ được ghi nhận tại đây.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6 py-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm"></div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-primary text-[11px] font-bold border border-blue-100">
                        <span className="material-symbols-outlined text-xs">person</span>
                        {log.user}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{log.action}</span>
                      {log.project && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                          <span className="material-symbols-outlined text-xs">business_center</span>
                          {log.project}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-medium flex-shrink-0 bg-white border border-slate-150 px-2 py-0.5 rounded">
                      {log.timestamp}
                    </span>
                  </div>
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
