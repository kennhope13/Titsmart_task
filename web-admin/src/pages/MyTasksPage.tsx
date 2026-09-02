import React, { useState, useMemo } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';

export const MyTasksPage: React.FC = () => {
  const { tasks, projects, updateTask } = useRealtimeStore();
  const user = useAuthStore(state => state.user);

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [filterProjectCode, setFilterProjectCode] = useState('all');

  const myTasks = useMemo(() => {
    if (!user) return [];
    let filtered = tasks.filter(t => !t.isSectionHeader && 
      (t.assignedEngineerId === user.id || t.assignedEngineerName?.includes('|' + user.id) || t.assignedEngineerName?.includes(user.name))
    );
    
    if (filterProjectCode !== 'all') {
      filtered = filtered.filter(t => t.projectCode === filterProjectCode);
    }
    // Sort by status: Chờ nhận việc -> Đang làm -> others
    return filtered.sort((a, b) => {
      const rank = (status: string) => {
        if (status === 'Chờ nhận việc') return 1;
        if (status === 'Đang làm' || status === 'Chưa làm') return 2;
        if (status === 'Chờ nghiệm thu') return 3;
        return 4;
      };
      return rank(a.status || '') - rank(b.status || '');
    });
  }, [tasks, filterProjectCode, user]);

  const myProjects = useMemo(() => {
    const projectCodes = new Set(myTasks.map(t => t.projectCode));
    return projects.filter(p => projectCodes.has(p.code));
  }, [myTasks, projects]);

  const handleAcceptTask = async (task: any) => {
    updateTask(task.id, { status: 'Đang làm', progress: 0.05, constrStatus: 'Đang thi công' });
    triggerToast('Đã xác nhận nhận việc!', 'success');
    
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Một nhân sự';
    store.logActivity(`Nhân sự ${userName} đã XÁC NHẬN NHẬN VIỆC hạng mục: "${task.name}"`, task.projectName || task.projectCode);
    
    if (store.addNotification) {
      await store.addNotification({
        title: 'Nhân sự đã nhận việc',
        message: `${userName} đã xác nhận nhận công việc "${task.name}" thuộc dự án ${task.projectCode}.`,
        type: 'task_assigned',
        icon: 'check_circle'
      });
    }
  };

  const handleReportDone = async (task: any) => {
    updateTask(task.id, { status: 'Chờ nghiệm thu', progress: 1, constrStatus: 'Đã hoàn thành' });
    triggerToast('Đã báo cáo hoàn thành!', 'success');
    
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Một nhân sự';
    store.logActivity(`Nhân sự ${userName} đã BÁO CÁO XONG hạng mục: "${task.name}"`, task.projectName || task.projectCode);
    
    if (store.addNotification) {
      await store.addNotification({
        title: 'Báo cáo hoàn thành công việc',
        message: `${userName} đã báo cáo xong công việc "${task.name}" thuộc dự án ${task.projectCode}.`,
        type: 'system',
        icon: 'done_all'
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 pl-3 pr-24 py-4 md:py-3 lg:py-0 lg:min-h-[3rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0 shadow-sm flex-wrap">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 flex-wrap">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">
            CÔNG VIỆC
          </h1>
          <SharedTaskTabs activeTab="my-tasks" />
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={filterProjectCode} 
            onChange={(e) => setFilterProjectCode(e.target.value)}
            className="border border-slate-300 rounded px-3 h-[36px] text-sm bg-white focus:outline-none focus:border-primary font-medium cursor-pointer"
          >
            <option value="all">-- Tất cả Dự án của tôi --</option>
            {myProjects.map(p => (
              <option key={p.id} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border-t border-slate-200">
        <div className="w-full h-full overflow-auto custom-scrollbar bg-white p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myTasks.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-medium italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  Bạn chưa được phân công hạng mục công việc nào.
                </div>
              ) : (
                myTasks.map((t) => {
                  const p = projects.find(proj => proj.code === t.projectCode);
                  const isWaiting = t.status === 'Chờ nhận việc';
                  const isDoing = t.status === 'Đang làm' || t.status === 'Chưa làm';
                  const isDone = t.status === 'Chờ nghiệm thu' || t.status === 'Hoàn thành';
                  
                  return (
                    <div key={t.id} className={`flex flex-col bg-white border rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${isWaiting ? 'border-amber-300 ring-1 ring-amber-100' : isDone ? 'border-emerald-200 opacity-70' : 'border-slate-200'}`}>
                      <div className={`px-4 py-2 border-b text-xs font-bold flex justify-between items-center ${isWaiting ? 'bg-amber-50 text-amber-800 border-amber-100' : isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-blue-50 text-blue-800 border-blue-100'}`}>
                        <span className="truncate pr-2">{p ? p.name : t.projectCode}</span>
                        <span className="shrink-0 px-2 py-0.5 bg-white/60 rounded-full">{t.status || 'Chưa làm'}</span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 text-sm mb-1">{t.name}</h3>
                        {t.sectionName && t.sectionName !== t.name && (
                          <p className="text-xs text-slate-500 mb-3">{t.sectionName}</p>
                        )}
                        <div className="mt-auto pt-4 flex items-center justify-between text-xs font-medium text-slate-600">
                          <span className="bg-slate-100 px-2 py-1 rounded">KL: {t.volume} {t.unit}</span>
                          
                          {isWaiting && (
                            <button onClick={() => handleAcceptTask(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Nhận việc
                            </button>
                          )}
                          {isDoing && (
                            <button onClick={() => handleReportDone(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors">
                              <span className="material-symbols-outlined text-[14px]">done_all</span>
                              Báo cáo xong
                            </button>
                          )}
                          {isDone && (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">verified</span>
                              Đã xử lý
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
          </div>
        </div>
      </div>

      {toastState.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-white font-medium ${
            toastState.type === 'success' ? 'bg-emerald-600' :
            toastState.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
          }`}>
            <span className="material-symbols-outlined">
              {toastState.type === 'success' ? 'check_circle' : toastState.type === 'warning' ? 'warning' : 'info'}
            </span>
            {toastState.message}
          </div>
        </div>
      )}
    </div>
  );
};
