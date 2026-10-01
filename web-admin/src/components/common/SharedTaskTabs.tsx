import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../services/authStore';

export interface SharedTaskTabsProps {
  activeTab: 'project_tasks' | 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks' | 'my-tasks-completed';
  onTabChange?: (tab: 'project_tasks' | 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks') => void;
  myTasksSubTab?: 'pending' | 'in_progress' | 'completed';
  onMyTasksSubTabChange?: (subTab: 'pending' | 'in_progress' | 'completed') => void;
  category?: 'project' | 'direct';
  onCategoryChange?: (category: 'project' | 'direct') => void;
}

export const SharedTaskTabs: React.FC<SharedTaskTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  myTasksSubTab = 'pending', 
  onMyTasksSubTabChange,
  category = 'project',
  onCategoryChange
}) => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  if (!isAdmin) {
    const isDirect = category === 'direct' || activeTab === 'direct';
    const isProject = !isDirect;

    return (
      <div 
        className="h-[34px] sm:h-[36px] flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 gap-0.5 sm:gap-1" 
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button 
          type="button"
          onClick={() => {
            if (onCategoryChange) onCategoryChange('project');
            else if (onTabChange) onTabChange('project_tasks');
            else navigate('/my-tasks?category=project');
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3.5 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (isProject ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
        >
          Dự án
        </button>
        <button 
          type="button"
          onClick={() => {
            if (onCategoryChange) onCategoryChange('direct');
            else if (onTabChange) onTabChange('direct');
            else navigate('/my-tasks?category=direct');
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3.5 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (isDirect ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
        >
          Phát sinh
        </button>
      </div>
    );
  }

  const isProjectTab = activeTab === 'project_tasks' || activeTab === 'unassigned' || activeTab === 'assigned' || activeTab === 'completed';
  const isDirectTab = activeTab === 'direct';
  const isMyTasksTab = activeTab === 'my-tasks' || activeTab === 'my-tasks-completed';

  return (
    <div 
      className="h-[34px] sm:h-[36px] w-full sm:w-auto flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 gap-0.5 sm:gap-1" 
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      <button 
        type="button"
        onClick={() => {
          if (onTabChange) onTabChange('project_tasks');
          else navigate('/task-assignment', { state: { tab: 'project_tasks' }});
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3.5 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (isProjectTab ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        Dự án
      </button>
      <button 
        type="button"
        onClick={() => {
          if (onTabChange) onTabChange('direct');
          else navigate('/task-assignment', { state: { tab: 'direct' }});
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3.5 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (isDirectTab ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        Phát sinh
      </button>
      <button
        type="button"
        onClick={() => {
           if (activeTab !== 'my-tasks') navigate('/my-tasks');
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3.5 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (isMyTasksTab ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        <span className="hidden xs:inline">Công việc của tôi</span>
        <span className="xs:hidden">Việc của tôi</span>
      </button>
    </div>
  );
};