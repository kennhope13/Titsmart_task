import React, { useState } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { Modal } from './Modal';

export const formatAuditDateTime = (isoString?: string): string => {
  if (!isoString || typeof isoString !== 'string') return '';
  const str = isoString.trim();
  if (!str) return '';
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

  const vnMatch = trimmed.match(/(?:(\d{1,2}):(\d{2})(?::\d{2})?\s+)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (vnMatch) {
    const [, hh = '0', mm = '0', d, m, y] = vnMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
    if (!isNaN(dt.getTime())) return dt.getTime();
  }

  const isoMs = new Date(trimmed).getTime();
  return isNaN(isoMs) ? 0 : isoMs;
};

const renderActionText = (text: string) => {
  if (!text) return text;
  let mainText = text;
  let detailText = '';
  const detailIndex = text.indexOf(' |Detail:');
  if (detailIndex !== -1) {
    mainText = text.substring(0, detailIndex);
    detailText = text.substring(detailIndex + 9);
  }

  const splitIndex = mainText.indexOf(': ');
  let renderedMain;
  if (splitIndex !== -1) {
    const actionPart = mainText.substring(0, splitIndex + 1);
    const variablePart = mainText.substring(splitIndex + 2);
    renderedMain = (
      <>
        {actionPart} <strong className="font-semibold text-slate-900">{variablePart}</strong>
      </>
    );
  } else {
    renderedMain = <>{mainText}</>;
  }

  return (
    <span>
      {renderedMain}
      {detailText && <span className="block text-[10px] text-slate-500 italic mt-0.5">{detailText}</span>}
    </span>
  );
};

interface AuditUserLogItem {
  action: string;
  timestamp: string;
  rawTimeMs: number;
}

interface AuditUserInfo {
  name: string;
  count: number;
  lastTime: string;
  rawTimeMs: number;
  title?: string;
  logs: AuditUserLogItem[];
}

export const AuditInfoCell: React.FC<{ updatedBy?: string; updatedAt?: string; projectCode?: string; className?: string }> = ({
  updatedBy,
  updatedAt,
  projectCode,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [expandedUser, setExpandedUser] = useState<Record<string, boolean>>({});
  const activityLogs = useRealtimeStore(s => s.activityLogs);
  const engineers = useRealtimeStore(s => s.engineers);

  const formattedTime = formatAuditDateTime(updatedAt);
  const isSystemOrEmpty = !updatedBy || updatedBy.trim() === '';

  const toggleExpand = (userName: string) => {
    setExpandedUser(prev => ({ ...prev, [userName]: !prev[userName] }));
  };

  const userList = React.useMemo(() => {
    if (!showModal) return [];
    const map = new Map<string, AuditUserInfo>();

    const normalizeUser = (nameStr?: string): string => {
      const trimmed = String(nameStr || '').trim();
      if (!trimmed) return '';
      if (trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'quản trị hệ thống') {
        return 'Quản trị hệ thống';
      }
      return trimmed;
    };

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
      const actionText = String(log.action || '').trim() || 'Cập nhật thông tin trên hệ thống';

      if (!map.has(u)) {
        const eng = (engineers || []).find(e => e?.name?.toLowerCase() === u.toLowerCase());
        const title = u === 'Quản trị hệ thống' ? 'Chủ tịch / Admin' : eng?.title;
        map.set(u, {
          name: u,
          count: 1,
          lastTime: displayTime,
          rawTimeMs: logTimeMs,
          title,
          logs: [{ action: actionText, timestamp: log.timestamp, rawTimeMs: logTimeMs }]
        });
      } else {
        const existing = map.get(u)!;
        existing.count += 1;
        if (logTimeMs > existing.rawTimeMs) {
          existing.rawTimeMs = logTimeMs;
          existing.lastTime = displayTime;
        }
        if (!existing.logs.some(l => l.action === actionText && l.timestamp === log.timestamp)) {
          existing.logs.push({ action: actionText, timestamp: log.timestamp, rawTimeMs: logTimeMs });
        }
      }
    });

    // Handle row's updatedBy if not present or has empty logs
    const currentMs = parseAuditTime(updatedAt);
    if (updatedBy && updatedBy !== 'Excel Sync' && !updatedBy.toLowerCase().includes('excel')) {
      const u = normalizeUser(updatedBy);
      if (!map.has(u)) {
        const eng = (engineers || []).find(e => e?.name?.toLowerCase() === u.toLowerCase());
        const title = u === 'Quản trị hệ thống' ? 'Chủ tịch / Admin' : eng?.title;
        map.set(u, {
          name: u,
          count: 1,
          lastTime: formattedTime,
          rawTimeMs: currentMs,
          title,
          logs: [{ action: 'Cập nhật thông tin công việc', timestamp: updatedAt || '', rawTimeMs: currentMs }]
        });
      } else {
        const existing = map.get(u)!;
        if (currentMs > existing.rawTimeMs) {
          existing.rawTimeMs = currentMs;
          existing.lastTime = formattedTime;
        }
        if (existing.logs.length === 0) {
          existing.logs.push({ action: 'Cập nhật thông tin công việc', timestamp: updatedAt || '', rawTimeMs: currentMs });
        }
      }
    }

    // Sort logs inside each user by rawTimeMs descending
    const currentNorm = normalizeUser(updatedBy);
    return Array.from(map.values()).map(u => ({
      ...u,
      logs: u.logs.sort((a, b) => b.rawTimeMs - a.rawTimeMs)
    })).sort((a, b) => {
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
        title={`Click để xem danh sách người cập nhật và nhật ký chi tiết`}
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
        title="Danh sách người cập nhật & Nhật ký chi tiết"
        icon="history"
        size="lg"
      >
        <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-500 font-medium">
            Chi tiết nhật ký công việc và nội dung cập nhật của từng nhân sự trên hệ thống:
          </p>

          {userList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs italic">
              Chưa có lịch sử cập nhật.
            </div>
          ) : (
            <div className="space-y-3">
              {userList.map((user, index) => {
                const isLatest = index === 0;
                const isExpanded = Boolean(expandedUser[user.name]);
                const displayedLogs = isExpanded ? user.logs : user.logs.slice(0, 3);
                const hasMore = user.logs.length > 3;

                return (
                  <div 
                    key={user.name} 
                    className={`border rounded-xl overflow-hidden bg-white shadow-xs transition-all ${
                      isLatest ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isLatest ? 'bg-primary text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">{user.name}</span>
                            {isLatest && (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-primary/10 text-primary rounded-full border border-primary/20 shrink-0">
                                Vừa cập nhật
                              </span>
                            )}
                          </div>
                          {user.title && <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.title}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        {user.lastTime && (
                          <span className="text-[11px] text-slate-600 font-mono font-bold">
                            {user.lastTime}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {user.logs.length} nội dung cập nhật
                        </span>
                      </div>
                    </div>

                    {/* Detailed Activity Logs List */}
                    <div className="p-3 bg-white">
                      <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">history_edu</span>
                        <span>Nội dung cập nhật chi tiết:</span>
                      </div>
                      <div className="space-y-1.5">
                        {displayedLogs.map((log, lIdx) => (
                          <div 
                            key={lIdx} 
                            className="flex items-start justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 gap-3"
                          >
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <span className="material-symbols-outlined text-[14px] text-blue-600 shrink-0 mt-0.5">edit_note</span>
                              <div className="text-slate-800 leading-snug font-normal break-words text-[11px]">
                                {renderActionText(log.action)}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 pt-0.5 whitespace-nowrap">
                              {formatAuditDateTime(log.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {hasMore && (
                        <button
                          onClick={() => toggleExpand(user.name)}
                          className="mt-2.5 text-[11px] font-bold text-primary hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{isExpanded ? 'Thu gọn' : `Xem thêm ${user.logs.length - 3} nội dung cập nhật khác...`}</span>
                          <span className="material-symbols-outlined text-[14px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      )}
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
            className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </Modal>
    </>
  );
};
