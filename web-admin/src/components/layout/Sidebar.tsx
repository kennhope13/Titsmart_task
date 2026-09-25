import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useAuthStore, hasPermission } from '../../services/authStore';
import { useUIStore } from '../../services/uiStore';
import { SettingsModal } from '../common/SettingsModal';
import { NotificationBell } from '../common/NotificationBell';

interface SidebarProps {
  isExpanded?: boolean;
  toggleSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded: isExpandedProp = false, toggleSidebar }) => {
  const { notifications, markNotificationRead, clearNotifications, projects } = useRealtimeStore();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { sidebarHoverToExpand, sidebarShowToggleButton, showNotificationBell, setSidebarHoverToExpand, setSidebarShowToggleButton, setShowNotificationBell } = useUIStore();
  
  const location = useLocation();
  const match = location.pathname.match(/^\/projects\/([^\/]+)/);
  const currentProjectId = match && match[1] !== 'new' ? match[1] : null;
  const currentProject = projects.find(p => p.id === currentProjectId || p.code === currentProjectId);

  const [isHovered, setIsHovered] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  const isExpanded = isExpandedProp || (sidebarHoverToExpand && isHovered);
  const navigate = useNavigate();
  const unreadCount = notifications.filter((item) => !item.read).length;
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';
  const sidebarRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
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
          { label: 'Sơ đồ dự án', path: `/projects/${currentProject.id}/diagram`, icon: 'account_tree', req: 'VIEW_PROJECT_DIAGRAM' },
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
      { label: 'Chi phí văn phòng', path: '/office-costs', icon: 'account_balance_wallet', req: 'VIEW_OFFICE_COSTS' },
      { label: 'Quản lý hồ sơ', path: '/document-tracking', icon: 'folder_managed', req: 'VIEW_DOCUMENTS' },
      { label: 'Tổng kho', path: '/materials', icon: 'warehouse', req: 'VIEW_MATERIALS' },
      { label: 'Công và nghỉ', path: '/attendance', icon: 'schedule', req: 'VIEW_TASKS' },
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
    <>
      <aside 
        ref={sidebarRef} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out flex-col border-r border-slate-200 bg-white z-40 shadow-[0_0_15px_rgba(0,0,0,0.05)] overflow-x-hidden ${isExpanded ? 'w-[170px]' : 'w-[56px]'}`}
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
        <div className="pt-3 pb-3 px-2 border-t border-slate-100 relative flex flex-col gap-1.5">
            {/* User Profile */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="Cài đặt hệ thống & Tài khoản"
              className={`flex items-center rounded-xl transition-all overflow-hidden whitespace-normal h-10 hover:bg-slate-100 ${
                isExpanded ? 'w-full px-2.5 py-2 gap-2.5 h-auto' : 'w-10 justify-center gap-0'
              }`}
            >
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-slate-400 bg-slate-100 uppercase shadow-xs border border-slate-200">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div className={`text-left leading-tight transition-all duration-300 overflow-hidden ${isExpanded ? 'flex-1 opacity-100 delay-0 min-w-0' : 'flex-none w-0 opacity-0 delay-200'}`}>
                <span className="block font-bold text-xs text-slate-800 truncate" title={user?.name}>
                  {user?.name ? user.name.trim().split(' ').pop() : 'Admin'}
                </span>
                <span className="block text-[10px] text-slate-500 truncate" title={user?.title}>{user?.title || 'Quản trị viên'}</span>
              </div>
              <span
                className={`material-symbols-outlined text-base text-slate-400 hover:text-primary transition-all duration-300 overflow-hidden ${isExpanded ? 'flex-shrink-0 opacity-100 delay-0 w-[16px]' : 'w-0 opacity-0 delay-200'}`}
              >
                settings
              </span>
            </button>
          </div>
      </aside>

      {/* Mobile Bottom Sheet Modal for All Features */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Bottom Sheet Card Panel */}
          <div 
            onTouchStart={(e) => {
              (e.currentTarget as any)._startY = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              const startY = (e.currentTarget as any)._startY;
              if (startY && e.touches[0].clientY - startY > 60) {
                setIsMobileDrawerOpen(false);
              }
            }}
            className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col z-[101] animate-in slide-in-from-bottom duration-300 border-t border-slate-200 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"
          >
            {/* Grab Handle Header */}
            <div 
              className="w-full flex flex-col items-center pt-3 pb-2 px-4 cursor-pointer border-b border-slate-100 select-none active:opacity-70 transition-opacity" 
              onClick={() => setIsMobileDrawerOpen(false)}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-2 hover:bg-slate-400 transition-colors" />
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">apps</span>
                  <h3 className="font-bold text-sm text-slate-800">Tất cả tính năng</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Grid list of remaining features (excluding items already present on the bottom bar) */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4 custom-scrollbar">
              {(() => {
                const visibleBottomPaths = new Set(
                  (currentProject ? [
                    `/projects/${currentProject.id}/overview`,
                    `/projects/${currentProject.id}/tasks`,
                    `/projects/${currentProject.id}/cost-plan`,
                    `/projects/${currentProject.id}/documents`,
                  ] : [
                    '/dashboard',
                    '/projects',
                    '/my-tasks',
                    '/office-costs',
                  ])
                );

                return navGroups.map((group, idx) => {
                  const filteredItems = group.items.filter(item => !visibleBottomPaths.has(item.path));
                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={group.title || idx} className="space-y-2">
                      {group.title && (
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                          {group.title}
                        </div>
                      )}
                      <div className="grid grid-cols-4 gap-2">
                        {filteredItems.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className={({ isActive }) =>
                              `flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all text-center ${
                                isActive
                                  ? 'bg-blue-50 text-primary font-bold shadow-sm border border-blue-200'
                                  : 'bg-slate-50 text-slate-700 font-medium hover:bg-slate-100 border border-slate-100'
                              }`
                            }
                          >
                            <span className="material-symbols-outlined text-2xl mb-1 text-primary">{item.icon}</span>
                            <span className="text-[11px] leading-tight truncate w-full">{item.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom Footer User Info & Logout */}
            {user && (
              <div className="mx-4 mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 truncate">{user.name || user.username}</div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <span>{user.role || 'Quản trị viên'}</span>
                      <span>•</span>
                      <span className="font-mono text-primary font-bold">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      setShowSettingsModal(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                    title="Cài đặt hệ thống"
                  >
                    <span className="material-symbols-outlined text-base text-slate-600">settings</span>
                    Cài đặt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Shown ONLY on screens <= 768px via css md:hidden) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[58px] bg-white border-t border-slate-200 z-50 flex items-center justify-around px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,0px)]">
        {(currentProject ? [
          { label: 'Tổng quan', path: `/projects/${currentProject.id}/overview`, icon: 'dashboard' },
          { label: 'Công việc', path: `/projects/${currentProject.id}/tasks`, icon: 'fact_check' },
          { label: 'Chi phí', path: `/projects/${currentProject.id}/cost-plan`, icon: 'account_balance_wallet' },
          { label: 'Hồ sơ', path: `/projects/${currentProject.id}/documents`, icon: 'file_present' },
        ] : [
          { label: 'Tổng quan', path: '/dashboard', icon: 'analytics' },
          { label: 'Dự án', path: '/projects', icon: 'cell_tower' },
          { label: 'Công việc', path: '/my-tasks', icon: 'checklist' },
          { label: 'Chi phí VP', path: '/office-costs', icon: 'account_balance_wallet' },
        ]).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-0.5 px-2 rounded-lg transition-colors min-w-[48px] ${
                isActive ? 'text-primary font-bold' : 'text-slate-500 font-medium hover:text-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-[10px] leading-tight truncate max-w-[56px]">{item.label}</span>
          </NavLink>
        ))}

        {/* 5th Tab: Nút "Khác..." mở Bottom Sheet tất cả tính năng */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-lg transition-colors min-w-[48px] ${
            isMobileDrawerOpen ? 'text-primary font-bold' : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">apps</span>
          <span className="text-[10px] leading-tight truncate max-w-[56px]">Khác...</span>
        </button>
      </div>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  );
};
