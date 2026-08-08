import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';

export const Sidebar: React.FC = () => {
  const { notifications, markNotificationRead, clearNotifications } = useRealtimeStore();
  const user = useAuthStore((state) => state.user);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const unreadCount = notifications.filter((item) => !item.read).length;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const navGroups = [
    {
      title: 'Bảng điều khiển',
      collapsible: false,
      items: [
        { label: 'Tổng quan', path: '/', icon: 'dashboard' },
      ]
    },
    {
      title: 'Quản lý dự án',
      items: [
        { label: 'Danh sách Dự án', path: '/projects', icon: 'domain' },
        { label: 'Kế hoạch & Chi phí', path: '/cost-plan', icon: 'request_quote' },
        { label: 'Nhật ký Hiện trường', path: '/field-logs', icon: 'photo_camera' },
        { label: 'Theo dõi Hồ sơ', path: '/document-tracking', icon: 'drafts' },
      ]
    },
    {
      title: 'Kho công ty',
      items: [
        { label: 'Kho & Vật tư', path: '/materials', icon: 'warehouse' },
      ]
    },
    {
      title: 'Hệ thống & Nội bộ',
      items: [
        { label: 'Nhân sự', path: '/personnel', icon: 'groups' },
        { label: 'Nhật ký Hoạt động', path: '/activity-log', icon: 'history' },
        { label: 'Báo cáo', path: '/reports', icon: 'analytics' },
      ]
    },

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
            <p className="text-[10px] text-slate-500 font-medium">Project Manager</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors relative"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {showNotifPopover && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-sm text-slate-800">Thông báo</h3>
                <button onClick={clearNotifications} className="text-[11px] text-primary font-bold hover:underline">Xóa tất cả</button>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">Không có thông báo nào</div>
                ) : (
                  notifications.map(notification => (
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
      </div>

      <nav className="flex-1 px-3 mt-3 pb-4 space-y-3 overflow-y-auto scrollbar-hide">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div
              className={`flex items-center justify-between px-3 mb-2 select-none ${group.collapsible !== false ? 'cursor-pointer group' : ''}`}
              onClick={() => group.collapsible !== false && toggleGroup(group.title)}
            >
              <h3 className={`text-[10px] font-extrabold text-slate-400 uppercase tracking-wider transition-colors ${group.collapsible !== false ? 'group-hover:text-primary' : ''}`}>{group.title}</h3>
              {group.collapsible !== false && (
                <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-primary transition-colors">
                  {collapsedGroups[group.title] ? 'expand_more' : 'expand_less'}
                </span>
              )}
            </div>

            <div className={`space-y-1 overflow-hidden transition-all duration-200 ${group.collapsible !== false && collapsedGroups[group.title] ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'text-primary bg-blue-50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-slate-100">
          <NavLink
            to="/account"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-50 ring-1 ring-blue-100'
                  : 'hover:bg-slate-50'
              }`
            }
          >
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80"
              alt="Avatar quản lý"
              className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
            />
            <div className="min-w-0 leading-tight flex-1">
              <span className="block font-bold text-xs text-slate-800 truncate">{user?.name || 'Admin'}</span>
              <span className="block text-[10px] text-slate-500 truncate">{user?.title || 'Quản trị viên'}</span>
            </div>
            <span className="material-symbols-outlined text-base text-slate-400 flex-shrink-0">settings</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};
