import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../services/authStore';

export interface SharedTaskTabsProps {
  activeTab: 'unassigned' | 'assigned' | 'completed' | 'my-tasks' | 'my-tasks-completed';
  onTabChange?: (tab: 'unassigned' | 'assigned' | 'completed' | 'my-tasks') => void;
  myTasksSubTab?: 'pending' | 'in_progress' | 'completed';
  onMyTasksSubTabChange?: (subTab: 'pending' | 'in_progress' | 'completed') => void;
}

export const SharedTaskTabs: React.FC<SharedTaskTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  myTasksSubTab = 'pending', 
  onMyTasksSubTabChange 
}) => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  if (!isAdmin) {
    return (
      <div 
        className="h-[34px] sm:h-[36px] flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 gap-0.5 sm:gap-1" 
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button 
          type="button"
          onClick={() => {
            if (onMyTasksSubTabChange) onMyTasksSubTabChange('pending');
            else navigate('/my-tasks?tab=pending');
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (myTasksSubTab === 'pending' ? 'bg-white shadow-xs text-amber-600 font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
        >
          Chờ nhận việc
        </button>
        <button 
          type="button"
          onClick={() => {
            if (onMyTasksSubTabChange) onMyTasksSubTabChange('in_progress');
            else navigate('/my-tasks?tab=in_progress');
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (myTasksSubTab === 'in_progress' ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
        >
          Đang thực hiện
        </button>
        <button 
          type="button"
          onClick={() => {
            if (onMyTasksSubTabChange) onMyTasksSubTabChange('completed');
            else navigate('/my-tasks?tab=completed');
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className={"h-[28px] sm:h-[30px] px-2.5 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (myTasksSubTab === 'completed' ? 'bg-white shadow-xs text-emerald-600 font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
        >
          Đã hoàn thành
        </button>
      </div>
    );
  }

  return (
    <div 
      className="h-[34px] sm:h-[36px] w-full sm:w-auto grid grid-cols-4 sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 gap-0.5 sm:gap-1" 
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      <button 
        type="button"
        onClick={() => {
          if (onTabChange) onTabChange('unassigned');
          else navigate('/task-assignment', { state: { tab: 'unassigned' }});
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-1 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'unassigned' ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        Cần phân công
      </button>
      <button 
        type="button"
        onClick={() => {
          if (onTabChange) onTabChange('assigned');
          else navigate('/task-assignment', { state: { tab: 'assigned' }});
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-1 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'assigned' ? 'bg-white shadow-xs text-amber-600 font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        Đang thực hiện
      </button>
      <button 
        type="button"
        onClick={() => {
          if (onTabChange) onTabChange('completed');
          else navigate('/task-assignment', { state: { tab: 'completed' }});
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-1 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'completed' ? 'bg-white shadow-xs text-emerald-600 font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        Đã hoàn thành
      </button>
      <button
        type="button"
        onClick={() => {
           if (activeTab !== 'my-tasks') navigate('/my-tasks');
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] sm:h-[30px] px-1 sm:px-3 flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'my-tasks' ? 'bg-white shadow-xs text-primary font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        <span className="hidden xs:inline">Công việc của tôi</span>
        <span className="xs:hidden">Việc của tôi</span>
      </button>
    </div>
  );
};