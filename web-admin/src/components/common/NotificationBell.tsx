import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';
import { useUIStore } from '../../services/uiStore';

interface NotificationBellProps {
  isSidebar?: boolean;
  isExpanded?: boolean;
}

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
};

const isNotificationForUser = (notification: any, user: any, engineers: any[] = []) => {
  if (!user) return true;
  const role = String(user.role || '').toLowerCase();
  const username = String(user.username || '').toLowerCase();
  const name = String(user.name || '').toLowerCase();
  const userId = String(user.id || '').toLowerCase();

  const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || username === 'admin';
  if (isAdmin) return true; // Admins and managers can see all notifications

  // Find engineer object corresponding to current user if any
  const myEng = engineers.find(e => 
    (e.id && String(e.id).toLowerCase() === userId) ||
    (e.name && String(e.name).toLowerCase() === name) ||
    (e.username && String(e.username).toLowerCase() === username) ||
    (e.phone && user.phone && String(e.phone) === String(user.phone))
  );
  const myNames = [name, username, myEng?.name?.toLowerCase()].filter(Boolean) as string[];

  // 1. Check explicit recipient properties if available
  if (notification.recipientId) {
    if (String(notification.recipientId).toLowerCase() === userId || (myEng && String(notification.recipientId).toLowerCase() === String(myEng.id).toLowerCase())) {
      return true;
    }
  }
  if (notification.recipientName) {
    const rName = String(notification.recipientName).toLowerCase();
    if (myNames.some(n => rName.includes(n) || n.includes(rName))) {
      return true;
    }
  }

  // 2. Check metadata in type (e.g. 'task_assigned:::RECIPIENT_ID:::RECIPIENT_NAME')
  const typeStr = String(notification.type || '');
  if (typeStr.includes(':::')) {
    const parts = typeStr.split(':::');
    const targetId = parts[1]?.toLowerCase();
    const targetName = parts[2]?.toLowerCase();
    if (targetId && (targetId === userId || (myEng && targetId === String(myEng.id).toLowerCase()))) return true;
    if (targetName && myNames.some(n => targetName.includes(n) || n.includes(targetName))) return true;
    return false; // Type specified a target recipient that didn't match this non-admin user
  }

  // 3. Check title / message for task assignment & task acceptance (e.g. 'Giao việc: Phan Ngọc Huy', 'Nhân sự đã nhận việc', 'Báo cáo hoàn thành công việc')
  const title = String(notification.title || '');
  const message = String(notification.message || '');
  
  if (title.startsWith('Giao việc:') || title.includes('được giao') || typeStr.startsWith('task_assigned')) {
    if (title.startsWith('Giao việc:')) {
      const assignedTo = title.replace('Giao việc:', '').trim().toLowerCase();
      if (myNames.some(n => assignedTo.includes(n) || n.includes(assignedTo))) return true;
      return false; // Targeted to someone else
    }
    const match = message.match(/cho\s+([^.]+)\.?$/i);
    if (match) {
      const assignedTo = match[1].trim().toLowerCase();
      if (assignedTo === 'bạn' || myNames.some(n => assignedTo.includes(n) || n.includes(assignedTo))) return true;
      return false; // Targeted to someone else
    }
  }

  // 4. Task acceptance and task completion notifications: Only for assigner or admin
  if (title.includes('đã nhận việc') || title.includes('hoàn thành công việc') || typeStr.startsWith('task_accepted') || typeStr.startsWith('task_completed')) {
    // If user is neither admin nor the creator/assigner specified in metadata, hide it
    return false;
  }

  // 5. Attendance notifications (e.g. 'Chấm công vào ca', 'Chấm công ra ca'): ONLY for Admin/Managers, do not send to regular staff
  if (title.includes('Chấm công') || message.includes('check-in') || message.includes('check-out') || typeStr.startsWith('attendance')) {
    // Non-admin users should NEVER receive attendance notifications
    return false;
  }

  // 6. Leave requests: Only for Admin/Managers (unless it's an approval notification for the specific user)
  if (title.includes('nghỉ phép') || message.includes('nghỉ phép') || typeStr.startsWith('leave')) {
    if (title.includes('đã được duyệt') || title.includes('từ chối')) {
      if (myNames.some(n => message.toLowerCase().includes(n))) return true;
    }
    return false;
  }

  return true;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ isSidebar = false, isExpanded = false }) => {
  const navigate = useNavigate();
  const { notifications, engineers, markNotificationRead, clearNotifications } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const showNotificationBell = useUIStore(state => state.showNotificationBell);
  const autoShowNotificationPopup = useUIStore(state => state.autoShowNotificationPopup);
  
  const [showPopover, setShowPopover] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [incomingPopupNotif, setIncomingPopupNotif] = useState<any | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const knownNotifIdsRef = useRef<Set<string> | null>(null);

  // ─── Dragging functionality state & refs (transient per session, resets to default on reload) ───
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const bellElem = popoverRef.current;
    if (!bellElem) return;

    const rect = bellElem.getBoundingClientRect();
    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 50, dragStartRef.current.initX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 50, dragStartRef.current.initY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  const handleBellClick = (e: React.MouseEvent) => {
    // If user dragged the bell, do not open popover
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    setShowPopover(!showPopover);
  };

  // Per-user dismissed/cleared notification IDs (so each user account only deletes notifications for themselves)
  const userStorageKey = useMemo(() => {
    const uKey = user?.id || user?.username || 'guest';
    return `buildcore_dismissed_notifs_${uKey}`;
  }, [user]);

  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(() => {
    try {
      const uKey = user?.id || user?.username || 'guest';
      const raw = localStorage.getItem(`buildcore_dismissed_notifs_${uKey}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Keep dismissed state in sync if user changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(userStorageKey);
      setDismissedNotifIds(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setDismissedNotifIds(new Set());
    }
  }, [userStorageKey]);

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Xóa tất cả các thông báo đã đọc CHO RIÊNG TÀI KHOẢN HIỆN TẠI
    const readIds = displayNotifications.filter(n => n.read).map(n => n.id);
    if (readIds.length === 0) return;

    setDismissedNotifIds(prev => {
      const next = new Set(prev);
      readIds.forEach(id => next.add(id));
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
    setShowPopover(false);
    setShowCenterModal(false);
    setIncomingPopupNotif(null);
    sessionStorage.setItem('has_shown_center_notif_modal', 'true');

    // Điều hướng theo loại thông báo
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    const link = notification.link || '';

    if (link) {
      navigate(link);
    } else if (title.includes('đã nhận việc') || title.includes('hoàn thành công việc') || (notification.type && notification.type.startsWith('task_accepted')) || (notification.type && notification.type.startsWith('task_completed'))) {
      navigate('/task-assignment?tab=assigned', { state: { tab: 'assigned' } });
    } else if (title.includes('hồ sơ') || message.includes('hồ sơ')) {
      navigate('/document-tracking');
    } else if (title.includes('điểm danh') || message.includes('điểm danh')) {
      navigate('/attendance');
    } else if (title.includes('giao việc') || title.includes('công việc') || title.includes('nhiệm vụ') || message.includes('nhiệm vụ') || message.includes('công việc')) {
      navigate('/my-tasks');
    } else if (title.includes('nhật ký') || message.includes('nhật ký')) {
      navigate('/field-logs');
    }
  };

  const displayNotifications = useMemo(() => {
    const seen = new Set<string>();
    const uniqueList: typeof notifications = [];
    notifications.forEach(n => {
      // Filter out notifications not intended for this user
      if (!isNotificationForUser(n, user, engineers)) return;
      // Filter out notifications dismissed by this specific user account
      if (dismissedNotifIds.has(n.id)) return;

      const cleanTitle = n.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
      const key = `${cleanTitle}:::${n.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(n);
      }
    });
    return uniqueList;
  }, [notifications, user, engineers, dismissedNotifIds]);

  // Priority notifications: Overdue 1-2 days or Due soon
  const centerModalNotifications = useMemo(() => {
    return displayNotifications.filter(n => !n.read);
  }, [displayNotifications]);

  // Realtime incoming popup notification for new unread notifications
  useEffect(() => {
    if (knownNotifIdsRef.current === null) {
      // First load: record existing IDs so we don't spam popup on initial mount
      knownNotifIdsRef.current = new Set(displayNotifications.map(n => n.id));
      return;
    }

    // Find any new unread notification
    const brandNewNotif = displayNotifications.find(n => !n.read && !knownNotifIdsRef.current!.has(n.id));
    if (brandNewNotif) {
      knownNotifIdsRef.current.add(brandNewNotif.id);
      setIncomingPopupNotif(brandNewNotif);
      playNotificationSound();

      // Auto dismiss incoming popup after 7 seconds
      const timer = setTimeout(() => {
        setIncomingPopupNotif(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [displayNotifications]);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('has_shown_center_notif_modal');
    if (autoShowNotificationPopup && !hasShown && centerModalNotifications.length > 0) {
      setShowCenterModal(true);
    }
  }, [centerModalNotifications, autoShowNotificationPopup]);

  const closeCenterModal = () => {
    setShowCenterModal(false);
    sessionStorage.setItem('has_shown_center_notif_modal', 'true');
  };

  const unreadCount = displayNotifications.filter(item => !item.read).length;

  useEffect(() => {
    // Initial fetch
    useRealtimeStore.getState().fetchNotifications();

    // 3s Polling fallback for instant notifications update across all devices
    const interval = setInterval(() => {
      useRealtimeStore.getState().fetchNotifications();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const clampPos = () => {
      setPosition(prev => {
        if (!prev) return null;
        const maxX = window.innerWidth - 50;
        const maxY = window.innerHeight - 50;
        const clampedX = Math.max(10, Math.min(maxX, prev.x));
        const clampedY = Math.max(10, Math.min(maxY, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };

    clampPos();
    window.addEventListener('resize', clampPos);
    return () => window.removeEventListener('resize', clampPos);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  if (!showNotificationBell) {
    return null;
  }

  if (isSidebar) {
    return (
      <div ref={popoverRef} className="relative w-full">
        <button
          onClick={handleBellClick}
          title="Thông báo hệ thống"
          className={`flex items-center rounded-xl transition-all overflow-hidden whitespace-normal h-10 hover:bg-slate-100 relative ${
            isExpanded ? 'w-full px-2.5 py-2 gap-2.5 h-auto' : 'w-10 justify-center gap-0'
          } ${showPopover ? 'bg-blue-50 text-primary' : 'text-slate-700'}`}
        >
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-slate-600 bg-slate-100 shadow-xs border border-slate-200 relative">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className={`text-left leading-tight transition-all duration-300 overflow-hidden ${isExpanded ? 'flex-1 opacity-100 delay-0 min-w-0' : 'flex-none w-0 opacity-0 delay-200'}`}>
            <span className="block font-bold text-xs text-slate-800 truncate">
              Thông báo
            </span>
            <span className="block text-[10px] text-slate-500 truncate">
              {unreadCount > 0 ? `${unreadCount} tin mới` : 'Không có tin mới'}
            </span>
          </div>
          {unreadCount > 0 && isExpanded && (
            <span className="flex-shrink-0 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {showPopover && (
          <div className="fixed left-[60px] md:left-[175px] bottom-6 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden z-[9999] w-[340px] animate-in fade-in slide-in-from-left-2 duration-150">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">notifications</span>
                <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
              </div>
              {displayNotifications.some(n => n.read) && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
                  title="Xóa tất cả các thông báo đã đọc"
                >
                  Xóa tất cả
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {displayNotifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-slate-200 text-4xl">notifications_off</span>
                  <span className="text-slate-500 text-xs">Không có thông báo nào</span>
                </div>
              ) : (
                displayNotifications.map(notification => {
                  let dateStr = notification.timestamp;
                  try {
                    const d = new Date(notification.timestamp || '');
                    if (!isNaN(d.getTime())) {
                      dateStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
                    }
                  } catch(e) {}
                  
                  const isOverdue = notification.title.includes('quá hạn');
                  const iconName = isOverdue ? 'warning' : (notification.icon || 'notifications');
                  const iconColorClass = isOverdue ? 'text-amber-700' : (!notification.read ? 'text-primary' : 'text-slate-400');

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 text-xs hover:bg-blue-50/50 cursor-pointer flex gap-3 transition-colors ${!notification.read ? 'bg-blue-50/30 font-medium' : 'opacity-75'}`}
                    >
                      <span className={`material-symbols-outlined text-lg flex-shrink-0 ${iconColorClass}`}>
                        {iconName}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className={`font-bold truncate ${!notification.read ? 'text-slate-800' : 'text-slate-600'}`}>
                            {notification.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{dateStr}</span>
                        </div>
                        <p className={`leading-tight ${!notification.read ? 'text-slate-600' : 'text-slate-500'}`}>{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MODAL POPUP GIỮA MÀN HÌNH */}
        {showCenterModal && centerModalNotifications.length > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant flex flex-col max-h-[80vh]">
              <div className="px-3 py-1.5 bg-surface-container-low border-b border-outline-variant flex justify-between items-center select-none shrink-0">
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[17px]">notifications</span>
                  <span className="truncate">Thông báo</span>
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={closeCenterModal}
                    title="Đóng"
                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] block">close</span>
                  </button>
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto space-y-3 bg-slate-50 flex-1">
                {centerModalNotifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-start gap-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${n.title.includes('quá hạn') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <span className="material-symbols-outlined text-xl">
                        {n.title.includes('quá hạn') ? 'warning' : 'event_available'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-blue-600 transition-colors">chevron_right</span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
                <button
                  onClick={closeCenterModal}
                  className="px-5 py-1.5 bg-primary hover:opacity-90 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={popoverRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={
        position
          ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
          : undefined
      }
      className={`z-[9990] touch-none select-none ${position ? '' : 'fixed top-3 sm:top-[6px] right-4'}`}
    >
      <button
        onClick={handleBellClick}
        title="Thông báo hệ thống (Nhấn giữ & kéo để di chuyển)"
        className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center transition-all relative border shadow-xs cursor-grab active:cursor-grabbing
          ${showPopover ? 'bg-blue-50 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
      >
        <span className="material-symbols-outlined text-[20px] pointer-events-none">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white pointer-events-none shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPopover && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50 w-[320px]">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
            {displayNotifications.some(n => n.read) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
                title="Xóa tất cả các thông báo đã đọc"
              >
                Xóa tất cả
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {displayNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-slate-200 text-4xl">notifications_off</span>
                <span className="text-slate-500 text-xs">Không có thông báo nào</span>
              </div>
            ) : (
              displayNotifications.map(notification => {
                let dateStr = notification.timestamp;
                try {
                  const d = new Date(notification.timestamp || '');
                  if (!isNaN(d.getTime())) {
                    dateStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
                  }
                } catch(e) {}
                
                const isOverdue = notification.title.includes('quá hạn');
                const iconName = isOverdue ? 'warning' : (notification.icon || 'notifications');
                const iconColorClass = isOverdue ? 'text-amber-700' : (!notification.read ? 'text-primary' : 'text-slate-400');

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 text-xs hover:bg-blue-50/50 cursor-pointer flex gap-3 transition-colors ${!notification.read ? 'bg-blue-50/30' : 'opacity-75'}`}
                  >
                    <span className={`material-symbols-outlined text-lg flex-shrink-0 ${iconColorClass}`}>
                      {iconName}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`font-bold truncate ${!notification.read ? 'text-slate-800' : 'text-slate-600'}`}>
                          {notification.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{dateStr}</span>
                      </div>
                      <p className={`leading-tight ${!notification.read ? 'text-slate-600' : 'text-slate-500'}`}>{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL POPUP GIỮA MÀN HÌNH - NHẮC HẠN & QUÁ HẠN 1-2 NGÀY */}
      {showCenterModal && centerModalNotifications.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant flex flex-col max-h-[80vh]">
            <div className="px-3 py-1.5 bg-surface-container-low border-b border-outline-variant flex justify-between items-center select-none shrink-0">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[17px]">notifications</span>
                <span className="truncate">Thông báo</span>
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={closeCenterModal}
                  title="Đóng"
                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] block">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-3 bg-slate-50 flex-1">
              {centerModalNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-start gap-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${n.title.includes('quá hạn') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <span className="material-symbols-outlined text-xl">
                      {n.title.includes('quá hạn') ? 'warning' : 'event_available'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                      <span>{n.title}</span>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-blue-600 transition-colors">chevron_right</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={closeCenterModal}
                className="px-5 py-1.5 bg-primary hover:opacity-90 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING REALTIME INCOMING NOTIFICATION BANNER/TOAST */}
      {incomingPopupNotif && (
        <div className="fixed top-5 right-5 z-[99999] max-w-sm w-full animate-bounce-in shadow-2xl rounded-xl border border-primary/20 bg-white/95 backdrop-blur-md overflow-hidden transition-all">
          <div className="bg-primary px-3.5 py-2 flex items-center justify-between text-white">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
              <span>Thông báo mới</span>
            </div>
            <button
              onClick={() => setIncomingPopupNotif(null)}
              className="p-1 hover:bg-white/20 rounded-md transition-colors"
              title="Đóng"
            >
              <span className="material-symbols-outlined text-[16px] block">close</span>
            </button>
          </div>
          <div className="p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-surface-container text-primary shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-xl">
                {incomingPopupNotif.icon || 'assignment_ind'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 leading-snug">{incomingPopupNotif.title}</h4>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">{incomingPopupNotif.message}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Vừa xong</span>
                <button
                  onClick={() => handleNotificationClick(incomingPopupNotif)}
                  className="px-3 py-1 bg-primary hover:opacity-90 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs flex items-center gap-1"
                >
                  <span>Xem ngay</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
