import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../services/authStore';

export interface SharedTaskTabsProps {
  activeTab: 'unassigned' | 'assigned' | 'completed' | 'my-tasks';
  onTabChange?: (tab: 'unassigned' | 'assigned' | 'completed') => void;
}

export const SharedTaskTabs: React.FC<SharedTaskTabsProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  return (
    <div className="h-[34px] flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-2 sm:ml-4 shrink-0 overflow-x-auto custom-scrollbar no-drag-region electron-no-drag relative z-50" style={{ WebkitAppRegion: 'no-drag' } as any}>
      {isAdmin && (
        <>
          <button 
            type="button"
            onClick={() => {
              if (onTabChange) onTabChange('unassigned');
              else navigate('/task-assignment', { state: { tab: 'unassigned' }});
            }}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className={"h-[28px] px-2.5 sm:px-3 flex items-center justify-center text-xs font-medium rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'unassigned' ? 'bg-white shadow-xs text-primary font-semibold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
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
            className={"h-[28px] px-2.5 sm:px-3 flex items-center justify-center text-xs font-medium rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'assigned' ? 'bg-white shadow-xs text-amber-600 font-semibold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
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
            className={"h-[28px] px-2.5 sm:px-3 flex items-center justify-center text-xs font-medium rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'completed' ? 'bg-white shadow-xs text-emerald-600 font-semibold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
          >
            Đã hoàn thành
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => {
           if (activeTab !== 'my-tasks') navigate('/my-tasks');
        }}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className={"h-[28px] px-2.5 sm:px-3 flex items-center justify-center text-xs font-medium rounded-md transition-all whitespace-nowrap text-center cursor-pointer select-none active:scale-95 no-drag-region electron-no-drag " + (activeTab === 'my-tasks' ? 'bg-white shadow-xs text-primary font-semibold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')}
      >
        Công việc của tôi
      </button>
    </div>
  );
};