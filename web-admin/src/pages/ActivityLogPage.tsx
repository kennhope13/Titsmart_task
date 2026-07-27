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
    <div className="px-5 py-4 space-y-4">
      {/* HEADER SECTION */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">history</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">Nhật ký Hoạt động</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Lịch sử ghi nhận thao tác chi tiết của các kỹ sư và hành động trên hệ thống theo thời gian thực</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm hành động, dự án, người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
          />
        </div>
      </section>

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
              <div key={log.id} className="relative group">
                {/* Timeline dot icon */}
                <div className={`absolute -left-[35px] top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${log.badgeBg || 'bg-slate-50'}`}>
                  <span className={`material-symbols-outlined text-[15px] ${log.iconColor || 'text-slate-600'}`}>
                    {log.icon || 'history'}
                  </span>
                </div>

                {/* Log item details */}
                <div className="bg-slate-50/40 border border-slate-100 rounded-xl p-4 hover:bg-slate-50 hover:border-slate-200 transition-all duration-200 shadow-2xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">
                        {log.user}
                      </span>
                      <span className="text-slate-600 text-xs font-semibold">
                        {log.action}
                      </span>
                      {log.project && (
                        <span className="font-bold text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100/50">
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
  );
};
