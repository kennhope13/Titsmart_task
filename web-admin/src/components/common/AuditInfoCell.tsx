import React, { useState } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { Modal } from './Modal';

export const formatAuditDateTime = (isoString?: string): string => {
  if (!isoString || typeof isoString !== 'string') return '';
  const str = isoString.trim();
  if (!str) return '';
  // Handle pre-formatted timestamps like "12:03 14/09/2026"
  if (/^\d{1,2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${timeStr} ${dateStr}`;
  } catch {
    return str;
  }
};

export const parseAuditTime = (str?: string): number => {
  if (!str || typeof str !== 'string') return 0;
  const trimmed = str.trim();
  if (!trimmed) return 0;

  // Check VN datetime format (HH:mm DD/MM/YYYY or DD/MM/YYYY) first to prevent MM/DD/YYYY misparsing
  const vnMatch = trimmed.match(/(?:(\d{1,2}):(\d{2})(?::\d{2})?\s+)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (vnMatch) {
    const [, hh = '0', mm = '0', d, m, y] = vnMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
    if (!isNaN(dt.getTime())) return dt.getTime();
  }

  // Try standard ISO format
  const isoMs = new Date(trimmed).getTime();
  return isNaN(isoMs) ? 0 : isoMs;
};

export const AuditInfoCell: React.FC<{ updatedBy?: string; updatedAt?: string; projectCode?: string; className?: string }> = ({
  updatedBy,
  updatedAt,
  projectCode,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);
  const activityLogs = useRealtimeStore(s => s.activityLogs);
  const engineers = useRealtimeStore(s => s.engineers);

  const formattedTime = formatAuditDateTime(updatedAt);
  const isSystemOrEmpty = !updatedBy || updatedBy.trim() === '';

  const userList = React.useMemo(() => {
    if (!showModal) return [];
    const map = new Map<string, { name: string; count: number; lastTime: string; rawTimeMs: number; title?: string }>();

    // Helper to normalize user name (e.g. Admin -> Quản trị hệ thống)
    const normalizeUser = (nameStr?: string): string => {
      const trimmed = String(nameStr || '').trim();
      if (!trimmed) return '';
      if (trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'quản trị hệ thống') {
        return 'Quản trị hệ thống';
      }
      return trimmed;
    };

    // 1. Current row's updatedBy is always prioritized
    const currentMs = parseAuditTime(updatedAt);
    if (updatedBy && updatedBy !== 'Excel Sync' && !updatedBy.toLowerCase().includes('excel')) {
      const u = normalizeUser(updatedBy);
      const eng = (engineers || []).find(e => e?.name?.toLowerCase() === u.toLowerCase());
      const title = u === 'Quản trị hệ thống' ? 'Chủ tịch / Admin' : eng?.title;
      map.set(u, { name: u, count: 1, lastTime: formattedTime, rawTimeMs: currentMs, title });
    }

    // 2. Filter activity logs strictly by projectCode if provided
    const filteredLogs = (activityLogs || []).filter(log => {
      if (!log) return false;
      if (projectCode) {
        const logProj = String(log.project || '').trim().toLowerCase();
        const pCode = String(projectCode).trim().toLowerCase();
        return logProj === pCode;
      }
      return true;
    });

    filteredLogs.forEach(log => {
      const rawUser = String(log.user || '').trim();
      if (!rawUser || rawUser === 'Excel Sync' || rawUser.toLowerCase().includes('excel')) return;
      const u = normalizeUser(rawUser);
      const logTimeMs = parseAuditTime(log.timestamp);
      const displayTime = formatAuditDateTime(log.timestamp);
      if (!map.has(u)) {
        const eng = (engineers || []).find(e => e?.name?.toLowerCase() === u.toLowerCase());
        const title = u === 'Quản trị hệ thống' ? 'Chủ tịch / Admin' : eng?.title;
        map.set(u, { name: u, count: 1, lastTime: displayTime, rawTimeMs: logTimeMs, title });
      } else {
        const existing = map.get(u)!;
        existing.count += 1;
        if (logTimeMs > existing.rawTimeMs) {
          existing.rawTimeMs = logTimeMs;
          existing.lastTime = displayTime;
        }
      }
    });

    // Sort: Current row's updater first, then by latest timestamp descending
    const currentNorm = normalizeUser(updatedBy);
    return Array.from(map.values()).sort((a, b) => {
      if (currentNorm && a.name.toLowerCase() === currentNorm.toLowerCase()) return -1;
      if (currentNorm && b.name.toLowerCase() === currentNorm.toLowerCase()) return 1;
      return b.rawTimeMs - a.rawTimeMs;
    });
  }, [showModal, activityLogs, engineers, updatedBy, updatedAt, formattedTime, projectCode]);

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
              {userList.map((user, index) => {
                const isLatest = index === 0;
                return (
                  <div 
                    key={user.name} 
                    className={`flex items-center justify-between p-2.5 transition-colors ${
                      isLatest ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isLatest ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 truncate">{user.name}</span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary rounded border border-primary/20 shrink-0">
                              Vừa cập nhật
                            </span>
                          )}
                        </div>
                        {user.title && <p className="text-[10px] text-slate-400 truncate">{user.title}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      {user.lastTime && (
                        <span className="text-[10px] text-slate-500 font-mono font-medium">
                          {user.lastTime}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {user.count} thao tác
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
