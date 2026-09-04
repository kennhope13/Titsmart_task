import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore, hasPermission } from '../../services/authStore';
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
  const [showUserPopover, setShowUserPopover] = useState(false);
  
  const isExpanded = isExpandedProp || (sidebarHoverToExpand && isHovered) || showUserPopover;
  const navigate = useNavigate();
  const unreadCount = notifications.filter((item) => !item.read).length;
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
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
    if (currentProject) {
      const baseProjectItems = [
          { label: 'Tổng quan', path: `/projects/${currentProject.id}/overview`, icon: 'dashboard', req: 'VIEW_PROJECTS' },
          { label: 'Tiến độ Công việc', path: `/projects/${currentProject.id}/tasks`, icon: 'fact_check', req: 'VIEW_TASKS' },
          { label: 'Vật tư & Chi phí', path: `/projects/${currentProject.id}/cost-plan`, icon: 'account_balance_wallet', req: 'VIEW_FINANCE' },
          { label: 'Hồ sơ', path: `/projects/${currentProject.id}/documents`, icon: 'file_present', req: 'VIEW_DOCUMENTS' },
          { label: 'Kho Dự án', path: `/projects/${currentProject.id}/inventory`, icon: 'inventory_2', req: 'VIEW_MATERIALS' },
          { label: 'Nhật ký Hiện trường', path: `/projects/${currentProject.id}/field-logs`, icon: 'add_a_photo', req: 'VIEW_FIELD_LOGS' }
        ];

      const projectItems = baseProjectItems.filter(item => hasPermission(user, item.req as any));

      return [
        {
          title: '',
          collapsible: false,
          items: [
            { label: 'Tất cả dự án', path: '/projects', icon: 'arrow_back' }
          ].filter(() => hasPermission(user, 'VIEW_PROJECTS'))
        },
        {
          title: currentProject.name,
          collapsible: false,
          items: projectItems
        }
      ].filter(group => group.items.length > 0);
    }

    const mainItems = [
      { label: 'Tổng quan', path: '/dashboard', icon: 'analytics', req: 'VIEW_PROJECTS' },
      { label: 'Tất cả dự án', path: '/projects', icon: 'cell_tower', req: 'VIEW_PROJECTS' },
      { label: 'Công việc', path: '/my-tasks', icon: 'checklist', req: 'VIEW_TASKS' },
      { label: 'Tổng kho', path: '/materials', icon: 'warehouse', req: 'VIEW_MATERIALS' },
      { label: 'Nhân sự', path: '/personnel', icon: 'groups', req: 'VIEW_USERS' },
      { label: 'Nhật ký Hoạt động', path: '/activity-log', icon: 'history', req: 'VIEW_ACTIVITY_LOG' }
    ];

    return [{
      title: '',
      collapsible: false,
      items: mainItems.filter(item => hasPermission(user, item.req as any))
    }].filter(group => group.items.length > 0);
  };

  const navGroups = getNavGroups();

  return (
    <aside 
      ref={sidebarRef} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out flex flex-col border-r border-slate-200 bg-white z-40 shadow-[0_0_15px_rgba(0,0,0,0.05)] overflow-x-hidden ${isExpanded ? 'w-[170px]' : 'w-[56px]'}`}
    >
      <div className="relative h-12 px-2 flex items-center gap-2 border-b border-slate-100 min-w-[170px]">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div 
            className={`relative w-10 h-10 flex items-center justify-center flex-shrink-0 ${sidebarShowToggleButton ? 'cursor-pointer group/logo' : ''}`}
            onClick={() => sidebarShowToggleButton && toggleSidebar && toggleSidebar()}
            title={sidebarShowToggleButton ? "Ghim / Bỏ ghim thanh menu" : ""}
          >
            <img 
              src="./logo.png" 
              alt="TITSMART" 
              className={`w-5 h-5 object-contain transition-opacity duration-200 ${sidebarShowToggleButton ? 'group-hover/logo:opacity-0' : ''}`} 
            />
            {sidebarShowToggleButton && (
              <div className="absolute inset-0 bg-slate-100 rounded-lg flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-all text-slate-500 hover:text-primary hover:bg-slate-200">
                <span className="material-symbols-outlined text-[20px] transform -scale-x-100">view_sidebar</span>
              </div>
            )}
          </div>
          
          <div className={`min-w-0 transition-opacity duration-300 flex-1 flex flex-row items-center justify-between ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'}`}>
            <div className="flex flex-col justify-center">
              <h1 className="font-extrabold text-[16px] text-blue-900 leading-none tracking-tight">TITSMART</h1>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Project Manager</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 w-[170px] px-2 mt-3 pb-4 space-y-3 overflow-y-auto scrollbar-hide">
        {navGroups.map((group, index) => (
          <div key={group.title || index} className="space-y-1">
            {group.title && (
              <div
                className={`flex items-center justify-between mb-2 select-none ${group.collapsible !== false ? 'cursor-pointer hover:text-primary' : ''}`}
                onClick={() => group.collapsible !== false && toggleGroup(group.title)}
              >
                <h3 className={`text-[11px] font-black uppercase tracking-wider transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-0' : 'opacity-0 delay-200'} ${group.collapsible !== false ? 'text-slate-500 hover:text-primary' : 'text-slate-700'}`}>{group.title}</h3>
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
                    `flex items-center gap-3 rounded-lg text-xs transition-all overflow-hidden whitespace-nowrap h-10
                    ${isExpanded ? 'w-full px-3' : 'w-10'}
                    ${
                      isActive
                        ? 'text-primary bg-blue-100 font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
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

        </nav>
      <div className="pt-4 pb-4 px-2 border-t border-slate-100 relative flex flex-col gap-2">
          {/* User Profile */}
          <button
            onClick={() => {
              setShowUserPopover(!showUserPopover);
            }}
            className={`flex items-center rounded-xl transition-all overflow-hidden whitespace-normal h-10
              ${isExpanded ? 'w-full px-3 py-3 gap-3 h-auto' : 'w-10 justify-center gap-0'}
              ${
              showUserPopover
                ? 'bg-blue-50 ring-1 ring-blue-100'
                : 'hover:bg-slate-50'
            }`}
          >
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-slate-400 bg-slate-100 uppercase shadow-sm border border-slate-200">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div className={`text-left leading-tight transition-all duration-300 overflow-hidden ${isExpanded ? 'flex-1 opacity-100 delay-0 w-auto' : 'flex-none w-0 opacity-0 delay-200'}`}>
                <span className="block font-bold text-xs text-slate-800 whitespace-nowrap">{user?.name || 'Admin'}</span>
                <span className="block text-[10px] text-slate-500 whitespace-nowrap">{user?.title || 'Quản trị viên'}</span>
              </div>
              <span className={`material-symbols-outlined text-base text-slate-400 transition-all duration-300 overflow-hidden ${isExpanded ? 'flex-shrink-0 opacity-100 delay-0 w-[16px]' : 'w-0 opacity-0 delay-200'}`}>settings</span>
            </button>

          {showUserPopover && (
            <div className="absolute bottom-full left-2 mb-2 w-40 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50">
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
    </aside>
  );
};
