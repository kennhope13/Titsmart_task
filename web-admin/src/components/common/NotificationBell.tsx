import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';
import { useUIStore } from '../../services/uiStore';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, clearNotifications } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const showNotificationBell = useUIStore(state => state.showNotificationBell);
  
  const [showPopover, setShowPopover] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
    setShowPopover(false);
    setShowCenterModal(false);
    sessionStorage.setItem('has_shown_center_notif_modal', 'true');

    // Điều hướng theo loại thông báo
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    const link = notification.link || '';

    if (link) {
      navigate(link);
    } else if (title.includes('hồ sơ') || message.includes('hồ sơ')) {
      navigate('/document-tracking');
    } else if (title.includes('điểm danh') || message.includes('điểm danh')) {
      navigate('/attendance');
    } else if (title.includes('giao việc') || title.includes('công việc') || title.includes('nhiệm vụ') || message.includes('nhiệm vụ') || message.includes('công việc')) {
      navigate('/tasks');
    } else if (title.includes('nhật ký') || message.includes('nhật ký')) {
      navigate('/field-logs');
    }
  };

  const displayNotifications = useMemo(() => {
    const seen = new Set<string>();
    const uniqueList: typeof notifications = [];
    notifications.forEach(n => {
      const cleanTitle = n.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
      const key = `${cleanTitle}:::${n.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(n);
      }
    });
    return uniqueList;
  }, [notifications]);

  // Priority notifications: Overdue 1-2 days or Due soon
  const centerModalNotifications = useMemo(() => {
    return displayNotifications.filter(n => !n.read);
  }, [displayNotifications]);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('has_shown_center_notif_modal');
    if (!hasShown && centerModalNotifications.length > 0) {
      setShowCenterModal(true);
    }
  }, [centerModalNotifications]);

  const closeCenterModal = () => {
    setShowCenterModal(false);
    sessionStorage.setItem('has_shown_center_notif_modal', 'true');
  };

  const unreadCount = displayNotifications.filter(item => !item.read).length;

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

  return (
    <div ref={popoverRef} className="absolute top-[2px] md:top-[6px] right-3 z-[70]">
      <button
        onClick={() => setShowPopover(!showPopover)}
        title="Thông báo hệ thống"
        className={`w-[36px] h-[36px] rounded-md flex items-center justify-center transition-all relative border shadow-sm cursor-pointer
          ${showPopover ? 'bg-blue-50 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      {showPopover && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50 w-[320px]">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
            {notifications.length > 0 && (
              <button onClick={clearNotifications} className="text-[11px] text-primary font-bold hover:underline">Xóa tất cả</button>
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
    </div>
  );
};
