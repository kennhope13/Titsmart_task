import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';
import { useUIStore } from '../../services/uiStore';
import { sendSystemNotification, requestSystemNotificationPermission } from '../../services/systemNotificationService';
import { isUserTaskAssigner, isUserTaskAssignee, isUserTaskFollower } from '../../utils/taskPermission';

interface NotificationBellProps {
  isSidebar?: boolean;
  isExpanded?: boolean;
}

const normalizeStr = (s: any): string => {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
};

const isNotificationForUser = (notification: any, user: any, engineers: any[] = [], allTasks: any[] = []) => {
  if (!user) return true;
  const role = String(user.role || '').toLowerCase();
  const username = String(user.username || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();
  const normName = normalizeStr(user.name);
  const userId = String(user.id || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();
  const userPhone = String(user.phone || '').trim();

  const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || role === 'quản lý' || role === 'giám sát' || username === 'admin';

  // Find engineer object(s) corresponding to current user
  const myEngs = (engineers || []).filter(e => {
    if (!e) return false;
    const eId = String(e.id || '').trim().toLowerCase();
    const eName = String(e.name || '').trim().toLowerCase();
    const eNormName = normalizeStr(e.name);
    const eUsername = String(e.username || '').trim().toLowerCase();
    const ePhone = String(e.phone || '').trim();
    const eEmail = String(e.email || '').trim().toLowerCase();

    return (
      (eId && (eId === userId || (userId.startsWith('user-') && eId === userId.replace('user-', '')))) ||
      (eName && (eName === name || eNormName === normName)) ||
      (eUsername && (eUsername === username || (userId.startsWith('user-') && eUsername === userId.replace('user-', '')))) ||
      (eEmail && userEmail && (eEmail === userEmail || eEmail.split('@')[0] === userEmail.split('@')[0])) ||
      (ePhone && userPhone && ePhone.replace(/\D/g, '') === userPhone.replace(/\D/g, '') && ePhone.replace(/\D/g, '').length >= 7)
    );
  });

  const myEng = myEngs[0];

  const myIds = Array.from(new Set([
    userId,
    userId.replace(/^user-/, ''),
    username,
    ...myEngs.map(e => String(e.id || '').trim().toLowerCase()),
    ...myEngs.map(e => String(e.username || '').trim().toLowerCase())
  ].filter(Boolean)));

  const userTitle = String(user.title || '').trim().toLowerCase();
  const myNames = Array.from(new Set([
    name,
    username,
    normName,
    userTitle,
    normalizeStr(userTitle),
    username.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(),
    ...myEngs.map(e => String(e.name || '').trim().toLowerCase()),
    ...myEngs.map(e => normalizeStr(e.name)),
    ...myEngs.map(e => String(e.username || '').trim().toLowerCase()),
    ...myEngs.map(e => String(e.title || '').trim().toLowerCase()),
    ...myEngs.map(e => normalizeStr(e.title))
  ].filter(Boolean)));

  const isMatchingName = (target: string) => {
    if (!target) return false;
    const tTrim = target.trim().toLowerCase();
    const tNorm = normalizeStr(target);
    if (!tTrim || !tNorm) return false;
    
    return myNames.some(n => {
      if (!n) return false;
      if (tTrim === n || tNorm === n) return true;
      const nNorm = normalizeStr(n);
      if (tNorm === nNorm) return true;
      if (nNorm.length >= 3 && (tNorm.includes(nNorm) || nNorm.includes(tNorm))) return true;
      if (tTrim.length >= 3 && (tTrim.includes(n) || n.includes(tTrim))) return true;
      return false;
    });
  };

  const isMatchingId = (targetId: string) => {
    if (!targetId) return false;
    const tId = String(targetId).trim().toLowerCase();
    return myIds.includes(tId) || myIds.includes(tId.replace(/^user-/, ''));
  };

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
  const linkStr = String(notification.link || '');
  const tLow = title.toLowerCase();
  const mLow = message.toLowerCase();

  // 0. SENDER / CREATOR FILTER (do not notify the action author themselves)
  const isSenderById = Boolean(
    (notification.senderId && isMatchingId(notification.senderId)) ||
    (notification.createdById && isMatchingId(notification.createdById))
  );

  const senderNameStr = String(notification.senderName || '').trim().toLowerCase();
  const isGenericSender = ['quản trị hệ thống', 'quản trị viên', 'hệ thống', 'admin', 'quản lý'].includes(senderNameStr);
  const isSenderByName = !isGenericSender && Boolean(senderNameStr && (
    senderNameStr === name || 
    senderNameStr === username || 
    (normName && normalizeStr(senderNameStr) === normName)
  ));

  // ─── 1. TASK-RELATED NOTIFICATIONS: STRICT RECIPIENT FILTERING ───
  const isTaskNotification = 
    typeStr.startsWith('task_') ||
    tLow.startsWith('giao việc') ||
    tLow.includes('giao việc') ||
    tLow.includes('được giao') ||
    tLow.includes('nhận việc') ||
    tLow.includes('nghiệm thu') ||
    tLow.includes('thắc mắc') ||
    tLow.includes('trao đổi') ||
    tLow.includes('hướng dẫn') ||
    tLow.includes('phản hồi') ||
    tLow.includes('hoàn thành công việc') ||
    tLow.includes('báo cáo hoàn thành') ||
    tLow.includes('nhắc hạn công việc') ||
    tLow.includes('quá hạn hoàn thành');

  if (isTaskNotification) {
    if (isSenderById || isSenderByName) return false;

    // Look up associated task in memory if available
    let associatedTask: any = null;
    if (Array.isArray(allTasks) && allTasks.length > 0) {
      if (linkStr.includes('taskId=')) {
        const match = linkStr.match(/taskId=([^&]+)/);
        if (match) {
          const tId = decodeURIComponent(match[1]);
          associatedTask = allTasks.find(t => t.id === tId || String(t.id).toLowerCase() === tId.toLowerCase());
        }
      }
      if (!associatedTask && linkStr) {
        associatedTask = allTasks.find(t => t.id && (linkStr.includes(encodeURIComponent(t.id)) || linkStr.includes(t.id)));
      }
    }

    if (associatedTask) {
      const isTaskAssigner = isUserTaskAssigner(user, associatedTask, engineers);
      const isTaskAssignee = isUserTaskAssignee(user, associatedTask, engineers);
      const isTaskFollower = isUserTaskFollower(user, associatedTask, engineers);

      // 1A. Nhận việc / Báo cáo hoàn thành -> Người giao việc VÀ người theo dõi nhận
      if (
        typeStr.startsWith('task_accepted') || 
        typeStr.startsWith('task_completed') ||
        tLow.includes('đã nhận việc') || 
        tLow.includes('hoàn thành công việc') || 
        tLow.includes('báo cáo hoàn thành') ||
        tLow.includes('báo cáo xong')
      ) {
        if (isTaskAssigner || isTaskFollower) return true;
      }

      // 1B. Phản hồi / Trao đổi / Thắc mắc / Hướng dẫn / Xóa -> Cả Assigner, Assignee, Follower đều nhận
      if (
        typeStr.startsWith('task_reply') || 
        typeStr.startsWith('task_question') || 
        typeStr.startsWith('task_due') ||
        typeStr.startsWith('task_deleted') ||
        tLow.includes('phản hồi') || 
        tLow.includes('trao đổi') || 
        tLow.includes('thắc mắc') || 
        tLow.includes('hướng dẫn') || 
        tLow.includes('quá hạn hoàn thành') || 
        tLow.includes('nhắc hạn công việc') ||
        tLow.includes('xóa công việc')
      ) {
        if (isTaskAssigner || isTaskAssignee || isTaskFollower) return true;
      }

      // 1C. Giao việc / Nghiệm thu -> Assignee nhận
      if (
        typeStr.startsWith('task_assigned') || 
        typeStr.startsWith('task_approved') ||
        tLow.startsWith('giao việc') || 
        tLow.includes('giao việc') ||
        tLow.includes('được giao') || 
        tLow.includes('nghiệm thu')
      ) {
        if (isTaskAssignee) return true;
      }

      // 1D. Theo dõi công việc -> Follower nhận
      if (
        typeStr.startsWith('task_follower') ||
        tLow.includes('theo dõi')
      ) {
        if (isTaskFollower) return true;
      }
    }

    // Fallback based on type payload :::id1,id2:::name1,name2
    if (
      typeStr.startsWith('task_accepted') || 
      typeStr.startsWith('task_completed') ||
      tLow.includes('đã nhận việc') || 
      tLow.includes('hoàn thành công việc') || 
      tLow.includes('báo cáo hoàn thành') ||
      tLow.includes('báo cáo xong')
    ) {
      if (typeStr.includes(':::')) {
        const parts = typeStr.split(':::');
        const targetIds = (parts[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const targetNames = (parts[2] || '').split(',').map(s => s.trim()).filter(Boolean);

        const isMeId = targetIds.some(tId => isMatchingId(tId));
        const isMeName = targetNames.some(tName => isMatchingName(tName));

        if (isMeId || isMeName) return true;
        if (targetIds.includes('admin') || targetIds.length === 0 || targetNames.some(tn => tn.toLowerCase().includes('quản lý') || tn.toLowerCase().includes('quản trị viên') || tn.toLowerCase().includes('admin'))) {
          return isAdmin;
        }
        return false;
      }
      return isAdmin;
    }

    if (
      typeStr.startsWith('task_reply') || 
      typeStr.startsWith('task_question') || 
      typeStr.startsWith('task_due') ||
      tLow.includes('phản hồi') || 
      tLow.includes('trao đổi') || 
      tLow.includes('thắc mắc') || 
      tLow.includes('hướng dẫn') || 
      tLow.includes('quá hạn hoàn thành') || 
      tLow.includes('nhắc hạn công việc')
    ) {
      if (typeStr.includes(':::')) {
        const parts = typeStr.split(':::');
        const targetIds = (parts[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const targetNames = (parts[2] || '').split(',').map(s => s.trim()).filter(Boolean);

        const isMeId = targetIds.some(tId => isMatchingId(tId));
        const isMeName = targetNames.some(tName => isMatchingName(tName));

        if (isMeId || isMeName) return true;
        if (targetIds.includes('admin') || targetIds.length === 0 || targetNames.some(tn => tn.toLowerCase().includes('quản lý') || tn.toLowerCase().includes('quản trị viên') || tn.toLowerCase().includes('admin'))) {
          return isAdmin;
        }
        return false;
      }
      return true;
    }

    if (
      typeStr.startsWith('task_follower') ||
      tLow.includes('theo dõi')
    ) {
      if (typeStr.includes(':::')) {
        const parts = typeStr.split(':::');
        const targetIds = (parts[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const targetNames = (parts[2] || '').split(',').map(s => s.trim()).filter(Boolean);

        const isMeId = targetIds.some(tId => isMatchingId(tId));
        const isMeName = targetNames.some(tName => isMatchingName(tName));
        return Boolean(isMeId || isMeName);
      }
      return false;
    }

    if (
      typeStr.startsWith('task_assigned') || 
      typeStr.startsWith('task_approved') ||
      tLow.startsWith('giao việc') || 
      tLow.includes('giao việc') ||
      tLow.includes('được giao') || 
      tLow.includes('nghiệm thu')
    ) {
      if (typeStr.includes(':::')) {
        const parts = typeStr.split(':::');
        const targetIds = (parts[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const targetNames = (parts[2] || '').split(',').map(s => s.trim()).filter(Boolean);

        const isMeId = targetIds.some(tId => isMatchingId(tId));
        const isMeName = targetNames.some(tName => isMatchingName(tName));

        if (isMeId || isMeName) {
          return true;
        }
        return false;
      }

      if (notification.recipientId && isMatchingId(notification.recipientId)) return true;
      if (notification.recipientName && isMatchingName(notification.recipientName)) return true;

      if (tLow.startsWith('giao việc:')) {
        const assignedNames = title.replace(/^giao việc:\s*/i, '').split(',').map(s => s.trim());
        if (assignedNames.some(aName => isMatchingName(aName))) return true;
      }

      if (mLow.includes('cho bạn')) return true;

      const match = message.match(/cho\s+([^.]+)\.?$/i);
      if (match && match[1]) {
        const candidateNames = match[1].split(',').map(s => s.trim());
        if (candidateNames.some(cName => isMatchingName(cName))) return true;
      }

      return false;
    }

    return true;
  }

  // Filter sender from seeing non-task broadcast
  if (isSenderById || isSenderByName) {
    return false;
  }

  // 2. Attendance notifications (e.g. 'Chấm công vào ca', 'Chấm công ra ca'): ONLY for Admin/Managers & Authorized Personnel
  if (
    tLow.includes('chấm công') || 
    tLow.includes('vào ca') || 
    tLow.includes('ra ca') || 
    tLow.includes('điểm danh') || 
    mLow.includes('check-in') || 
    mLow.includes('check-out') || 
    typeStr.startsWith('attendance')
  ) {
    const userTitleNorm = normalizeStr(user.title || '');
    const isAttendanceManager = Boolean(
      isAdmin ||
      role.includes('quản lý') ||
      role.includes('giám sát') ||
      role.includes('chỉ huy') ||
      role.includes('manager') ||
      role.includes('pm') ||
      userTitleNorm.includes('quan ly') ||
      userTitleNorm.includes('truong') ||
      userTitleNorm.includes('chi huy') ||
      userTitleNorm.includes('giam doc') ||
      user.permissions?.includes('VIEW_ALL_ATTENDANCE') ||
      user.permissions?.includes('MANAGE_ATTENDANCE') ||
      user.permissions?.includes('MANAGE_PAYROLL') ||
      user.permissions?.includes('APPROVE_LEAVE_STEP1') ||
      user.permissions?.includes('APPROVE_LEAVE_FINAL')
    );
    return isAttendanceManager;
  }

  // 3. Leave requests: Targeted notifications based on metadata type (`leave_pending:::targetId:::targetName`)
  if (tLow.includes('nghỉ phép') || mLow.includes('nghỉ phép') || typeStr.startsWith('leave')) {
    if (typeStr.includes(':::')) {
      const parts = typeStr.split(':::');
      const actionType = parts[0];
      const targetIds = (parts[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const targetNames = (parts[2] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      const isMeId = targetIds.some(tId => myIds.includes(tId) || (myEng && tId === String(myEng.id).toLowerCase()));
      const isMeName = targetNames.some(tName => myNames.some(n => tName.includes(n) || n.includes(tName)));

      if (isMeId || isMeName) return true;

      // Khi Quản lý duyệt bước 1 -> Luôn gửi thông báo cho Quản trị viên / Ban Giám Đốc
      if (actionType === 'leave_step1_approved' || tLow.includes('quản lý duyệt') || mLow.includes('chờ quản trị')) {
        if (isAdmin || user?.permissions?.includes('APPROVE_LEAVE_FINAL' as any)) return true;
      }

      // Khi đơn gửi cho Admin / Quản trị viên
      if (targetIds.includes('admin') || targetNames.some(tn => tn.includes('quản trị') || tn.includes('admin') || tn.includes('giám đốc'))) {
        return isAdmin || user?.permissions?.includes('APPROVE_LEAVE_FINAL' as any);
      }

      return false; // Chỉ gửi đích danh người duyệt được chọn, không spam người khác
    }

    if (tLow.includes('đã được duyệt') || tLow.includes('từ chối') || tLow.includes('phê duyệt')) {
      if (myNames.some(n => mLow.includes(n))) return true;
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

  // 7. Check metadata in type (e.g. 'project_created:::PJ_CODE:::ID1,ID2', 'document_update:::PJ_CODE')
  if (typeStr.includes(':::')) {
    const parts = typeStr.split(':::');
    const prefix = parts[0];
    const targetProject = parts[1]?.toUpperCase();
    const decodedTargetProj = decodeURIComponent(parts[1] || '').toUpperCase();
    const targetIds = (parts[2] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    if (['project', 'project_created', 'project_new', 'document_update', 'field_log', 'material_update', 'issue_alert', 'document_due'].includes(prefix)) {
      if (targetIds.some(tId => isMatchingId(tId))) return true;
      if (decodedTargetProj && (userProjectCodes.has(decodedTargetProj) || userProjectCodes.has(targetProject))) return true;
      if (targetProject === 'COMPANY') return true;
      return false;
    }

    const targetId = parts[1]?.toLowerCase();
    const targetName = parts[2]?.toLowerCase();
    if (targetId && (isMatchingId(targetId) || (myEng && targetId === String(myEng.id).toLowerCase()))) return true;
    if (targetName && myNames.some(n => targetName.includes(n) || n.includes(targetName))) return true;
    return false;
  }

  // 8. Match project code in message tag like [PROJECT_CODE]
  const pMatch = message.match(/\[([A-Za-z0-9_-]+)\]/);
  if (pMatch) {
    const code = pMatch[1].toUpperCase();
    if (code === 'COMPANY') return true;
    if (userProjectCodes.has(code)) return true;
    return false;
  }

  // Không spam thông báo dự án cho nhân sự không liên quan
  if (tLow.includes('dự án mới') || tLow.includes('tạo dự án') || typeStr.startsWith('project')) {
    return false;
  }

  return false;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ isSidebar = false, isExpanded = false }) => {
  const navigate = useNavigate();
  const notifications = useRealtimeStore(s => s.notifications);
  const engineers = useRealtimeStore(s => s.engineers);
  const tasks = useRealtimeStore(s => s.tasks);
  const markNotificationRead = useRealtimeStore(s => s.markNotificationRead);
  const markAllNotificationsRead = useRealtimeStore(s => s.markAllNotificationsRead);
  const deleteNotification = useRealtimeStore(s => s.deleteNotification);
  const clearNotifications = useRealtimeStore(s => s.clearNotifications);
  const user = useAuthStore(state => state.user);
  const showNotificationBell = useUIStore(state => state.showNotificationBell);
  const autoShowNotificationPopup = useUIStore(state => state.autoShowNotificationPopup);
  const availableUpdateVersion = useUIStore(state => state.availableUpdateVersion);
  
  const [showPopover, setShowPopover] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
  const popoverRef = useRef<HTMLDivElement>(null);

  // ─── Dragging functionality state & refs (transient per session, resets to default on reload) ───
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const hasMovedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const btnElem = buttonRef.current;
    if (!btnElem) return;

    const rect = btnElem.getBoundingClientRect();
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
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (!hasMovedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMovedRef.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch (err) {}
    }

    if (hasMovedRef.current) {
      const newX = Math.max(10, Math.min(window.innerWidth - 50, dragStartRef.current.initX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 50, dragStartRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}

    setTimeout(() => {
      hasMovedRef.current = false;
    }, 120);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 120);
  };

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMovedRef.current) {
      return;
    }
    setShowPopover(prev => !prev);
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

  // Per-user READ state. The DB `read` column is shared by every account, so using it made one
  // user's "read"/"mark all read" hide the notification from everybody else (e.g. the assigner).
  const readStorageKey = useMemo(() => `buildcore_read_notifs_${user?.id || user?.username || 'guest'}`, [user]);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`buildcore_read_notifs_${user?.id || user?.username || 'guest'}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const addReadIds = (ids: string[]) => {
    setReadNotifIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try {
        localStorage.setItem(readStorageKey, JSON.stringify(Array.from(next).slice(-500)));
      } catch {}
      return next;
    });
  };

  // First run for this account: notifications already flagged read in DB count as read (avoid flood of "unread")
  useEffect(() => {
    try {
      const seedKey = `${readStorageKey}_seeded`;
      if (localStorage.getItem(seedKey) || !Array.isArray(notifications) || notifications.length === 0) return;
      localStorage.setItem(seedKey, '1');
      addReadIds(notifications.filter((n: any) => n.read).map((n: any) => n.id));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readStorageKey, notifications.length]);

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
    addReadIds(displayNotifications.map((n: any) => n.id));
  };

  const handleClearRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    // CHỈ ẩn các thông báo ĐÃ ĐỌC cho riêng tài khoản hiện tại (không xóa trên DB để người khác vẫn nhận được)
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
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      addReadIds([notification.id]);
    }

    setShowPopover(false);
    setShowCenterModal(false);
    sessionStorage.setItem('has_shown_center_notif_modal', 'true');

    if (notification.type === 'app_update' || notification.link === '__RESTART_UPDATE__') {
      useUIStore.getState().setIsUpdatingApp(true);
      const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();
      if ((window as any).electronAPI?.installUpdate) {
        (window as any).electronAPI.installUpdate();
      } else if (isCapacitorNative) {
        const downloadUrl = `https://github.com/kennhope13/Titsmart_task/releases/download/v${availableUpdateVersion}/TITSMART-v${availableUpdateVersion}.apk`;
        try {
          window.open(downloadUrl, '_system');
        } catch (_) {
          window.location.href = downloadUrl;
        }
      } else {
        (async () => {
          try {
            if ('caches' in window) {
              const cacheKeys = await caches.keys();
              await Promise.all(cacheKeys.map(k => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              await Promise.all(registrations.map(r => r.unregister()));
            }
          } catch (_) {}
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('_v', Date.now().toString());
            window.location.replace(url.toString());
          } catch (_) {
            window.location.reload();
          }
        })();
      }
      return;
    }

    const role = String(user?.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || role === 'quản lý' || role === 'giám sát' || user?.username === 'admin';

    const title = (notification.title || '');
    const message = (notification.message || '');
    const titleLower = title.toLowerCase();
    const msgLower = message.toLowerCase();
    let link = notification.link || '';

    // Trích xuất mã dự án nếu có dạng [PROJECT_CODE] hoặc "dự án X"
    let pCode = '';
    const pCodeMatch = message.match(/\[([A-Za-z0-9_-]+)\]/);
    if (pCodeMatch) {
      pCode = pCodeMatch[1];
    } else {
      const pProjectMatch = message.match(/thuộc dự án\s+([A-Za-z0-9_-]+)/i) || message.match(/dự án\s+([A-Za-z0-9_-]+)/i);
      if (pProjectMatch) {
        pCode = pProjectMatch[1].replace(/[.,:;]$/, '').trim();
      }
    }

    // Trích xuất tên hạng mục/hồ sơ sau dấu hai chấm nếu có
    let itemName = '';
    if (title.includes(':')) {
      itemName = title.split(':').slice(1).join(':').trim();
    } else if (message.includes(':')) {
      itemName = message.split(':').slice(1).join(':').trim();
    }

    // Trích xuất tên công việc trong ngoặc kép nếu có
    const quoteMatch = message.match(/"([^"]+)"/);
    const taskName = quoteMatch ? quoteMatch[1] : (itemName || '');

    // Tìm kiếm task trong realtime store để có đầy đủ projectCode và taskId
    const store = useRealtimeStore.getState();
    const allTasks = store.tasks || [];
    const allProjects = store.projects || [];
    const targetTask = taskName 
      ? allTasks.find(t => t.name?.trim().toLowerCase() === taskName.trim().toLowerCase()) 
      : (link.includes('taskId=') ? allTasks.find(t => link.includes(encodeURIComponent(t.id)) || link.includes(t.id)) : null);

    const isDirectTask = Boolean(
      targetTask && (
        targetTask.sectionName === 'Giao việc trực tiếp' ||
        targetTask.projectCode === 'COMPANY' ||
        targetTask.code?.startsWith('TASK-DIRECT')
      )
    ) || link.includes('/projects/COMPANY/') || msgLower.includes('[company]') || pCode === 'COMPANY';

    let finalProjectCode = pCode || targetTask?.projectCode || '';
    if (finalProjectCode) {
      const matchedProj = allProjects.find(p => p.code?.toLowerCase() === finalProjectCode.toLowerCase() || p.name?.toLowerCase() === finalProjectCode.toLowerCase() || p.id === finalProjectCode);
      if (matchedProj) {
        finalProjectCode = matchedProj.code;
      }
    }

    // Task-related notifications check
    const isTaskNotification = 
      notification.type?.startsWith('task_') ||
      titleLower.includes('công việc') ||
      titleLower.includes('giao việc') ||
      titleLower.includes('nhận việc') ||
      titleLower.includes('nghiệm thu') ||
      titleLower.includes('thắc mắc') ||
      titleLower.includes('trao đổi') ||
      titleLower.includes('nhắc hạn công việc') ||
      titleLower.includes('quá hạn hoàn thành') ||
      titleLower.includes('báo cáo hoàn thành');

    if (isTaskNotification) {
      if (!isAdmin) {
        // Regular employees always navigate to My Tasks with category and taskId/highlight
        const params = new URLSearchParams();
        if (targetTask?.id) params.set('taskId', targetTask.id);
        if (taskName || targetTask?.name) params.set('highlight', taskName || targetTask?.name || '');
        params.set('category', isDirectTask ? 'direct' : 'project');
        navigate(`/my-tasks?${params.toString()}`);
        return;
      } else {
        // Admin user
        if (isDirectTask) {
          const params = new URLSearchParams();
          if (targetTask?.id) params.set('taskId', targetTask.id);
          if (taskName || targetTask?.name) params.set('highlight', taskName || targetTask?.name || '');
          navigate(`/task-assignment?tab=direct&${params.toString()}`, { state: { tab: 'direct' } });
          return;
        }
      }
    }

    // Điều hướng theo link có sẵn nếu hợp lệ
    if (link) {
      if (link.includes('/projects/COMPANY/')) {
        if (isAdmin) {
          navigate('/task-assignment?tab=direct', { state: { tab: 'direct' } });
        } else {
          navigate('/my-tasks?category=direct');
        }
        return;
      }
      navigate(link);
      return;
    }

    if (titleLower.includes('hồ sơ') || msgLower.includes('hồ sơ') || (notification.type && notification.type.includes('document'))) {
      const params = new URLSearchParams();
      if (itemName) params.set('highlight', itemName);
      navigate(`/document-tracking${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (titleLower.includes('nhật ký') || msgLower.includes('nhật ký') || (notification.type && notification.type.includes('field_log'))) {
      const params = new URLSearchParams();
      const projectCodeTarget = finalProjectCode || (pCode && pCode !== 'Hệ thống' ? pCode : '');
      if (projectCodeTarget) params.set('project', projectCodeTarget);
      if (taskName || itemName || targetTask?.name) {
        params.set('highlight', taskName || itemName || targetTask?.name || '');
      }
      if (targetTask?.id || notification.taskId || notification.itemId) {
        params.set('taskId', targetTask?.id || notification.taskId || notification.itemId || '');
      }
      if (projectCodeTarget) {
        navigate(`/projects/${encodeURIComponent(projectCodeTarget)}/field-logs?${params.toString()}`);
      } else {
        navigate(`/field-logs?${params.toString()}`);
      }
    } else if (
      titleLower.includes('báo cáo hoàn thành') ||
      titleLower.includes('báo cáo xong') ||
      (notification.type && notification.type.startsWith('task_completed'))
    ) {
      // Khi nhân viên báo cáo hoàn thành -> Admin / Quản lý nhấn vào thông báo đi đến tab Tiến độ công việc của dự án để nghiệm thu
      if (finalProjectCode) {
        const taskIdParam = targetTask?.id ? `taskId=${encodeURIComponent(targetTask.id)}&` : '';
        navigate(`/projects/${encodeURIComponent(finalProjectCode)}/tasks?${taskIdParam}highlight=${encodeURIComponent(taskName || '')}`);
      } else {
        const params = new URLSearchParams();
        params.set('tab', 'assigned');
        if (taskName) params.set('highlight', taskName);
        navigate(`/task-assignment?${params.toString()}`, { state: { tab: 'assigned' } });
      }
    } else if (
      titleLower.includes('nghiệm thu') ||
      (notification.type && notification.type.startsWith('task_approved'))
    ) {
      const role = String(user?.role || '').toLowerCase();
      const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || user?.username === 'admin';
      if (isAdmin && finalProjectCode) {
        const taskIdParam = targetTask?.id ? `taskId=${encodeURIComponent(targetTask.id)}&` : '';
        navigate(`/projects/${encodeURIComponent(finalProjectCode)}/tasks?${taskIdParam}highlight=${encodeURIComponent(taskName || '')}`);
      } else {
        const params = new URLSearchParams();
        if (taskName) params.set('highlight', taskName);
        navigate(`/my-tasks?${params.toString()}`);
      }
    } else if (
      titleLower.includes('thắc mắc') ||
      (notification.type && notification.type.startsWith('task_question'))
    ) {
      if (finalProjectCode) {
        const taskIdParam = targetTask?.id ? `taskId=${encodeURIComponent(targetTask.id)}&` : '';
        navigate(`/projects/${encodeURIComponent(finalProjectCode)}/tasks?${taskIdParam}highlight=${encodeURIComponent(taskName || '')}&discuss=true`);
      } else {
        const params = new URLSearchParams();
        params.set('tab', 'assigned');
        params.set('discuss', 'true');
        if (taskName) params.set('highlight', taskName);
        navigate(`/task-assignment?${params.toString()}`, { state: { tab: 'assigned' } });
      }
    } else if (
      titleLower.includes('phản hồi') ||
      (notification.type && notification.type.startsWith('task_reply'))
    ) {
      const params = new URLSearchParams();
      if (targetTask?.id) params.set('taskId', targetTask.id);
      if (taskName) params.set('highlight', taskName);
      params.set('discuss', 'true');
      navigate(`/my-tasks?${params.toString()}`);
    } else if (
      titleLower.includes('đã nhận việc') || 
      (notification.type && notification.type.startsWith('task_accepted'))
    ) {
      if (finalProjectCode) {
        const taskIdParam = targetTask?.id ? `taskId=${encodeURIComponent(targetTask.id)}&` : '';
        navigate(`/projects/${encodeURIComponent(finalProjectCode)}/tasks?${taskIdParam}highlight=${encodeURIComponent(taskName || '')}`);
      } else {
        const params = new URLSearchParams();
        params.set('tab', 'assigned');
        if (taskName) params.set('highlight', taskName);
        navigate(`/task-assignment?${params.toString()}`, { state: { tab: 'assigned' } });
      }
    } else if (
      titleLower.includes('giao việc') || 
      titleLower.includes('công việc') || 
      titleLower.includes('nhiệm vụ') || 
      msgLower.includes('nhiệm vụ') || 
      msgLower.includes('công việc') ||
      (notification.type && notification.type.startsWith('task_assigned'))
    ) {
      const role = String(user?.role || '').toLowerCase();
      const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || user?.username === 'admin';

      if (isAdmin) {
        if (finalProjectCode) {
          const taskIdParam = targetTask?.id ? `taskId=${encodeURIComponent(targetTask.id)}&` : '';
          navigate(`/projects/${encodeURIComponent(finalProjectCode)}/tasks?${taskIdParam}highlight=${encodeURIComponent(taskName || '')}`);
        } else {
          const params = new URLSearchParams();
          params.set('tab', 'assigned');
          if (taskName) params.set('highlight', taskName);
          navigate(`/task-assignment?${params.toString()}`, { state: { tab: 'assigned' } });
        }
      } else {
        const params = new URLSearchParams();
        if (taskName) params.set('highlight', taskName);
        navigate(`/my-tasks?${params.toString()}`);
      }
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
    const seenTaskKeys = new Set<string>();
    const uniqueList: typeof notifications = [];

    // Inject app update notification if available
    if (availableUpdateVersion && !dismissedNotifIds.has(`app-update-${availableUpdateVersion}`)) {
      uniqueList.push({
        id: `app-update-${availableUpdateVersion}`,
        title: `Bản cập nhật mới v${availableUpdateVersion}`,
        message: `Đã có phiên bản mới v${availableUpdateVersion}. Nhấn vào đây để khởi động lại và cập nhật ngay.`,
        timestamp: new Date().toISOString(),
        read: false,
        icon: 'system_update',
        type: 'app_update',
        link: '__RESTART_UPDATE__'
      } as any);
    }

    notifications.forEach(n => {
      // Filter out notifications not intended for this user
      if (!isNotificationForUser(n, user, engineers, tasks)) return;
      // Filter out notifications dismissed by this specific user account
      if (dismissedNotifIds.has(n.id)) return;

      const cleanTitle = n.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();

      // Extract task name inside quotes "..." if present (e.g. "Điện thoại IP phone...")
      const quoteMatch = n.message?.match(/"([^"]+)"/);
      const extractedTaskName = quoteMatch ? quoteMatch[1].trim().toLowerCase() : '';

      let notifTimeKey = '';
      try {
        const d = new Date(n.timestamp || '');
        if (!isNaN(d.getTime())) {
          // Group by 2-minute bucket
          notifTimeKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${Math.floor(d.getMinutes() / 2)}`;
        }
      } catch {}

      if (extractedTaskName && (n.type?.startsWith('task_') || cleanTitle.toLowerCase().includes('giao việc') || cleanTitle.toLowerCase().includes('trao đổi'))) {
        const taskKey = `${n.type?.split(':::')[0] || 'task'}:::${extractedTaskName}:::${notifTimeKey}`;
        if (seenTaskKeys.has(taskKey)) return;
        seenTaskKeys.add(taskKey);
      }

      const key = `${cleanTitle}:::${n.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(n.type === 'app_update' ? n : { ...n, read: readNotifIds.has(n.id) });
      }
    });
    return uniqueList;
  }, [notifications, user, engineers, tasks, dismissedNotifIds, availableUpdateVersion, readNotifIds]);

  // Priority notifications: Overdue 1-2 days or Due soon
  const centerModalNotifications = useMemo(() => {
    return displayNotifications.filter(n => !n.read);
  }, [displayNotifications]);



  const userClosedCenterModalRef = useRef(false);

  useEffect(() => {
    try {
      const hasShown = sessionStorage.getItem('has_shown_center_notif_modal');
      if (autoShowNotificationPopup && !hasShown && !userClosedCenterModalRef.current && centerModalNotifications.length > 0) {
        setShowCenterModal(true);
      }
    } catch {}
  }, [centerModalNotifications, autoShowNotificationPopup]);

  const closeCenterModal = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    userClosedCenterModalRef.current = true;
    setShowCenterModal(false);
    try {
      sessionStorage.setItem('has_shown_center_notif_modal', 'true');
    } catch {}
  };

  const unreadNotifications = useMemo(() => displayNotifications.filter(item => !item.read), [displayNotifications]);
  const unreadCount = unreadNotifications.length;
  const activeNotifications = activeTab === 'unread' ? unreadNotifications : displayNotifications;

  const floatingPopoverStyle = useMemo<React.CSSProperties>(() => {
    if (!position) {
      return {
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 48px)',
        right: '12px',
        zIndex: 9995,
      };
    }
    const isRight = typeof window !== 'undefined' ? position.x > window.innerWidth / 2 : true;
    const isBottom = typeof window !== 'undefined' ? position.y > window.innerHeight / 2 : false;

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9995,
    };

    if (isBottom) {
      style.bottom = `${Math.max(10, (typeof window !== 'undefined' ? window.innerHeight : 800) - position.y + 8)}px`;
      style.top = 'auto';
    } else {
      style.top = `${Math.max(10, position.y + 42)}px`;
      style.bottom = 'auto';
    }

    if (isRight) {
      style.right = `${Math.max(10, (typeof window !== 'undefined' ? window.innerWidth : 400) - position.x - 36)}px`;
      style.left = 'auto';
    } else {
      style.left = `${Math.max(10, position.x)}px`;
      style.right = 'auto';
    }

    return style;
  }, [position]);

  // ─── TỰ ĐỘNG BẮN THÔNG BÁO RA HỆ ĐIỀU HÀNH (DESKTOP BANNER + MOBILE LOCKSCREEN) ───
  const isInitialNotifLoadRef = useRef(true);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestSystemNotificationPermission();
  }, []);

  useEffect(() => {
    if (displayNotifications.length === 0) return;

    if (isInitialNotifLoadRef.current) {
      isInitialNotifLoadRef.current = false;
      displayNotifications.forEach(n => knownNotificationIdsRef.current.add(n.id));
      return;
    }

    // Lọc các thông báo mới chưa đọc vừa được gửi tới
    const newlyArrived = displayNotifications.filter(n => !n.read && !knownNotificationIdsRef.current.has(n.id));

    if (newlyArrived.length > 0) {
      const topNotif = newlyArrived[0];
      const cleanTitle = (topNotif.title || 'Thông báo TITSMART')
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '')
        .trim();

      sendSystemNotification({
        id: topNotif.id,
        title: cleanTitle || 'Thông báo mới',
        body: topNotif.message || 'Bạn có thông báo mới từ hệ thống TITSMART.',
        url: topNotif.link
      });

      newlyArrived.forEach(n => knownNotificationIdsRef.current.add(n.id));
    }
  }, [displayNotifications]);

  useEffect(() => {
    // Initial fetch of notifications and engineers
    const store = useRealtimeStore.getState();
    store.fetchNotifications();
    store.fetchEngineers();
  }, [user?.id, user?.username]);

  useEffect(() => {
    const handleResize = () => {
      // Khi người dùng thay đổi kích thước / phóng to / thu nhỏ cửa sổ ứng dụng, tự động đưa chuông về vị trí mặc định
      setPosition(null);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const renderCenterModal = () => {
    if (!showCenterModal || centerModalNotifications.length === 0) return null;
    return (
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn pointer-events-auto"
        onClick={closeCenterModal}
      >
        <div 
          className="bg-white rounded-lg shadow-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-lg overflow-hidden border border-outline-variant flex flex-col max-h-[85vh] sm:max-h-[80vh] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 bg-surface-container-low border-b border-outline-variant flex justify-between items-center select-none shrink-0">
            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-[17px]">notifications</span>
              <span className="truncate">Thông báo</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={closeCenterModal}
                title="Đóng"
                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] block pointer-events-none">close</span>
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
                  <span className="material-symbols-outlined text-xl pointer-events-none">
                    {n.title.includes('quá hạn') ? 'warning' : 'event_available'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pointer-events-none">
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
              type="button"
              onClick={closeCenterModal}
              className="px-5 py-1.5 bg-primary hover:opacity-90 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!showNotificationBell) {
    return renderCenterModal();
  }

  if (isSidebar) {
    return (
      <>
        {showPopover && (
          <div
            className="fixed inset-0 z-[9988] bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(false);
            }}
          />
        )}
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
          <div className="fixed left-[12px] sm:left-[60px] md:left-[175px] bottom-4 sm:bottom-6 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden z-[9999] w-[calc(100vw-24px)] sm:w-[350px] max-w-[350px] animate-in fade-in slide-in-from-left-2 duration-150 flex flex-col">
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
                <div className="flex items-center gap-2">
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
                      const h = d.getHours();
                      const m = d.getMinutes();
                      if (h === 0 && m === 0) {
                        dateStr = `${d.getDate()}/${d.getMonth()+1}`;
                      } else {
                        dateStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
                      }
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

        </div>
        {renderCenterModal()}
      </>
    );
  }

  return (
    <>
      {showPopover && (
        <div
          className="fixed inset-0 z-[9988] bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover(false);
          }}
        />
      )}

      <div
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={
          position
            ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
            : undefined
        }
        className={`fixed z-[9990] touch-none select-none pointer-events-auto ${
          position ? '' : 'top-[calc(env(safe-area-inset-top,0px)+8px)] sm:top-[6px] right-3 sm:right-4'
        }`}
      >
        <button
          type="button"
          onClick={handleBellClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setPosition(null);
          }}
          title="Thông báo hệ thống (Nhấn giữ & kéo để di chuyển, nhấp đúp để đặt lại vị trí)"
          className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center transition-all relative border shadow-xs cursor-grab active:cursor-grabbing touch-none select-none
            ${showPopover ? 'bg-blue-50 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[20px] pointer-events-none">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white pointer-events-none shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {showPopover && (
        <div
          style={floatingPopoverStyle}
          className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden w-[calc(100vw-24px)] sm:w-[350px] max-w-[350px] flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
        >
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
              <div className="flex items-center gap-2">
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

      {renderCenterModal()}
    </>
  );
};
