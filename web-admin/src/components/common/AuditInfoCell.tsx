import React, { useState } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';

export const formatAuditDateTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${timeStr} ${dateStr}`;
  } catch {
    return isoString || '';
  }
};

export const AuditInfoCell: React.FC<{ updatedBy?: string; updatedAt?: string; className?: string }> = ({
  updatedBy,
  updatedAt,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);
  const activityLogs = useRealtimeStore(state => state.activityLogs);

  const formattedTime = formatAuditDateTime(updatedAt);
  const isSystemOrEmpty = !updatedBy || updatedBy === 'Hệ thống';

  // Filter logs for this specific user if modal is open
  const userLogs = React.useMemo(() => {
    if (!updatedBy || updatedBy === 'Hệ thống') return [];
    return activityLogs.filter(log => {
      const logUser = String(log.user || '').trim().toLowerCase();
      const targetUser = String(updatedBy).trim().toLowerCase();
      return logUser === targetUser || logUser.includes(targetUser) || targetUser.includes(logUser);
    });
  }, [activityLogs, updatedBy]);

  if (isSystemOrEmpty && !formattedTime) {
    return <div className="text-center w-full"><span className="text-slate-300 italic text-[10px]">-</span></div>;
  }

  if (isSystemOrEmpty) {
    return <div className="text-center w-full"><span className="text-slate-300 italic text-[10px]">-</span></div>;
  }

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        title={`Click để xem lịch sử hoạt động của: ${updatedBy}`}
        className={`flex flex-col items-center justify-center text-center text-[10px] leading-tight w-full cursor-pointer hover:bg-slate-100/80 p-1 rounded transition-colors group/audit ${className}`}
      >
        <span className="font-bold text-slate-700 truncate w-full group-hover/audit:text-primary underline decoration-dotted decoration-slate-300 underline-offset-2">
          {updatedBy}
        </span>
        {formattedTime && (
          <span className="text-slate-400 font-mono text-[9px] mt-0.5" title={formattedTime}>
            {formattedTime}
          </span>
        )}
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-base border border-primary/30">
                  {updatedBy.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Lịch sử cập nhật: {updatedBy}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Lần sửa gần nhất: {formattedTime || 'Chưa có thông tin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
              {userLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">history_toggle_off</span>
                  <p className="text-xs">Chưa ghi nhận lịch sử hoạt động chi tiết nào của người dùng này.</p>
                </div>
              ) : (
                userLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3 hover:border-slate-200 transition-colors">
                    <div className={`p-1.5 rounded-md ${log.badgeBg || 'bg-blue-50'} ${log.iconColor || 'text-blue-600'} shrink-0 mt-0.5`}>
                      <span className="material-symbols-outlined text-base">{log.icon || 'edit'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-700">{log.project || 'Hệ thống'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug break-words">{log.action}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
