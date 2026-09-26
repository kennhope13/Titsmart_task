import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SharedTaskTabs } from '../components/common/SharedTaskTabs';
import { CustomSelect } from '../components/common/CustomSelect';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { Task } from '../types';
import { TaskDiscussionModal } from '../components/tasks/TaskDiscussionModal';
import { appendTaskDiscussion, getLatestDiscussion } from '../utils/taskDiscussion';

export const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, projects, updateTask } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const [searchParams] = useSearchParams();

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [filterProjectCode, setFilterProjectCode] = useState('all');
  const [taskTab, setTaskTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [highlightKeyword, setHighlightKeyword] = useState<string | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);
  const [discussionTask, setDiscussionTask] = useState<Task | null>(null);
  const openedHighlightTaskRef = React.useRef<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'completed') setTaskTab('completed');
    else if (tabParam === 'in_progress') setTaskTab('in_progress');
    else if (tabParam === 'pending') setTaskTab('pending');
  }, [searchParams]);

  useEffect(() => {
    const tid = searchParams.get('taskId') || searchParams.get('id');
    const highlight = searchParams.get('highlight') || searchParams.get('search');
    if (tid) {
      setHighlightTaskId(tid);
      setIsHighlightActive(true);
      setFilterProjectCode('all');
      const found = tasks.find(t => t.id === tid);
      if (found?.status === 'Hoàn thành') {
        setTaskTab('completed');
      } else if (found?.status === 'Chờ nhận việc' || found?.status === 'Có thắc mắc') {
        setTaskTab('pending');
      } else if (found) {
        setTaskTab('in_progress');
      }
      if (openedHighlightTaskRef.current !== tid) {
        const shouldOpenDiscussion = searchParams.get('discuss') === 'true' || found?.status === 'Có thắc mắc';
        if (found && shouldOpenDiscussion) {
          openedHighlightTaskRef.current = tid;
          setDiscussionTask(found);
        }
      }
    }
    if (highlight) {
      setHighlightKeyword(highlight.toLowerCase().trim());
      setIsHighlightActive(true);
      setFilterProjectCode('all');
    }
  }, [searchParams, tasks]);

  const handleCloseDiscussion = () => {
    setDiscussionTask(null);
    if (searchParams.get('taskId') || searchParams.get('id') || searchParams.get('discuss')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('taskId');
      nextParams.delete('id');
      nextParams.delete('discuss');
      navigate({ search: nextParams.toString() }, { replace: true });
    }
  };

  useEffect(() => {
    if (discussionTask) {
      const updated = tasks.find(t => t.id === discussionTask.id);
      if (updated && (updated.notes !== discussionTask.notes || updated.status !== discussionTask.status || updated.issue !== discussionTask.issue)) {
        setDiscussionTask(updated);
      }
    }
  }, [tasks, discussionTask]);

  // Background polling for tasks
  useEffect(() => {
    useRealtimeStore.getState().fetchTasks(undefined);
    const interval = setInterval(() => {
      useRealtimeStore.getState().fetchTasks(undefined);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const allMyTasks = useMemo(() => {
    if (!user) return [];
    let filtered = tasks.filter(t => !t.isSectionHeader && 
      (t.assignedEngineerId === user.id || t.assignedEngineerName?.includes('|' + user.id) || t.assignedEngineerName?.includes(user.name))
    );
    
    if (filterProjectCode !== 'all') {
      filtered = filtered.filter(t => t.projectCode === filterProjectCode);
    }
    return filtered;
  }, [tasks, filterProjectCode, user]);

  const pendingCount = useMemo(() => {
    return allMyTasks.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc').length;
  }, [allMyTasks]);

  const inProgressCount = useMemo(() => {
    return allMyTasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Chờ nhận việc' && t.status !== 'Có thắc mắc').length;
  }, [allMyTasks]);

  const completedCount = useMemo(() => {
    return allMyTasks.filter(t => t.status === 'Hoàn thành').length;
  }, [allMyTasks]);

  const myTasks = useMemo(() => {
    let filtered = allMyTasks;
    if (taskTab === 'pending') {
      filtered = filtered.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc');
    } else if (taskTab === 'in_progress') {
      filtered = filtered.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Chờ nhận việc' && t.status !== 'Có thắc mắc');
    } else if (taskTab === 'completed') {
      filtered = filtered.filter(t => t.status === 'Hoàn thành');
    }

    // Sort by status: Có thắc mắc -> Chờ nhận việc -> Đang làm -> others
    return filtered.sort((a, b) => {
      if (highlightTaskId && a.id === highlightTaskId) return -1;
      if (highlightTaskId && b.id === highlightTaskId) return 1;
      const rank = (status: string) => {
        if (status === 'Có thắc mắc') return 0;
        if (status === 'Chờ nhận việc') return 1;
        if (status === 'Đang làm' || status === 'Chưa làm') return 2;
        if (status === 'Chờ nghiệm thu') return 3;
        return 4;
      };
      return rank(a.status || '') - rank(b.status || '');
    });
  }, [allMyTasks, taskTab, highlightTaskId]);

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
    const projectCodes = new Set(allMyTasks.map(t => t.projectCode));
    return projects.filter(p => projectCodes.has(p.code));
  }, [allMyTasks, projects]);

  const handleAcceptTask = async (task: any) => {
    updateTask(task.id, { status: 'Đang làm', progress: 0.05, constrStatus: 'Đang thi công' });
    triggerToast('Đã xác nhận nhận việc!', 'success');
    
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Một nhân sự';
    const userId = user?.id || '';
    store.logActivity(`Nhân sự ${userName} đã XÁC NHẬN NHẬN VIỆC hạng mục: "${task.name}"`, task.projectName || task.projectCode);
    
    if (store.addNotification) {
      await store.addNotification({
        title: 'Nhân sự đã nhận việc',
        message: `${userName} đã xác nhận nhận công việc "${task.name}" thuộc dự án ${task.projectCode}.`,
        link: `/projects/${encodeURIComponent(task.projectCode)}/tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_accepted:::${task.assignerId || 'admin'}:::${task.assignerName || 'Quản lý'}`,
        icon: 'check_circle',
        senderId: userId,
        senderName: userName
      });
    }
  };

  const handleSendQuestion = async (task: Task, questionText: string) => {
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Nhân sự';
    const userId = user?.id || '';
    const isCurrentlyDoing = task.status === 'Đang làm';
    const nextStatus = isCurrentlyDoing ? 'Đang làm' : 'Có thắc mắc';

    const updatedNotes = appendTaskDiscussion(task.notes || '', {
      senderId: userId,
      senderName: userName,
      senderRole: 'Nhân sự thực hiện',
      type: isCurrentlyDoing ? 'note' : 'question',
      content: questionText
    });

    updateTask(task.id, {
      status: nextStatus,
      notes: updatedNotes
    });

    triggerToast(isCurrentlyDoing ? 'Đã gửi tin nhắn trao đổi!' : 'Đã gửi thắc mắc đến người giao việc và nhân sự đảm nhiệm!', 'success');
    store.logActivity(`Nhân sự ${userName} đã ${isCurrentlyDoing ? 'GỬI TRAO ĐỔI' : 'GỬI THẮC MẮC'} về hạng mục: "${task.name}"`, task.projectName || task.projectCode);

    if (store.addNotification) {
      const parts = String(task.assignedEngineerName || '').split('|');
      const assignedIds = (parts.length > 1 ? parts[1] : (task.assignedEngineerId || '')).split(',').map(s => s.trim()).filter(Boolean);
      const assignedNames = (parts[0] || (task.assignedEngineerName || '')).split(',').map(s => s.trim()).filter(Boolean);

      const targetIdList = Array.from(new Set([task.assignerId || 'admin', ...assignedIds])).filter(Boolean);
      const targetNameList = Array.from(new Set([task.assignerName || 'Quản lý', ...assignedNames])).filter(Boolean);

      await store.addNotification({
        title: isCurrentlyDoing ? 'Trao đổi công việc' : 'Thắc mắc công việc',
        message: `${userName} đã gửi ${isCurrentlyDoing ? 'trao đổi' : 'thắc mắc'} về công việc "${task.name}" thuộc dự án ${task.projectCode}: "${questionText}".`,
        link: `/projects/${encodeURIComponent(task.projectCode)}/tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_question:::${targetIdList.join(',')}:::${targetNameList.join(',')}`,
        icon: isCurrentlyDoing ? 'chat' : 'help',
        senderId: userId,
        senderName: userName
      });
    }
  };

  const handleSendReply = async (task: Task, replyText: string) => {
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Người dùng';
    const userId = user?.id || '';
    const updatedNotes = appendTaskDiscussion(task.notes || '', {
      senderId: userId,
      senderName: userName,
      senderRole: 'Người dùng',
      type: 'reply',
      content: replyText
    });

    const nextStatus = (task.status === 'Đang làm' || task.status === 'Chờ nghiệm thu' || task.status === 'Hoàn thành')
      ? task.status
      : 'Chờ nhận việc';

    updateTask(task.id, {
      status: nextStatus,
      notes: updatedNotes
    });

    triggerToast('Đã gửi tin nhắn trao đổi!', 'success');
    store.logActivity(`Người dùng ${userName} đã PHẢN HỒI TRAO ĐỔI về hạng mục: "${task.name}"`, task.projectName || task.projectCode);

    if (store.addNotification && (task.assignedEngineerId || task.assignedEngineerName)) {
      const parts = String(task.assignedEngineerName || '').split('|');
      const assignedIds = (parts.length > 1 ? parts[1] : (task.assignedEngineerId || '')).split(',').map(s => s.trim()).filter(Boolean);
      const assignedNames = (parts[0] || (task.assignedEngineerName || '')).split(',').map(s => s.trim()).filter(Boolean);

      const targetIdList = Array.from(new Set([task.assignerId || 'admin', ...assignedIds])).filter(Boolean);
      const targetNameList = Array.from(new Set([task.assignerName || 'Quản lý', ...assignedNames])).filter(Boolean);

      await store.addNotification({
        title: 'Phản hồi trao đổi công việc',
        message: `${userName} đã phản hồi về công việc "${task.name}" [${task.projectCode}]: "${replyText}".`,
        link: `/projects/${encodeURIComponent(task.projectCode)}/tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_reply:::${targetIdList.join(',')}:::${targetNameList.join(',')}`,
        icon: 'chat',
        senderId: userId,
        senderName: userName
      });
    }
  };

  const handleReportDone = async (task: any) => {
    updateTask(task.id, { 
      status: 'Chờ nghiệm thu', 
      progress: 0.95, 
      constrStatus: 'Chờ nghiệm thu', 
      isDone: false 
    });
    triggerToast('Đã báo cáo hoàn thành! Đang chờ người giao việc nghiệm thu.', 'success');
    
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Một nhân sự';
    const userId = user?.id || '';
    store.logActivity(`Nhân sự ${userName} đã BÁO CÁO HOÀN THÀNH hạng mục: "${task.name}" (Chờ nghiệm thu)`, task.projectName || task.projectCode);
    
    if (store.addNotification) {
      await store.addNotification({
        title: 'Báo cáo hoàn thành công việc',
        message: `${userName} đã báo cáo hoàn thành công việc "${task.name}" thuộc dự án ${task.projectCode}.`,
        link: `/projects/${encodeURIComponent(task.projectCode)}/tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_completed:::${task.assignerId || 'admin'}:::${task.assignerName || 'Quản lý'}`,
        icon: 'done_all',
        senderId: userId,
        senderName: userName
      });
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="border-b border-slate-200 bg-white shadow-sm px-3 md:px-6 md:pr-20 py-2.5 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 md:gap-2 relative z-50 shrink-0 no-drag-region electron-no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 w-full md:w-auto min-w-0">
          <div className="flex items-center justify-between gap-2 shrink-0 h-7 sm:h-8 md:h-auto pr-12 md:pr-0">
            <h1 className="page-title text-sm md:text-base font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">
              CÔNG VIỆC
            </h1>
          </div>
          <SharedTaskTabs 
            activeTab="my-tasks" 
            myTasksSubTab={taskTab}
            onMyTasksSubTabChange={setTaskTab}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Sub-tabs: Chờ nhận việc / Đang thực hiện / Đã hoàn thành (cho Admin xem Việc của tôi) */}
          {isAdmin && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setTaskTab('pending')}
                className={`h-[30px] px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-bold rounded-md transition-all cursor-pointer select-none ${
                  taskTab === 'pending' 
                    ? 'bg-white text-amber-600 shadow-xs ring-1 ring-slate-200/80' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Chờ nhận việc</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${taskTab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                  {pendingCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTaskTab('in_progress')}
                className={`h-[30px] px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-bold rounded-md transition-all cursor-pointer select-none ${
                  taskTab === 'in_progress' 
                    ? 'bg-white text-primary shadow-xs ring-1 ring-slate-200/80' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Đang thực hiện</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${taskTab === 'in_progress' ? 'bg-blue-100 text-primary' : 'bg-slate-200 text-slate-700'}`}>
                  {inProgressCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTaskTab('completed')}
                className={`h-[30px] px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-bold rounded-md transition-all cursor-pointer select-none ${
                  taskTab === 'completed' 
                    ? 'bg-white text-emerald-600 shadow-xs ring-1 ring-slate-200/80' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Đã hoàn thành</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${taskTab === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                  {completedCount}
                </span>
              </button>
            </div>
          )}

          <CustomSelect 
            value={filterProjectCode} 
            onChange={(e) => setFilterProjectCode(e.target.value)}
            className="flex-1 md:w-[220px] h-[34px] text-xs font-bold text-slate-800"
          >
            <option value="all">-- Tất cả Dự án của tôi --</option>
            {myProjects.map(p => (
              <option key={p.id} value={p.code}>{p.name}</option>
            ))}
          </CustomSelect>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border-t border-slate-200">
        <div className="w-full h-full overflow-auto custom-scrollbar bg-white p-4 pb-16 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myTasks.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 font-medium bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-4xl text-slate-400">
                    {taskTab === 'completed' ? 'task_alt' : taskTab === 'pending' ? 'pending_actions' : 'assignment_late'}
                  </span>
                  <p className="text-sm font-bold text-slate-700">
                    {taskTab === 'completed' 
                      ? 'Chưa có công việc nào đã hoàn thành.' 
                      : taskTab === 'pending'
                      ? 'Chưa có công việc nào đang chờ nhận việc.'
                      : 'Bạn không có công việc nào đang thực hiện.'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {taskTab === 'completed'
                      ? 'Các công việc sau khi được người giao việc nghiệm thu sẽ xuất hiện tại đây.'
                      : taskTab === 'pending'
                      ? 'Khi được giao việc mới, danh sách công việc sẽ hiển thị tại đây để bạn xác nhận nhận việc.'
                      : 'Các công việc đang tiến hành sẽ hiển thị tại đây.'}
                  </p>
                </div>
              ) : (
                myTasks.map((t) => {
                  const p = projects.find(proj => proj.code === t.projectCode);
                  const isWaiting = t.status === 'Chờ nhận việc';
                  const hasQuestion = t.status === 'Có thắc mắc';
                  const isDoing = t.status === 'Đang làm' || t.status === 'Chưa làm';
                  const isWaitingApproval = t.status === 'Chờ nghiệm thu';
                  const isCompleted = t.status === 'Hoàn thành';
                  const isMatch = Boolean(
                    (highlightTaskId && t.id === highlightTaskId) ||
                    (highlightKeyword && (t.name || '').toLowerCase().includes(highlightKeyword))
                  );
                  const latestDiscussion = getLatestDiscussion(t.notes, t.issue);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setIsHighlightActive(false)}
                      className={`flex flex-col bg-white border rounded-xl shadow-xs overflow-hidden transition-all hover:shadow-md ${
                        isMatch
                          ? 'highlighted-task-card ring-2 ring-blue-500 ring-offset-2'
                          : hasQuestion ? 'border-orange-300 ring-1 ring-orange-200'
                          : isWaiting ? 'border-amber-300'
                          : isWaitingApproval ? 'border-purple-300'
                          : isCompleted ? 'border-emerald-300'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className={`px-4 py-2.5 border-b text-xs font-bold flex justify-between items-center ${
                        hasQuestion ? 'bg-orange-50 text-orange-950 border-orange-200'
                        : isWaiting ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : isWaitingApproval ? 'bg-purple-50 text-purple-900 border-purple-200'
                        : isCompleted ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className="truncate">{p ? p.name : t.projectCode}</span>
                        </div>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          hasQuestion ? 'bg-orange-500 text-white shadow-xs animate-pulse' :
                          isWaiting ? 'bg-white text-amber-800 border border-amber-300 shadow-2xs' :
                          isWaitingApproval ? 'bg-white text-purple-800 border border-purple-300 shadow-2xs' :
                          isCompleted ? 'bg-white text-emerald-800 border border-emerald-300 shadow-2xs' :
                          'bg-white text-blue-800 border border-blue-200 shadow-2xs'
                        }`}>
                          {t.status || 'Chưa làm'}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 text-sm mb-1">{t.name}</h3>
                        {t.sectionName && t.sectionName !== t.name && (
                          <p className="text-xs text-slate-500 mb-2">{t.sectionName}</p>
                        )}

                        <div className="my-2 space-y-1.5 text-xs text-slate-600 bg-slate-50/90 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-amber-600">person_add</span>
                              Người giao việc:
                            </span>
                            <span className="font-bold text-slate-800">{t.assignerName || 'Quản lý'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-blue-600">engineering</span>
                              Người nhận việc:
                            </span>
                            <span className="font-bold text-blue-700">{t.assignedEngineerName?.split('|')[0] || 'Chưa nhận'}</span>
                          </div>
                        </div>

                        {/* Snippet ghi chú / trao đổi mới nhất */}
                        {latestDiscussion && (
                          <div 
                            onClick={() => setDiscussionTask(t)}
                            className={`mb-2 p-2 rounded-lg cursor-pointer transition-colors border ${
                              latestDiscussion.type === 'question'
                                ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-950'
                                : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200/60 text-blue-900'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold mb-0.5">
                              <span className="flex items-center gap-1">
                                <span className={`material-symbols-outlined text-[13px] ${latestDiscussion.type === 'question' ? 'text-orange-600' : 'text-blue-600'}`}>
                                  {latestDiscussion.type === 'question' ? 'help_center' : latestDiscussion.type === 'assign_note' ? 'assignment' : 'chat'}
                                </span>
                                {latestDiscussion.type === 'assign_note' ? 'Ghi chú giao việc' : latestDiscussion.type === 'question' ? 'Thắc mắc' : 'Phản hồi người giao'}
                              </span>
                              <span className="text-[10px] text-blue-600 font-semibold underline">Xem trao đổi</span>
                            </div>
                            <p className="text-xs font-medium line-clamp-2 italic">
                              "{latestDiscussion.content}"
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-between text-xs font-medium text-slate-600 border-t border-slate-100 gap-2 flex-wrap">
                          <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold text-slate-700 border border-slate-200/60 shrink-0">KL: {t.volume} {t.unit}</span>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {(isWaiting || hasQuestion) && (
                              <>
                                <button 
                                  onClick={() => setDiscussionTask(t)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-700 font-bold rounded-lg shadow-2xs transition-all active:scale-95"
                                  title="Gửi thắc mắc hoặc yêu cầu làm rõ cho người giao việc"
                                >
                                  <span className="material-symbols-outlined text-[14px]">help</span>
                                  Thắc mắc
                                </button>
                                <button 
                                  onClick={() => handleAcceptTask(t)} 
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg shadow-sm transition-all"
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                  Nhận việc
                                </button>
                              </>
                            )}
                            {isDoing && (
                              <>
                                <button 
                                  onClick={() => setDiscussionTask(t)}
                                  className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg shadow-2xs transition-all text-[11px]"
                                  title="Xem trao đổi / ghi chú"
                                >
                                  <span className="material-symbols-outlined text-[14px]">chat</span>
                                  Trao đổi
                                </button>
                                <button 
                                  onClick={() => handleReportDone(t)} 
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-lg shadow-sm transition-all"
                                >
                                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                                  Báo cáo hoàn thành
                                </button>
                              </>
                            )}
                            {isWaitingApproval && (
                              <span className="text-purple-700 font-bold flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                                <span className="material-symbols-outlined text-[16px] animate-pulse">hourglass_top</span>
                                Chờ nghiệm thu
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                Đã nghiệm thu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
          </div>
        </div>
      </div>

      {/* Discussion Modal */}
      {discussionTask && (
        <TaskDiscussionModal
          isOpen={Boolean(discussionTask)}
          onClose={handleCloseDiscussion}
          task={tasks.find(t => t.id === discussionTask.id) || discussionTask}
          currentUserId={user?.id}
          currentUserName={user?.name || user?.username}
          currentUserRole={user?.role}
          isAssigner={Boolean(
            discussionTask.assignerId === user?.id || 
            (discussionTask.assignerName && user?.name && discussionTask.assignerName.toLowerCase().includes(user.name.toLowerCase()))
          )}
          isAssignee={Boolean(
            discussionTask.assignedEngineerId === user?.id || 
            (discussionTask.assignedEngineerName && (
              discussionTask.assignedEngineerName.includes('|' + (user?.id || '')) ||
              (user?.name && discussionTask.assignedEngineerName.toLowerCase().includes(user.name.toLowerCase()))
            ))
          )}
          onAcceptTask={handleAcceptTask}
          onSendQuestion={handleSendQuestion}
          onSendReply={handleSendReply}
        />
      )}

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

