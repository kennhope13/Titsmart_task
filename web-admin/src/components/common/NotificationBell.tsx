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
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => {
      try { ctx.close(); } catch {}
    }, 500);
  } catch {}
};

const isNotificationForUser = (notification: any, user: any, engineers: any[] = []) => {
  if (!user) return true;
  const role = String(user.role || '').toLowerCase();
  const username = String(user.username || '').toLowerCase();
  const name = String(user.name || '').toLowerCase();
  const userId = String(user.id || '').toLowerCase();

  const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || username === 'admin';

  // Find engineer object corresponding to current user if any
  const myEng = engineers.find(e => 
    (e.id && String(e.id).toLowerCase() === userId) ||
    (e.name && String(e.name).toLowerCase() === name) ||
    (e.username && String(e.username).toLowerCase() === username) ||
    (e.phone && user.phone && String(e.phone) === String(user.phone))
  );
  const myNames = [name, username, myEng?.name?.toLowerCase()].filter(Boolean) as string[];
  const myIds = [userId, myEng?.id?.toLowerCase()].filter(Boolean) as string[];

  // User's assigned project codes
  const userProjectCodes = new Set<string>([
    ...(Array.isArray(user.projectCodes) ? user.projectCodes : []),
    ...(Array.isArray(myEng?.projects) ? myEng.projects : []),
    ...(Array.isArray(myEng?.projectCodes) ? myEng.projectCodes : []),
    user.projectCode || ''
  ].map(p => String(p || '').trim().toUpperCase()).filter(Boolean));

  const title = String(notification.title || '');
  const message = String(notification.message || '');
  const typeStr = String(notification.type || '');
  const tLow = title.toLowerCase();
  const mLow = message.toLowerCase();

  // 0. SENDER / CREATOR FILTER: Người tạo ra hành động / thông báo thì TUYỆT ĐỐI KHÔNG nhận thông báo về chính mình
  if (notification.senderId && myIds.includes(String(notification.senderId).toLowerCase())) {
    return false;
  }
  if (notification.createdById && myIds.includes(String(notification.createdById).toLowerCase())) {
    return false;
  }
  if (notification.senderName && myNames.some(n => String(notification.senderName).toLowerCase() === n)) {
    return false;
  }

  // Nhận diện người thực hiện hành động qua nội dung message / title
  for (const myName of myNames) {
    if (
      mLow.startsWith(myName + ' đã ') ||
      mLow.startsWith(myName + ' vừa ') ||
      mLow.startsWith('quản lý ' + myName + ' đã ') ||
      mLow.startsWith('kỹ sư ' + myName + ' đã ') ||
      mLow.startsWith('nhân sự ' + myName + ' đã ') ||
      tLow.startsWith(myName + ' đã ') ||
      tLow.startsWith(myName + ' vừa ')
    ) {
      return false; // Chính tài khoản hiện tại vừa tạo hành động này
    }
  }
  if (isAdmin && (mLow.startsWith('quản trị hệ thống đã ') || mLow.startsWith('quản trị viên đã '))) {
    return false; // Admin vừa thao tác hành động này
  }

  // 1. Task assignment notifications ("Giao việc: ..."): ONLY for the assigned engineers, NEVER for the assigner / admin who assigned it
  if (title.startsWith('Giao việc:') || title.includes('được giao') || typeStr.startsWith('task_assigned')) {
    if (typeStr.startsWith('task_assigned:::')) {
      const parts = typeStr.split(':::');
      const targetIds = (parts[1] || '').split(',').map(s => s.trim().toLowerCase());
      const targetNames = (parts[2] || '').split(',').map(s => s.trim().toLowerCase());
      
      const isMeId = targetIds.some(tId => myIds.includes(tId));
      const isMeName = targetNames.some(tName => myNames.some(n => tName.includes(n) || n.includes(tName)));
      if (isMeId || isMeName) return true;
      return false; // Not assigned to current user -> hide it
    }
    if (title.startsWith('Giao việc:')) {
      const assignedNames = title.replace('Giao việc:', '').split(',').map(s => s.trim().toLowerCase());
      const isMe = assignedNames.some(aName => myNames.some(n => aName.includes(n) || n.includes(aName)));
      if (isMe) return true;
      return false; // Not assigned to current user -> hide it
    }
    const match = message.match(/cho\s+([^.]+)\.?$/i);
    if (match) {
      const assignedNames = match[1].split(',').map(s => s.trim().toLowerCase());
      const isMe = assignedNames.some(aName => aName === 'bạn' || myNames.some(n => aName.includes(n) || n.includes(aName)));
      if (isMe) return true;
      return false;
    }
    return false;
  }

  // 2. Attendance notifications (e.g. 'Chấm công vào ca', 'Chấm công ra ca'): ONLY for Admin/Managers
  if (
    tLow.includes('chấm công') || 
    tLow.includes('vào ca') || 
    tLow.includes('ra ca') || 
    tLow.includes('điểm danh') || 
    mLow.includes('check-in') || 
    mLow.includes('check-out') || 
    typeStr.startsWith('attendance')
  ) {
    return isAdmin;
  }

  // 3. Task acceptance & completion notifications: Only for Admin / PM / Assigner
  if (title.includes('đã nhận việc') || title.includes('hoàn thành công việc') || typeStr.startsWith('task_accepted') || typeStr.startsWith('task_completed')) {
    if (!isAdmin) return false;
    return true;
  }

  // 4. Leave requests: Only for Admin/Managers (unless it's an approval/rejection notification for the specific user)
  if (title.includes('nghỉ phép') || message.includes('nghỉ phép') || typeStr.startsWith('leave')) {
    if (title.includes('đã được duyệt') || title.includes('từ chối')) {
      if (myNames.some(n => message.toLowerCase().includes(n))) return true;
    }
    return isAdmin;
  }

  // 5. Admins and managers can see all other project/general notifications
  if (isAdmin) return true;

  // 6. Check explicit recipient properties if available
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

  // 7. Check metadata in type (e.g. 'document_update:::PJ_CODE', 'field_log:::PJ_CODE')
  if (typeStr.includes(':::')) {
    const parts = typeStr.split(':::');
    const prefix = parts[0];
    const targetProject = parts[1]?.toUpperCase();

    if (['project', 'document_update', 'field_log', 'material_update', 'issue_alert', 'document_due'].includes(prefix)) {
      if (!targetProject || targetProject === 'COMPANY' || targetProject === 'ALL' || targetProject === 'ALL_PROJECTS') return true;
      if (userProjectCodes.has(targetProject)) return true;
      return false;
    }

    const targetId = parts[1]?.toLowerCase();
    const targetName = parts[2]?.toLowerCase();
    if (targetId && (targetId === userId || (myEng && targetId === String(myEng.id).toLowerCase()))) return true;
    if (targetName && myNames.some(n => targetName.includes(n) || n.includes(targetName))) return true;
    return false;
  }

  // 8. Match project code in message tag like [PROJECT_CODE]
  const pMatch = message.match(/\[([A-Za-z0-9_-]+)\]/);
  if (pMatch) {
    const code = pMatch[1].toUpperCase();
    if (code === 'COMPANY' || code === 'ALL') return true;
    if (userProjectCodes.has(code)) return true;
    return false;
  }

  return true;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ isSidebar = false, isExpanded = false }) => {
  const navigate = useNavigate();
  const { notifications, engineers, markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotifications } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const showNotificationBell = useUIStore(state => state.showNotificationBell);
  const autoShowNotificationPopup = useUIStore(state => state.autoShowNotificationPopup);
  
  const [showPopover, setShowPopover] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
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

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    // CHỈ xóa các thông báo ĐÃ ĐỌC cho riêng tài khoản hiện tại
    const readIds = displayNotifications.filter(n => n.read).map(n => n.id);
    if (readIds.length === 0) return;

    setDismissedNotifIds(prev => {
      const next = new Set(prev);
      readIds.forEach(id => {
        next.add(id);
        deleteNotification(id).catch(() => {});
      });
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleDismissNotification = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    setDismissedNotifIds(prev => {
      const next = new Set(prev);
      next.add(notifId);
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
    deleteNotification(notifId).catch(() => {});
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
    const link = notification.link || '';
    if (link) {
      navigate(link);
      return;
    }

    const title = (notification.title || '');
    const message = (notification.message || '');
    const titleLower = title.toLowerCase();
    const msgLower = message.toLowerCase();

    // Trích xuất mã dự án nếu có dạng [PROJECT_CODE]
    const pCodeMatch = message.match(/\[([A-Za-z0-9_-]+)\]/);
    const pCode = pCodeMatch ? pCodeMatch[1] : '';

    // Trích xuất tên hạng mục/hồ sơ sau dấu hai chấm nếu có
    let itemName = '';
    if (title.includes(':')) {
      itemName = title.split(':').slice(1).join(':').trim();
    } else if (message.includes(':')) {
      itemName = message.split(':').slice(1).join(':').trim();
    }

    // Trích xuất tên công việc trong ngoặc kép nếu có
    const quoteMatch = message.match(/"([^"]+)"/);
    const taskName = quoteMatch ? quoteMatch[1] : '';

    if (titleLower.includes('hồ sơ') || msgLower.includes('hồ sơ') || (notification.type && notification.type.includes('document'))) {
      const params = new URLSearchParams();
      if (itemName) params.set('highlight', itemName);
      navigate(`/document-tracking${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (titleLower.includes('nhật ký') || msgLower.includes('nhật ký') || (notification.type && notification.type.includes('field_log'))) {
      const params = new URLSearchParams();
      if (pCode && pCode !== 'Hệ thống') params.set('project', pCode);
      navigate(`/field-logs${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (
      titleLower.includes('đã hoàn thành') || 
      titleLower.includes('nghiệm thu') ||
      (notification.type && (notification.type.startsWith('task_completed') || notification.type.startsWith('task_approved')))
    ) {
      const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';
      const params = new URLSearchParams();
      if (taskName) params.set('highlight', taskName);
      else if (itemName) params.set('highlight', itemName);

      if (isAdmin) {
        params.set('tab', 'completed');
        navigate(`/task-assignment?${params.toString()}`, { state: { tab: 'completed' } });
      } else {
        navigate(`/my-tasks?${params.toString()}`);
      }
    } else if (
      titleLower.includes('đã nhận việc') || 
      titleLower.includes('báo cáo xong') ||
      (notification.type && notification.type.startsWith('task_accepted'))
    ) {
      const params = new URLSearchParams();
      params.set('tab', 'assigned');
      if (taskName) params.set('highlight', taskName);
      else if (itemName) params.set('highlight', itemName);
      navigate(`/task-assignment?${params.toString()}`, { state: { tab: 'assigned' } });
    } else if (
      titleLower.includes('giao việc') || 
      titleLower.includes('công việc') || 
      titleLower.includes('nhiệm vụ') || 
      msgLower.includes('nhiệm vụ') || 
      msgLower.includes('công việc')
    ) {
      const params = new URLSearchParams();
      if (taskName) params.set('highlight', taskName);
      else if (itemName) params.set('highlight', itemName);
    } else if (
      titleLower.includes('chấm công') || 
      titleLower.includes('vào ca') || 
      titleLower.includes('ra ca') || 
      titleLower.includes('điểm danh') || 
      msgLower.includes('chấm công') || 
      msgLower.includes('vào ca') || 
      msgLower.includes('ra ca') || 
      msgLower.includes('check-in') || 
      msgLower.includes('check-out') || 
      (notification.type && notification.type.startsWith('attendance'))
    ) {
      navigate('/attendance?tab=attendance&view=all');
    } else if (titleLower.includes('nghỉ phép') || msgLower.includes('nghỉ phép')) {
      navigate('/attendance?tab=leaves');
    } else if (pCode && pCode !== 'Hệ thống' && pCode !== 'COMPANY') {
      navigate(`/projects/${encodeURIComponent(pCode)}`);
    } else {
      navigate('/projects');
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
    const getNotifKey = (n: any) => `${n.id}:::${n.title}:::${n.message}`;

    if (knownNotifIdsRef.current === null) {
      // First load: record existing notification signatures so we don't spam popup on initial mount
      knownNotifIdsRef.current = new Set(displayNotifications.map(getNotifKey));
      return;
    }

    // Chỉ bật banner popup nổi nếu thông báo là mới phát sinh trong vòng 30 giây gần nhất
    const now = Date.now();
    const brandNewNotif = displayNotifications.find(n => {
      if (n.read) return false;
      if (knownNotifIdsRef.current!.has(getNotifKey(n))) return false;
      
      // Kiểm tra thời gian tạo thông báo
      try {
        const notifTime = new Date(n.timestamp).getTime();
        if (!isNaN(notifTime) && now - notifTime > 30000) {
          // Thông báo cũ (đã tạo hơn 30s trước) -> Đánh dấu đã biết để không hiện popup làm phiền
          knownNotifIdsRef.current!.add(getNotifKey(n));
          return false;
        }
      } catch {}
      return true;
    });

    if (brandNewNotif) {
      knownNotifIdsRef.current.add(getNotifKey(brandNewNotif));
      setIncomingPopupNotif(brandNewNotif);
      playNotificationSound();

      // Auto dismiss incoming popup after 5 seconds
      const timer = setTimeout(() => {
        setIncomingPopupNotif(null);
      }, 5000);
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

  const unreadNotifications = useMemo(() => displayNotifications.filter(item => !item.read), [displayNotifications]);
  const unreadCount = unreadNotifications.length;
  const activeNotifications = activeTab === 'unread' ? unreadNotifications : displayNotifications;

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
          <div className="fixed left-[60px] md:left-[175px] bottom-6 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden z-[9999] w-[350px] animate-in fade-in slide-in-from-left-2 duration-150 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">notifications</span>
                  <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {activeTab === 'unread' ? (
                  unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                      title="Đánh dấu tất cả là đã đọc"
                    >
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      Đã đọc tất cả
                    </button>
                  )
                ) : (
                  displayNotifications.some(n => n.read) && (
                    <button
                      type="button"
                      onClick={handleClearRead}
                      className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                      title="Dọn dẹp các thông báo đã đọc"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                      Xóa đã đọc
                    </button>
                  )
                )}
              </div>
              <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 py-1 rounded-md text-center transition-all ${
                    activeTab === 'unread'
                      ? 'bg-white text-primary shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chưa đọc ({unreadNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 rounded-md text-center transition-all ${
                    activeTab === 'all'
                      ? 'bg-white text-primary shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({displayNotifications.length})
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {activeNotifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-3xl">
                    {activeTab === 'unread' ? 'task_alt' : 'notifications_off'}
                  </span>
                  <span className="text-slate-500 text-xs font-medium">
                    {activeTab === 'unread' ? 'Tất cả thông báo đã được đọc' : 'Không có thông báo nào'}
                  </span>
                </div>
              ) : (
                activeNotifications.map(notification => {
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
                      className={`group relative p-3 text-xs hover:bg-blue-50/50 cursor-pointer flex gap-2.5 transition-colors ${!notification.read ? 'bg-blue-50/35 font-medium' : 'opacity-80'}`}
                    >
                      <span className={`material-symbols-outlined text-lg flex-shrink-0 mt-0.5 ${iconColorClass}`}>
                        {iconName}
                      </span>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className={`font-bold truncate ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{dateStr}</span>
                        </div>
                        <p className={`leading-tight text-[11.5px] ${!notification.read ? 'text-slate-700' : 'text-slate-500'}`}>{notification.message}</p>
                      </div>
                      <div className="flex flex-col items-center justify-between flex-shrink-0">
                        {!notification.read ? (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                        ) : <div className="w-2 h-2"></div>}
                        <button
                          type="button"
                          onClick={(e) => handleDismissNotification(e, notification.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Xóa thông báo này"
                        >
                          <span className="material-symbols-outlined text-[15px] block">close</span>
                        </button>
                      </div>
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
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden z-50 w-[350px] flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">notifications</span>
                <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              {activeTab === 'unread' ? (
                unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                    Đã đọc tất cả
                  </button>
                )
              ) : (
                displayNotifications.some(n => n.read) && (
                  <button
                    type="button"
                    onClick={handleClearRead}
                    className="text-[11px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                    title="Dọn dẹp các thông báo đã đọc"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                    Xóa đã đọc
                  </button>
                )
              )}
            </div>
            <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`flex-1 py-1 rounded-md text-center transition-all ${
                  activeTab === 'unread'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chưa đọc ({unreadNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1 rounded-md text-center transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({displayNotifications.length})
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {activeNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-slate-300 text-3xl">
                  {activeTab === 'unread' ? 'task_alt' : 'notifications_off'}
                </span>
                <span className="text-slate-500 text-xs font-medium">
                  {activeTab === 'unread' ? 'Tất cả thông báo đã được đọc' : 'Không có thông báo nào'}
                </span>
              </div>
            ) : (
              activeNotifications.map(notification => {
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
                    className={`group relative p-3 text-xs hover:bg-blue-50/50 cursor-pointer flex gap-2.5 transition-colors ${!notification.read ? 'bg-blue-50/35 font-medium' : 'opacity-80'}`}
                  >
                    <span className={`material-symbols-outlined text-lg flex-shrink-0 mt-0.5 ${iconColorClass}`}>
                      {iconName}
                    </span>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`font-bold truncate ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notification.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{dateStr}</span>
                      </div>
                      <p className={`leading-tight text-[11.5px] ${!notification.read ? 'text-slate-700' : 'text-slate-500'}`}>{notification.message}</p>
                    </div>
                    <div className="flex flex-col items-center justify-between flex-shrink-0">
                      {!notification.read ? (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                      ) : <div className="w-2 h-2"></div>}
                      <button
                        type="button"
                        onClick={(e) => handleDismissNotification(e, notification.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                        title="Xóa thông báo này"
                      >
                        <span className="material-symbols-outlined text-[15px] block">close</span>
                      </button>
                    </div>
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
        <div
          onClick={() => handleNotificationClick(incomingPopupNotif)}
          className="fixed top-5 right-5 z-[99999] max-w-sm w-full animate-bounce-in shadow-2xl rounded-xl border border-primary/30 bg-white/95 backdrop-blur-md overflow-hidden transition-all cursor-pointer hover:shadow-primary/25 hover:border-primary/60 hover:scale-[1.01] active:scale-[0.99] group select-none"
        >
          <div className="bg-primary px-3.5 py-2 flex items-center justify-between text-white">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
              <span>Thông báo mới</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIncomingPopupNotif(null);
              }}
              className="p-1 hover:bg-white/20 rounded-md transition-colors"
              title="Đóng"
            >
              <span className="material-symbols-outlined text-[16px] block">close</span>
            </button>
          </div>
          <div className="p-3.5 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-primary shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">
                {incomingPopupNotif.icon || 'assignment_ind'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-primary transition-colors">{incomingPopupNotif.title}</h4>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">{incomingPopupNotif.message}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Vừa xong</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
