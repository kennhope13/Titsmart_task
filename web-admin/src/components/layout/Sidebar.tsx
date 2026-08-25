import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore } from '../../services/authStore';
import { useUIStore } from '../../services/uiStore';

interface SidebarProps {
  isExpanded?: boolean;
  toggleSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded: isExpandedProp = false, toggleSidebar }) => {
  const { notifications, markNotificationRead, clearNotifications, projects } = useRealtimeStore();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { sidebarHoverToExpand, sidebarShowToggleButton, setSidebarHoverToExpand, setSidebarShowToggleButton } = useUIStore();
  
  const location = useLocation();
  const match = location.pathname.match(/^\/projects\/([^\/]+)/);
  const currentProjectId = match && match[1] !== 'new' ? match[1] : null;
  const currentProject = projects.find(p => p.id === currentProjectId || p.code === currentProjectId);

  const [isHovered, setIsHovered] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showUserPopover, setShowUserPopover] = useState(false);
  
  const isExpanded = isExpandedProp || (sidebarHoverToExpand && isHovered) || showNotifPopover || showUserPopover;
  const navigate = useNavigate();
  const unreadCount = notifications.filter((item) => !item.read).length;
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setShowNotifPopover(false);
        setShowUserPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getNavGroups = () => {
    const role = user?.role || 'staff';
    
    if (currentProject) {
      const projectItems = [
        { label: 'Tiến độ Công việc', path: `/projects/${currentProject.id}/tasks`, icon: 'playlist_add_check' },
        { label: 'Nhật ký Hiện trường', path: `/projects/${currentProject.id}/field-logs`, icon: 'photo_camera' },
        { label: 'Vật tư & Chi phí', path: `/projects/${currentProject.id}/cost-plan`, icon: 'request_quote' },
        { label: 'Kho Dự án', path: `/projects/${currentProject.id}/inventory`, icon: 'warehouse' }
      ];

      if (role !== 'staff' && role !== 'engineer') {
        projectItems.push({ label: 'Theo dõi Hồ sơ', path: `/projects/${currentProject.id}/documents`, icon: 'drafts' });
      }

      return [
        {
          title: 'Hệ thống',
          collapsible: false,
          items: [
            { label: 'Tất cả Dự án', path: '/projects', icon: 'arrow_back' }
          ]
        },
        {
          title: currentProject.name,
          collapsible: false,
          items: projectItems
        }
      ];
    }

    // Admin sees everything
    if (role === 'admin') {
      return [{
        title: '',
        collapsible: false,
        items: [
          { label: 'Tổng quan', path: '/dashboard', icon: 'dashboard' },
          { label: 'Danh sách Dự án', path: '/projects', icon: 'domain' },
          { label: 'Kho & Vật tư', path: '/materials', icon: 'warehouse' },
          { label: 'Nhân sự', path: '/personnel', icon: 'groups' },
          { label: 'Nhật ký Hoạt động', path: '/activity-log', icon: 'history' }
        ]
      }];
    }

    // PM sees Dashboard, Projects, Materials, but NOT Personnel/System
    if (role === 'pm') {
      return [{
        title: '',
        collapsible: false,
        items: [
          { label: 'Tổng quan', path: '/dashboard', icon: 'dashboard' },
          { label: 'Danh sách Dự án', path: '/projects', icon: 'domain' },
          { label: 'Kho & Vật tư', path: '/materials', icon: 'warehouse' }
        ]
      }];
    }

    // Engineer sees Projects, Materials
    if (role === 'engineer') {
      return [{
        title: '',
        collapsible: false,
        items: [
          { label: 'Danh sách Dự án', path: '/projects', icon: 'domain' },
          { label: 'Kho & Vật tư', path: '/materials', icon: 'warehouse' }
        ]
      }];
    }

    // Staff only sees Projects
    return [{
      title: '',
      collapsible: false,
      items: [
        { label: 'Danh sách Dự án', path: '/projects', icon: 'domain' }
      ]
    }];
  };

  const navGroups = getNavGroups();

  return (
    <aside 
      ref={sidebarRef} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out flex flex-col border-r border-slate-200 bg-white z-40 shadow-[0_0_15px_rgba(0,0,0,0.05)] overflow-x-hidden ${isExpanded ? 'w-[280px]' : 'w-[64px]'}`}
    >
      <div className="relative h-[72px] px-3 flex items-center gap-3 border-b border-slate-100 min-w-[280px]">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={toggleSidebar} title="Mở rộng / Thu gọn">
          <img src="./logo.png" alt="TITSMART" className="w-10 h-10 object-contain" />
        </div>
        <div className={`min-w-0 transition-opacity duration-300 flex-1 flex flex-col justify-center ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'}`}>
          <h1 className="font-extrabold text-[18px] text-blue-900 leading-none tracking-tight">TITSMART</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Project Manager</p>
        </div>

        <div className={`relative transition-opacity duration-300 flex-shrink-0 pr-1 ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'}`}>
          <button
            onClick={() => {
              setShowNotifPopover(!showNotifPopover);
              setShowUserPopover(false);
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative
              ${showNotifPopover ? 'text-primary bg-blue-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        {showNotifPopover && (
          <div className="absolute top-full left-3 right-3 mt-2 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50">
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

      <nav className="flex-1 w-[280px] px-3 mt-3 pb-4 space-y-3 overflow-y-auto scrollbar-hide">
        {navGroups.map((group, index) => (
          <div key={group.title || index} className="space-y-1">
            {group.title && (
              <div
                className={`flex items-center justify-between mb-2 select-none ${group.collapsible !== false ? 'cursor-pointer hover:text-primary' : ''}`}
                onClick={() => group.collapsible !== false && toggleGroup(group.title)}
              >
                <h3 className={`text-[10px] font-extrabold uppercase tracking-wider transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'} ${group.collapsible !== false ? 'text-slate-400 hover:text-primary' : 'text-slate-400'}`}>{group.title}</h3>
                {group.collapsible !== false && (
                  <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'}`}>
                    {collapsedGroups[group.title] ? 'expand_more' : 'expand_less'}
                  </span>
                )}
              </div>
            )}

            <div className={`space-y-1 overflow-hidden transition-all duration-200 ${group.collapsible !== false && collapsedGroups[group.title] ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg text-xs font-semibold transition-all overflow-hidden whitespace-nowrap h-10
                    ${isExpanded ? 'w-full px-3' : 'w-10'}
                    ${
                      isActive
                        ? 'text-primary bg-blue-50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <span className={`material-symbols-outlined text-lg flex flex-shrink-0 items-center ${isExpanded ? 'w-auto justify-start' : 'w-10 justify-center'}`}>{item.icon}</span>
                  <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-slate-100 relative flex flex-col gap-2">
          {/* User Profile */}
          <button
            onClick={() => {
              setShowUserPopover(!showUserPopover);
              setShowNotifPopover(false);
            }}
            className={`flex items-center gap-3 rounded-xl transition-all overflow-hidden whitespace-normal h-10
              ${isExpanded ? 'w-full px-3 py-3 h-auto' : 'w-10'}
              ${
              showUserPopover
                ? 'bg-blue-50 ring-1 ring-blue-100'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm text-white bg-blue-600 uppercase shadow-sm">
              {(user?.name || 'A').charAt(0)}
            </div>
            <div className={`min-w-0 text-left leading-tight flex-1 transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'}`}>
              <span className="block font-bold text-xs text-slate-800 break-words">{user?.name || 'Admin'}</span>
              <span className="block text-[10px] text-slate-500 break-words">{user?.title || 'Quản trị viên'}</span>
            </div>
            <span className={`material-symbols-outlined text-base text-slate-400 flex-shrink-0 transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'}`}>settings</span>
          </button>

          {showUserPopover && (
            <div className="absolute bottom-full left-3 mb-2 w-52 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50">
              <div className="p-1.5 space-y-0.5">
                <button 
                  onClick={() => {
                    setShowUserPopover(false);
                    alert('Chức năng đổi mật khẩu sẽ kết nối API ở bản đầy đủ.');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">lock_reset</span>
                  Đổi mật khẩu
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                
                <div className="px-3 py-1.5 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chế độ thanh điều hướng</p>
                  
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => {
                      setSidebarShowToggleButton(true);
                      setSidebarHoverToExpand(false);
                    }}
                  >
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">Sử dụng nút ghim</span>
                    <input 
                      type="radio" 
                      className="w-3.5 h-3.5 text-primary focus:ring-primary border-slate-300 pointer-events-none"
                      checked={sidebarShowToggleButton}
                      readOnly
                    />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => {
                      setSidebarHoverToExpand(true);
                      setSidebarShowToggleButton(false);
                    }}
                  >
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">Mở rộng khi trỏ chuột</span>
                    <input 
                      type="radio" 
                      className="w-3.5 h-3.5 text-primary focus:ring-primary border-slate-300 pointer-events-none"
                      checked={sidebarHoverToExpand}
                      readOnly
                    />
                  </div>
                </div>
                
                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Đăng xuất
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                <div className="px-3 py-1.5 text-center">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    Phiên bản {import.meta.env.VITE_APP_VERSION || '1.0.0'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};
