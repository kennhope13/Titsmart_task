import React, { useState } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { Modal } from './Modal';

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
  const { activityLogs, engineers } = useRealtimeStore();

  const formattedTime = formatAuditDateTime(updatedAt);
  const isSystemOrEmpty = !updatedBy || updatedBy === 'Hệ thống';

  // Extract unique user list from activityLogs and engineers
  const userList = React.useMemo(() => {
    const map = new Map<string, { name: string; count: number; lastTime: string; title?: string }>();
    
    // Aggregate log counts per user
    activityLogs.forEach(log => {
      const u = String(log.user || '').trim();
      if (!u || u === 'Hệ thống') return;
      if (!map.has(u)) {
        const eng = engineers.find(e => e.name?.toLowerCase() === u.toLowerCase());
        map.set(u, { name: u, count: 1, lastTime: log.timestamp || '', title: eng?.title });
      } else {
        const existing = map.get(u)!;
        existing.count += 1;
      }
    });

    // Make sure the current updatedBy user is in the list
    if (updatedBy && updatedBy !== 'Hệ thống' && !map.has(updatedBy)) {
      const eng = engineers.find(e => e.name?.toLowerCase() === updatedBy.toLowerCase());
      map.set(updatedBy, { name: updatedBy, count: 1, lastTime: formattedTime, title: eng?.title });
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [activityLogs, engineers, updatedBy, formattedTime]);

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
        title={`Click để xem danh sách người cập nhật`}
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Danh sách người cập nhật"
        icon="group"
        size="md"
      >
        <div className="p-3 space-y-2">
          <p className="text-xs text-slate-500 font-medium mb-3">
            Danh sách nhân sự thực hiện các hoạt động cập nhật trên hệ thống:
          </p>

          {userList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Chưa có lịch sử cập nhật.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {userList.map((user) => {
                const isCurrent = user.name.toLowerCase() === updatedBy?.toLowerCase();
                return (
                  <div 
                    key={user.name} 
                    className={`flex items-center justify-between p-2.5 transition-colors ${
                      isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCurrent ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 truncate">{user.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary rounded border border-primary/20 shrink-0">
                              Vừa cập nhật
                            </span>
                          )}
                        </div>
                        {user.title && <p className="text-[10px] text-slate-400 truncate">{user.title}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {user.count} cập nhật
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => setShowModal(false)}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </Modal>
    </>
  );
};
