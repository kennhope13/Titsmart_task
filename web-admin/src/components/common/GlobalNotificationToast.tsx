import React, { useEffect, useState } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';

export const GlobalNotificationToast: React.FC = () => {
  const notifications = useRealtimeStore((state) => state.notifications);
  const markNotificationRead = useRealtimeStore((state) => state.markNotificationRead);
  const [activeToasts, setActiveToasts] = useState<Array<{ id: string; title: string; message: string; isOverdue: boolean }>>([]);

  useEffect(() => {
    // Show 2 most recent unread notifications as Toast cards in bottom right corner
    const unreadNotifs = notifications.filter(n => !n.read);
    
    // Deduplicate by title + message and take max 2 most recent
    const seen = new Set<string>();
    const list: Array<{ id: string; title: string; message: string; isOverdue: boolean }> = [];
    
    unreadNotifs.forEach(n => {
      const cleanTitle = n.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
      const key = `${cleanTitle}:::${n.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: n.id,
          title: cleanTitle,
          message: n.message,
          isOverdue: n.title.includes('quá hạn')
        });
      }
    });

    setActiveToasts(list.slice(0, 2));
  }, [notifications]);

  const handleDismiss = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
    markNotificationRead(id);
  };

  useEffect(() => {
    if (activeToasts.length > 0) {
      const timer = setTimeout(() => {
        // Auto dismiss the oldest toast after 10s
        const oldest = activeToasts[0];
        if (oldest) handleDismiss(oldest.id);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeToasts]);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-200 transition-all animate-in slide-in-from-bottom-5 duration-200 relative group"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            toast.isOverdue ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {toast.isOverdue ? 'warning' : 'notifications_active'}
            </span>
          </div>

          <div className="flex flex-col flex-1 min-w-0 pr-6">
            <span className="font-sans text-xs font-bold text-slate-900 line-clamp-1">{toast.title}</span>
            <span className="font-sans text-[12px] font-medium text-slate-600 leading-snug break-words mt-0.5">
              {toast.message}
            </span>
          </div>

          <button
            onClick={() => handleDismiss(toast.id)}
            title="Đóng thông báo"
            className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
