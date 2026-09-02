import React, { useEffect, useState } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';

export const GlobalNotificationToast: React.FC = () => {
  const notifications = useRealtimeStore((state) => state.notifications);
  const user = useAuthStore(state => state.user);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      // Only show toast if the notification was created within the last 15 seconds
      const notificationTime = new Date(latest.timestamp || '').getTime();
      const isRecent = !isNaN(notificationTime) && (Date.now() - notificationTime < 15000);

      if (!latest.read && isRecent) {
        setToast({ show: true, message: `${latest.title}: ${latest.message}` });
        const timer = setTimeout(() => setToast({ show: false, message: '' }), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications]);

  if (!toast.show) return null;
  
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';
  if (!isAdmin) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-1 bg-white px-5 py-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 min-w-[300px]"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
          <span className="material-symbols-outlined text-[20px]">notifications_active</span>
        </div>
        <div className="flex flex-col">
          <span className="font-sans text-sm font-bold text-slate-800 line-clamp-1">Có thông báo mới</span>
          <span className="font-sans text-[13px] font-medium text-slate-600 leading-snug break-words">
            {toast.message}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
