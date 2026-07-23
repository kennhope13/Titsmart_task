import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';

interface SidebarProps {
  onOpenNewProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewProject }) => {
  const { notifications, markNotificationRead, clearNotifications } = useRealtimeStore();
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const unreadCount = notifications.filter((item) => !item.read).length;

  const navItems = [
    { label: 'Tổng quan', path: '/', icon: 'dashboard' },
    { label: 'Quản lý Công việc', path: '/tasks', icon: 'assignment' },
    { label: 'Quản lý Vật tư', path: '/materials', icon: 'inventory_2' },
    { label: 'Xử lý Sự cố', path: '/issues', icon: 'report_problem' },
    { label: 'Xuất Báo cáo', path: '/reports', icon: 'analytics' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r border-slate-200 bg-white z-40">
      <div className="relative p-5 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden bg-white">
            <img src="/logo.png" alt="TITSMART" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base text-primary leading-tight truncate">TITSMART</h1>
          </div>
        </div>

        <button
          onClick={() => setShowNotifPopover(!showNotifPopover)}
          className="relative w-9 h-9 flex items-center justify-center text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors flex-shrink-0"
          title="Thông báo"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />}
        </button>

        {showNotifPopover && (
          <div className="absolute left-full top-3 ml-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-xs text-slate-800">Thông báo thời gian thực</span>
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-[11px] text-slate-500 hover:text-primary">
                  Xóa tất cả
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">Không có thông báo mới</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationRead(notification.id)}
                    className={`p-3 text-xs hover:bg-slate-50 cursor-pointer flex gap-3 ${!notification.read ? 'bg-blue-50/50 font-medium' : 'opacity-70'}`}
                  >
                    <span className="material-symbols-outlined text-primary text-base flex-shrink-0">{notification.icon || 'info'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-0.5">
                        <span className="font-bold text-slate-800 truncate">{notification.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{notification.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-tight">{notification.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        <button
          onClick={onOpenNewProject}
          className="w-full bg-primary text-white py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Tạo Dự án Mới
        </button>
      </div>

      <nav className="flex-1 px-3 mt-5 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'text-primary bg-blue-50 border-r-4 border-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <span className="material-symbols-outlined text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-2">
        <a
          href="#settings"
          onClick={(event) => event.preventDefault()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-base">settings</span>
          <span>Cài đặt</span>
        </a>

        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-50 border border-slate-100">
          <img
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80"
            alt="Avatar quản lý"
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
          <div className="min-w-0 leading-tight">
            <span className="block font-bold text-xs text-slate-800 truncate">Kỹ sư Nam</span>
            <span className="block text-[10px] text-slate-500 truncate">Chỉ huy trưởng</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
