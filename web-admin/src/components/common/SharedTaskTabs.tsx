import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../services/authStore';

interface SharedTaskTabsProps {
  activeTab: 'unassigned' | 'assigned' | 'my-tasks';
  onTabChange?: (tab: 'unassigned' | 'assigned') => void;
}

export const SharedTaskTabs: React.FC<SharedTaskTabsProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  return (
    <div className="flex bg-slate-100 rounded-lg p-1 sm:ml-6 shrink-0 w-full sm:w-auto flex-1 overflow-x-auto custom-scrollbar">
      {isAdmin && (
        <>
          <button 
            onClick={() => {
              if (onTabChange) onTabChange('unassigned');
              else navigate('/task-assignment', { state: { tab: 'unassigned' }});
            }}
            className={"px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial text-center " + (activeTab === 'unassigned' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
          >
            Cần phân công
          </button>
          <button 
            onClick={() => {
              if (onTabChange) onTabChange('assigned');
              else navigate('/task-assignment', { state: { tab: 'assigned' }});
            }}
            className={"px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial text-center " + (activeTab === 'assigned' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700')}
          >
            Đã nhận / Đang làm
          </button>
        </>
      )}
      <button
        onClick={() => {
           if (activeTab !== 'my-tasks') navigate('/my-tasks');
        }}
        className={"px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial text-center " + (activeTab === 'my-tasks' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
      >
        Công việc của tôi
      </button>
    </div>
  );
};