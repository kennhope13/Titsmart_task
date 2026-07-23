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
        { label: 'Công việc', path: '/tasks', icon: 'assignment' },
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
        { label: 'Báo cáo', path: '/reports', icon: 'analytics' },
      ]
    },
    {
      title: 'Cá nhân',
      items: [
        { label: 'Tài khoản', path: '/account', icon: 'account_circle' },
      ]
    }
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

      <div className="px-4 mt-4">
        <button
          onClick={onOpenNewProject}
          className="w-full bg-primary text-white py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Tạo Dự án Mới
        </button>
      </div>

      <nav className="flex-1 px-3 mt-5 pb-4 space-y-6 overflow-y-auto custom-scrollbar">
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
            <span className="block font-bold text-xs text-slate-800 truncate">Admin</span>
            <span className="block text-[10px] text-slate-500 truncate">Quản trị viên</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
