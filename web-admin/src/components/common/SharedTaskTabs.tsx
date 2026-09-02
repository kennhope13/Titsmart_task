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
  const isAdmin = user?.role === 'admin' || user?.role === 'Qu?n tr? viên' || user?.role === 'pm';

  return (
    <div className="flex bg-slate-100 rounded-lg p-1 sm:ml-6 shrink-0">
      {isAdmin && (
        <>
          <button 
            onClick={() => {
              if (onTabChange) onTabChange('unassigned');
              else navigate('/task-assignment', { state: { tab: 'unassigned' }});
            }}
            className={px-4 py-1.5 text-sm font-bold rounded-md transition-all  + (activeTab === 'unassigned' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
          >
            C?n phân công
          </button>
          <button 
            onClick={() => {
              if (onTabChange) onTabChange('assigned');
              else navigate('/task-assignment', { state: { tab: 'assigned' }});
            }}
            className={px-4 py-1.5 text-sm font-bold rounded-md transition-all  + (activeTab === 'assigned' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700')}
          >
            Ðã nh?n / Ðang làm
          </button>
        </>
      )}
      <button
        onClick={() => {
           if (activeTab !== 'my-tasks') navigate('/my-tasks');
        }}
        className={px-4 py-1.5 text-sm font-bold rounded-md transition-all  + (activeTab === 'my-tasks' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
      >
        Công vi?c c?a tôi
      </button>
    </div>
  );
};
