import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SharedTaskTabs } from '../components/common/SharedTaskTabs';
import { CustomSelect } from '../components/common/CustomSelect';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';

export const MyTasksPage: React.FC = () => {
  const { tasks, projects, updateTask } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const [searchParams] = useSearchParams();

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [filterProjectCode, setFilterProjectCode] = useState('all');
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [highlightKeyword, setHighlightKeyword] = useState<string | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);

  useEffect(() => {
    const tid = searchParams.get('taskId') || searchParams.get('id');
    const highlight = searchParams.get('highlight') || searchParams.get('search');
    if (tid) {
      setHighlightTaskId(tid);
      setIsHighlightActive(true);
      setFilterProjectCode('all');
    }
    if (highlight) {
      setHighlightKeyword(highlight.toLowerCase().trim());
      setIsHighlightActive(true);
      setFilterProjectCode('all');
    }
  }, [searchParams]);

  // Background polling for tasks
  useEffect(() => {
    useRealtimeStore.getState().fetchTasks(undefined);
    const interval = setInterval(() => {
      useRealtimeStore.getState().fetchTasks(undefined);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      if (highlightTaskId && a.id === highlightTaskId) return -1;
      if (highlightTaskId && b.id === highlightTaskId) return 1;
      const rank = (status: string) => {
        if (status === 'Chờ nhận việc') return 1;
        if (status === 'Đang làm' || status === 'Chưa làm') return 2;
        if (status === 'Chờ nghiệm thu') return 3;
        return 4;
      };
      return rank(a.status || '') - rank(b.status || '');
    });
  }, [tasks, filterProjectCode, user, highlightTaskId]);

  useEffect(() => {
    if (isHighlightActive && (highlightTaskId || highlightKeyword)) {
      const timer = setTimeout(() => {
        const elem = document.querySelector('.highlighted-task-card');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
      const fadeTimer = setTimeout(() => setIsHighlightActive(false), 9000);
      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [isHighlightActive, highlightTaskId, highlightKeyword, myTasks]);

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
        link: `/task-assignment?tab=assigned&taskId=${task.id}`,
        type: `task_accepted:::${task.assignerId || 'admin'}:::${task.assignerName || 'Quản lý'}`,
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
        link: `/task-assignment?tab=assigned&taskId=${task.id}`,
        type: `task_completed:::${task.assignerId || 'admin'}:::${task.assignerName || 'Quản lý'}`,
        icon: 'done_all'
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="border-b border-slate-200 bg-white shadow-sm px-2 sm:px-4 md:px-6 py-2 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 relative z-50 shrink-0 no-drag-region electron-no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-1.5 sm:gap-3 w-full md:w-auto min-w-0 overflow-hidden">
          <h1 className="page-title text-sm sm:text-base md:text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-1.5 sm:pl-2 uppercase shrink-0 hidden sm:block">
            CÔNG VIỆC
          </h1>
          <SharedTaskTabs activeTab="my-tasks" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <CustomSelect 
            value={filterProjectCode} 
            onChange={(e) => setFilterProjectCode(e.target.value)}
            className="flex-1 md:w-[240px] h-[34px] text-xs font-bold text-slate-800"
          >
            <option value="all">-- Tất cả Dự án của tôi --</option>
            {myProjects.map(p => (
              <option key={p.id} value={p.code}>{p.name}</option>
            ))}
          </CustomSelect>
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
                  const isMatch = Boolean(
                    (highlightTaskId && t.id === highlightTaskId) ||
                    (highlightKeyword && (t.name || '').toLowerCase().includes(highlightKeyword))
                  );
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setIsHighlightActive(false)}
                      className={`flex flex-col bg-white border rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
                        isMatch
                          ? 'highlighted-task-card ring-2 ring-amber-400/80 bg-amber-100/50 border-amber-400 shadow-sm'
                          : isWaiting ? 'border-amber-300 ring-1 ring-amber-100' : isDone ? 'border-emerald-200 opacity-70' : 'border-slate-200'
                      }`}
                    >
                      <div className={`px-4 py-2 border-b text-xs font-bold flex justify-between items-center ${isMatch ? 'bg-amber-100/80 text-amber-900 border-amber-300' : isWaiting ? 'bg-amber-50 text-amber-800 border-amber-100' : isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-blue-50 text-blue-800 border-blue-100'}`}>
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

