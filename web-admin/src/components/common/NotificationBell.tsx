import React, { useState, useRef, useEffect } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';

export const NotificationBell: React.FC = () => {
  const { notifications, markNotificationRead, clearNotifications } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(item => !item.read).length;
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

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

  if (!isAdmin) return null;

  return (
    <div ref={popoverRef} className="absolute top-[13px] right-4 z-[60]">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`w-[36px] h-[36px] rounded-md flex items-center justify-center transition-all relative border 
          ${showPopover ? 'bg-blue-50 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
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
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-slate-200 text-4xl">notifications_off</span>
                <span className="text-slate-500 text-xs">Không có thông báo nào</span>
              </div>
            ) : (
              notifications.map(notification => {
                let dateStr = notification.timestamp;
                try {
                  const d = new Date(notification.timestamp || '');
                  if (!isNaN(d.getTime())) {
                    dateStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
                  }
                } catch(e) {}
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) markNotificationRead(notification.id);
                    }}
                    className={`p-3 text-xs hover:bg-slate-50 cursor-pointer flex gap-3 transition-colors ${!notification.read ? 'bg-blue-50/30' : 'opacity-75'}`}
                  >
                    <span className={`material-symbols-outlined text-base flex-shrink-0 ${!notification.read ? 'text-primary' : 'text-slate-400'}`}>
                      {notification.icon || 'info'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`font-bold truncate ${!notification.read ? 'text-slate-800' : 'text-slate-600'}`}>{notification.title}</span>
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
    </div>
  );
};
