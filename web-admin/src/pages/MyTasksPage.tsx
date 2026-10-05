import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SharedTaskTabs } from '../components/common/SharedTaskTabs';
import { CustomSelect } from '../components/common/CustomSelect';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { Task } from '../types';
import { TaskDiscussionModal } from '../components/tasks/TaskDiscussionModal';
import { appendTaskDiscussion, getLatestDiscussion } from '../utils/taskDiscussion';
import { isUserTaskAssignee, isUserTaskAssigner, isUserTaskFollower, getTaskFollowerNames } from '../utils/taskPermission';

export const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, projects, engineers, updateTask } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const [searchParams] = useSearchParams();

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [category, setCategory] = useState<'project' | 'direct'>(() => {
    const cat = searchParams.get('category');
    return cat === 'direct' ? 'direct' : 'project';
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'review' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProjectCode, setFilterProjectCode] = useState('all');

  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [highlightKeyword, setHighlightKeyword] = useState<string | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);
  const [discussionTask, setDiscussionTask] = useState<Task | null>(null);
  const openedHighlightTaskRef = React.useRef<string | null>(null);

  useEffect(() => {
    const catParam = searchParams.get('category');
    if (catParam === 'direct' || catParam === 'project') {
      setCategory(catParam);
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'completed') setStatusFilter('completed');
    else if (tabParam === 'in_progress') setStatusFilter('in_progress');
    else if (tabParam === 'pending') setStatusFilter('pending');
    else if (tabParam === 'review') setStatusFilter('review');
    else if (tabParam === 'overdue') setStatusFilter('overdue');
  }, [searchParams]);

  useEffect(() => {
    const tid = searchParams.get('taskId') || searchParams.get('id');
    const highlight = searchParams.get('highlight') || searchParams.get('search');
    if (tid) {
      setHighlightTaskId(tid);
      setIsHighlightActive(true);
      setFilterProjectCode('all');
      const found = tasks.find(t => t.id === tid);
      if (found) {
        const isDirect = found.sectionName === 'Giao việc trực tiếp' || found.projectCode === 'COMPANY' || found.code?.startsWith('TASK-DIRECT');
        setCategory(isDirect ? 'direct' : 'project');

        if (found.status === 'Hoàn thành') {
          setStatusFilter('completed');
        } else if (found.status === 'Chờ nhận việc' || found.status === 'Có thắc mắc') {
          setStatusFilter('pending');
        } else if (found.status === 'Chờ nghiệm thu') {
          setStatusFilter('review');
        } else {
          setStatusFilter('in_progress');
        }
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

  // Initial fetch for tasks (live sync is handled by Supabase Realtime)
  useEffect(() => {
    useRealtimeStore.getState().fetchTasks(undefined);
  }, []);

  const allMyTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(t => !t.isSectionHeader && (
      isUserTaskAssignee(user, t, engineers) ||
      isUserTaskFollower(user, t, engineers)
    ));
  }, [tasks, user, engineers]);

  // Filter tasks strictly by category (Dự án vs Phát sinh)
  const myCategoryTasks = useMemo(() => {
    return allMyTasks.filter(t => {
      const isDirect = t.sectionName === 'Giao việc trực tiếp' || t.projectCode === 'COMPANY' || t.code?.startsWith('TASK-DIRECT');
      return category === 'direct' ? isDirect : !isDirect;
    });
  }, [allMyTasks, category]);

  // Status counts for the current category
  const stats = useMemo(() => {
    let all = myCategoryTasks.length;
    let pending = 0;
    let inProgress = 0;
    let review = 0;
    let completed = 0;
    let overdue = 0;

    const now = new Date();
    myCategoryTasks.forEach(t => {
      if (t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc') {
        pending++;
      } else if (t.status === 'Chờ nghiệm thu') {
        review++;
      } else if (t.status === 'Hoàn thành') {
        completed++;
      } else {
        inProgress++;
      }

      if (t.status !== 'Hoàn thành' && t.dueDate) {
        const d = new Date(t.dueDate);
        if (!isNaN(d.getTime()) && d < now) {
          overdue++;
        }
      }
    });

    return { all, pending, inProgress, review, completed, overdue };
  }, [myCategoryTasks]);

  // Filtered tasks for display
  const displayedTasks = useMemo(() => {
    let list = myCategoryTasks;

    // Project filter
    if (filterProjectCode !== 'all') {
      list = list.filter(t => t.projectCode === filterProjectCode);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.name || '').toLowerCase().includes(q) ||
        (t.sectionName || '').toLowerCase().includes(q) ||
        (t.projectCode || '').toLowerCase().includes(q) ||
        (t.assignerName || '').toLowerCase().includes(q) ||
        (t.assignedEngineerName || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    const now = new Date();
    if (statusFilter === 'pending') {
      list = list.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc');
    } else if (statusFilter === 'in_progress') {
      list = list.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Chờ nhận việc' && t.status !== 'Có thắc mắc' && t.status !== 'Chờ nghiệm thu');
    } else if (statusFilter === 'review') {
      list = list.filter(t => t.status === 'Chờ nghiệm thu');
    } else if (statusFilter === 'completed') {
      list = list.filter(t => t.status === 'Hoàn thành');
    } else if (statusFilter === 'overdue') {
      list = list.filter(t => t.status !== 'Hoàn thành' && t.dueDate && new Date(t.dueDate) < now);
    }

    // Sort: highlight task first -> Có thắc mắc -> Chờ nhận việc -> Chờ nghiệm thu -> Đang làm -> Hoàn thành
    return list.sort((a, b) => {
      if (highlightTaskId && a.id === highlightTaskId) return -1;
      if (highlightTaskId && b.id === highlightTaskId) return 1;
      const rank = (status: string) => {
        if (status === 'Có thắc mắc') return 0;
        if (status === 'Chờ nhận việc') return 1;
        if (status === 'Chờ nghiệm thu') return 2;
        if (status === 'Đang làm' || status === 'Chưa làm') return 3;
        if (status === 'Hoàn thành') return 5;
        return 4;
      };
      return rank(a.status || '') - rank(b.status || '');
    });
  }, [myCategoryTasks, filterProjectCode, searchQuery, statusFilter, highlightTaskId]);

  // Group displayed tasks by project
  const tasksByProject = useMemo(() => {
    const groups: { projectCode: string; projectName: string; tasks: typeof displayedTasks }[] = [];
    const map = new Map<string, { projectCode: string; projectName: string; tasks: typeof displayedTasks }>();

    displayedTasks.forEach(t => {
      const pCode = t.projectCode || 'COMPANY';
      if (!map.has(pCode)) {
        const proj = projects.find(p => p.code === pCode || p.id === pCode);
        const group = {
          projectCode: pCode,
          projectName: category === 'direct' && pCode === 'COMPANY' 
            ? 'Nội bộ Công ty / Giao việc trực tiếp' 
            : (proj?.name || t.projectName || pCode),
          tasks: []
        };
        map.set(pCode, group);
        groups.push(group);
      }
      map.get(pCode)!.tasks.push(t);
    });

    return groups;
  }, [displayedTasks, projects, category]);

  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const toggleProjectCollapse = (pCode: string) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [pCode]: !prev[pCode]
    }));
  };

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
  }, [isHighlightActive, highlightTaskId, highlightKeyword, displayedTasks]);

  const myProjects = useMemo(() => {
    const projectCodes = new Set(myCategoryTasks.map(t => t.projectCode));
    return projects.filter(p => projectCodes.has(p.code));
  }, [myCategoryTasks, projects]);

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

  const handleSendQuestion = async (task: Task, questionText: string, fileAttachment?: { url: string; type: 'image' | 'file'; name: string }) => {
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
      content: questionText,
      fileUrl: fileAttachment?.url,
      fileType: fileAttachment?.type,
      fileName: fileAttachment?.name
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
        message: `${userName} đã gửi ${isCurrentlyDoing ? 'trao đổi' : 'thắc mắc'} về công việc "${task.name}" thuộc dự án ${task.projectCode}: "${questionText || (fileAttachment ? (fileAttachment.type === 'image' ? 'Đã gửi 1 hình ảnh' : `Đã đính kèm tệp: ${fileAttachment.name}`) : '')}".`,
        link: `/projects/${encodeURIComponent(task.projectCode)}/tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_question:::${targetIdList.join(',')}:::${targetNameList.join(',')}`,
        icon: isCurrentlyDoing ? 'chat' : 'help',
        senderId: userId,
        senderName: userName
      });
    }
  };

  const handleSendReply = async (task: Task, replyText: string, fileAttachment?: { url: string; type: 'image' | 'file'; name: string }) => {
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Thành viên';
    const userId = user?.id || '';

    const isAssigner = Boolean(
      task.assignerId === userId || 
      user?.role === 'admin' || 
      user?.username === 'admin' ||
      (task.assignerName && user?.name && task.assignerName.toLowerCase().includes(user.name.toLowerCase()))
    );
    const isAssignee = Boolean(
      task.assignedEngineerId === userId || 
      (task.assignedEngineerName && (
        task.assignedEngineerName.includes('|' + userId) ||
        (user?.name && task.assignedEngineerName.toLowerCase().includes(user.name.toLowerCase()))
      ))
    );
    const isFollower = (task.followerIds && task.followerIds.includes(userId)) || (!isAssigner && !isAssignee);
    const senderRole = isFollower ? 'Người theo dõi' : (isAssigner ? 'Người giao việc' : 'Người nhận việc');

    const updatedNotes = appendTaskDiscussion(task.notes || '', {
      senderId: userId,
      senderName: userName,
      senderRole: senderRole,
      type: isFollower ? 'note' : (isAssigner ? 'reply' : 'note'),
      content: replyText,
      fileUrl: fileAttachment?.url,
      fileType: fileAttachment?.type,
      fileName: fileAttachment?.name
    });

    const nextStatus = (task.status === 'Đang làm' || task.status === 'Chờ nghiệm thu' || task.status === 'Hoàn thành')
      ? task.status
      : (isAssigner ? 'Chờ nhận việc' : task.status);

    updateTask(task.id, {
      status: nextStatus,
      notes: updatedNotes
    });

    triggerToast(isFollower ? 'Đã gửi trao đổi (Người theo dõi)!' : 'Đã gửi phản hồi trao đổi!', 'success');
    store.logActivity(`${senderRole} ${userName} đã TRAO ĐỔI về hạng mục: "${task.name}"`, task.projectName || task.projectCode);

    if (store.addNotification) {
      const parts = String(task.assignedEngineerName || '').split('|');
      const assignedIds = (parts.length > 1 ? parts[1] : (task.assignedEngineerId || '')).split(',').map(s => s.trim()).filter(Boolean);
      const assignedNames = (parts[0] || (task.assignedEngineerName || '')).split(',').map(s => s.trim()).filter(Boolean);

      const followerIds = task.followerIds || [];
      const followerNames = task.followerNames || [];

      const targetIdList = Array.from(new Set([
        task.assignerId || 'admin', 
        ...assignedIds, 
        ...followerIds
      ])).filter(id => id && id !== userId);

      const targetNameList = Array.from(new Set([
        task.assignerName || 'Quản lý', 
        ...assignedNames, 
        ...followerNames
      ])).filter(Boolean);

      if (targetIdList.length > 0) {
        await store.addNotification({
          title: `Trao đổi công việc: ${task.name}`,
          message: `${senderRole} ${userName} đã trao đổi về công việc "${task.name}" [${task.projectCode}]: "${replyText || (fileAttachment ? (fileAttachment.type === 'image' ? 'Đã gửi 1 hình ảnh' : `Đã đính kèm tệp: ${fileAttachment.name}`) : '')}".`,
          link: `/my-tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
          type: `task_reply:::${targetIdList.join(',')}:::${targetNameList.join(',')}`,
          icon: 'forum',
          senderId: userId,
          senderName: userName
        });
      }
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

  const handleApproveTask = async (task: any) => {
    if (!isUserTaskAssigner(user, task, engineers)) {
      triggerToast('Chỉ người giao việc mới có quyền nghiệm thu!', 'warning');
      return;
    }
    updateTask(task.id, { 
      status: 'Hoàn thành', 
      progress: 1, 
      constrStatus: 'Đã hoàn thành', 
      isDone: true 
    });
    triggerToast(`Đã nghiệm thu hoàn thành: "${task.name}"!`, 'success');

    const store = useRealtimeStore.getState();
    const adminName = user?.name || user?.username || 'Quản lý';
    const adminId = user?.id || '';
    store.logActivity(`Người giao việc ${adminName} đã NGHIỆM THU HOÀN THÀNH công việc: "${task.name}"`, task.projectName || task.projectCode);

    if (store.addNotification && (task.assignedEngineerId || task.assignedEngineerName)) {
      const engId = task.assignedEngineerId || '';
      const engName = task.assignedEngineerName?.split('|')[0] || '';
      await store.addNotification({
        title: 'Công việc đã được nghiệm thu',
        message: `${adminName} đã nghiệm thu hoàn thành công việc "${task.name}" [${task.projectCode}].`,
        link: `/my-tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_approved:::${engId}:::${engName}`,
        icon: 'verified',
        senderId: adminId,
        senderName: adminName
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-slate-200 bg-white shadow-xs px-3 md:px-6 md:pr-20 py-2.5 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 md:gap-2 relative z-50 shrink-0 no-drag-region electron-no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 w-full md:w-auto min-w-0">
          <div className="flex items-center justify-between gap-2 shrink-0 h-7 sm:h-8 md:h-auto pr-12 md:pr-0">
            <h1 className="page-title text-sm md:text-base font-extrabold text-slate-900 border-l-4 border-primary pl-2 shrink-0">
              Công việc
            </h1>
          </div>
          <SharedTaskTabs 
            activeTab="my-tasks"
            category={category}
            onCategoryChange={(newCat) => {
              setCategory(newCat);
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set('category', newCat);
              navigate({ search: nextParams.toString() }, { replace: true });
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Search box */}
          <div className="relative w-full sm:w-60 md:w-72 lg:w-80 shrink-0">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Tìm công việc, người giao..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium h-[34px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          {/* Project CustomSelect with Search */}
          {category === 'project' && (
            <CustomSelect 
              value={filterProjectCode} 
              onChange={(e) => setFilterProjectCode(e.target.value)}
              searchable={true}
              placeholder="-- Tất cả dự án --"
              className="flex-1 md:w-[220px] h-[34px] text-xs font-bold text-slate-800"
            >
              <option value="all">-- Tất cả dự án --</option>
              {myProjects.map(p => (
                <option key={p.id} value={p.code}>{p.name}</option>
              ))}
            </CustomSelect>
          )}
        </div>
      </div>

      {/* Sub-tab Filter Chips */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 md:px-6 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Tất cả</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {stats.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Chờ nhận</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {stats.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Đang làm</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === 'in_progress' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {stats.inProgress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('review')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            statusFilter === 'review'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Chờ nghiệm thu</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === 'review' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {stats.review}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Hoàn thành</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {stats.completed}
          </span>
        </button>

        {stats.overdue > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              statusFilter === 'overdue'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Trễ hạn</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === 'overdue' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {stats.overdue}
            </span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col w-full">
        <div className="w-full h-full overflow-auto custom-scrollbar bg-slate-50/50 p-2.5 sm:p-3.5 md:p-4 pb-20 space-y-4">
          {displayedTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-medium bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-4xl text-slate-400">
                {statusFilter === 'completed' ? 'task_alt' : statusFilter === 'pending' ? 'pending_actions' : 'assignment_late'}
              </span>
              <p className="text-sm font-bold text-slate-700">
                {statusFilter === 'completed' 
                  ? 'Chưa có công việc nào đã hoàn thành.' 
                  : statusFilter === 'pending'
                  ? 'Chưa có công việc nào đang chờ nhận.'
                  : statusFilter === 'review'
                  ? 'Chưa có công việc nào đang chờ nghiệm thu.'
                  : statusFilter === 'overdue'
                  ? 'Không có công việc nào bị trễ hạn.'
                  : 'Không tìm thấy công việc nào phù hợp.'}
              </p>
              <p className="text-xs text-slate-400">
                {category === 'direct' 
                  ? 'Các công việc phát sinh/giao trực tiếp được phân công sẽ hiển thị tại đây.'
                  : 'Các công việc thuộc các dự án đảm nhiệm sẽ hiển thị tại đây.'}
              </p>
            </div>
          ) : (
            tasksByProject.map((group) => {
              const isRealProject = group.projectCode && group.projectCode !== 'COMPANY' && group.projectCode !== 'OTHER';
              const isCollapsed = !!collapsedProjects[group.projectCode];
              return (
                <div key={group.projectCode} className="space-y-2 w-full">
                  {/* Project Section Accordion Header */}
                  <div 
                    onClick={() => toggleProjectCollapse(group.projectCode)}
                    className="flex items-center justify-between bg-white hover:bg-blue-50/30 border border-slate-200 hover:border-blue-200/80 border-l-4 border-l-primary px-3.5 sm:px-4 py-2.5 rounded-xl shadow-xs cursor-pointer select-none transition-all group w-full"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-md bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center text-slate-500 group-hover:text-primary shadow-2xs transition-all duration-200 shrink-0 ${isCollapsed ? '' : 'rotate-90'}`}>
                        <span className="material-symbols-outlined text-base">
                          chevron_right
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                        <span className="material-symbols-outlined text-[16px]">
                          {isRealProject ? 'cell_tower' : 'flash_on'}
                        </span>
                      </div>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate" title={group.projectName}>
                        {group.projectName}
                      </h2>
                      {isRealProject && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                          {group.projectCode}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white shrink-0 shadow-2xs">
                        {group.tasks.length} {group.tasks.length === 1 ? 'việc' : 'việc'}
                      </span>
                    </div>

                    {isRealProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${encodeURIComponent(group.projectCode)}/tasks`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-200 text-xs font-semibold text-primary hover:text-blue-700 flex items-center gap-1 shrink-0 ml-2 cursor-pointer shadow-2xs transition-all"
                        title="Xem toàn bộ tiến độ dự án"
                      >
                        <span className="hidden sm:inline">Tiến độ dự án</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                    )}
                  </div>

                  {/* Task Cards Grid for this project */}
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 pt-1 w-full">
                      {group.tasks.map((t) => {
                const p = projects.find(proj => proj.code === t.projectCode);
                const isWaiting = t.status === 'Chờ nhận việc';
                const hasQuestion = t.status === 'Có thắc mắc';
                const isDoing = t.status === 'Đang làm' || t.status === 'Chưa làm';
                const isWaitingApproval = t.status === 'Chờ nghiệm thu';
                const isCompleted = t.status === 'Hoàn thành';
                const isOverdue = t.status !== 'Hoàn thành' && t.dueDate && new Date(t.dueDate) < new Date();
                const isMatch = Boolean(
                  (highlightTaskId && t.id === highlightTaskId) ||
                  (highlightKeyword && (t.name || '').toLowerCase().includes(highlightKeyword))
                );
                const latestDiscussion = getLatestDiscussion(t.notes, t.issue);
                
                const isAssignee = isUserTaskAssignee(user, t, engineers);
                const isFollowerOnly = !isAssignee && isUserTaskFollower(user, t, engineers);

                return (
                  <div 
                    key={t.id} 
                    onClick={() => setIsHighlightActive(false)}
                    className={`flex flex-col bg-white border rounded-xl shadow-xs overflow-hidden transition-all hover:shadow-md ${
                      isMatch
                        ? 'highlighted-task-card ring-2 ring-primary ring-offset-2 border-primary/40'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 flex justify-between items-center">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (t.projectCode && t.projectCode !== 'COMPANY') {
                            navigate(`/projects/${encodeURIComponent(t.projectCode)}/tasks?taskId=${encodeURIComponent(t.id)}&highlight=${encodeURIComponent(t.name)}`);
                          }
                        }}
                        className={`flex items-center gap-1.5 truncate pr-2 ${t.projectCode && t.projectCode !== 'COMPANY' ? 'hover:underline cursor-pointer text-slate-900 hover:text-primary transition-colors font-bold' : 'font-bold'}`}
                        title={t.projectCode && t.projectCode !== 'COMPANY' ? 'Bấm để xem công việc tại bảng Tiến độ công việc dự án' : undefined}
                      >
                        <span className="material-symbols-outlined text-[15px] text-slate-400">
                          {category === 'direct' ? 'flash_on' : 'folder'}
                        </span>
                        <span className="truncate">
                          {category === 'direct' ? (p?.name || t.projectCode || 'Nội bộ Công ty') : (p?.name || t.projectCode)}
                        </span>
                        {t.projectCode && t.projectCode !== 'COMPANY' && (
                          <span className="material-symbols-outlined text-[13px] text-slate-400 opacity-70 hover:opacity-100 shrink-0">
                            open_in_new
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isFollowerOnly && (
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">visibility</span>
                            Theo dõi
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {isOverdue && !isCompleted ? 'Trễ hạn' : (t.status || 'Chưa làm')}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 
                          onClick={(e) => {
                            if (t.projectCode && t.projectCode !== 'COMPANY') {
                              e.stopPropagation();
                              navigate(`/projects/${encodeURIComponent(t.projectCode)}/tasks?taskId=${encodeURIComponent(t.id)}&highlight=${encodeURIComponent(t.name)}`);
                            }
                          }}
                          className={`font-bold text-slate-800 text-sm leading-snug ${
                            t.projectCode && t.projectCode !== 'COMPANY' 
                              ? 'hover:text-primary hover:underline cursor-pointer transition-colors' 
                              : ''
                          }`}
                          title={t.projectCode && t.projectCode !== 'COMPANY' ? 'Bấm để mở đúng vị trí công việc trong bảng Tiến độ dự án' : undefined}
                        >
                          {t.name}
                        </h3>
                      </div>
                      {t.sectionName && t.sectionName !== t.name && t.sectionName !== 'Giao việc trực tiếp' && (
                        <p className="text-xs text-slate-500 mb-2">{t.sectionName}</p>
                      )}

                      {/* Information block */}
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
                        {(() => {
                          const followers = getTaskFollowerNames(t, engineers);
                          return followers.length > 0 ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-teal-600">visibility</span>
                                Người theo dõi:
                              </span>
                              <span className="font-bold text-teal-700 truncate max-w-[180px]" title={followers.join(', ')}>
                                {followers.join(', ')}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        {t.dueDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-rose-500">event</span>
                              Hạn chót:
                            </span>
                            <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                              {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Latest discussion snippet */}
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

                      {/* Card Footer Actions */}
                      <div className="mt-auto pt-3 flex items-center justify-between text-xs font-medium text-slate-600 border-t border-slate-100 gap-2 flex-wrap">
                        {t.volume ? (
                          <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold text-slate-700 border border-slate-200/60 shrink-0">
                            KL: {t.volume} {t.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Việc trực tiếp</span>
                        )}
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {(isWaiting || hasQuestion) && isAssignee && (
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
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg shadow-xs transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Nhận việc
                              </button>
                            </>
                          )}
                          {isDoing && isAssignee && (
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
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-lg shadow-xs transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">done_all</span>
                                Báo cáo hoàn thành
                              </button>
                            </>
                          )}
                          {isWaitingApproval && (
                            isUserTaskAssigner(user, t, engineers) ? (
                              <button 
                                onClick={() => handleApproveTask(t)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-lg shadow-xs transition-all text-xs cursor-pointer"
                                title="Nghiệm thu và xác nhận hoàn thành công việc này"
                              >
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                Nghiệm thu hoàn thành
                              </button>
                            ) : (
                              <span className="text-slate-700 font-semibold flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs">
                                <span className="material-symbols-outlined text-[16px] text-slate-500">hourglass_top</span>
                                Chờ nghiệm thu
                              </span>
                            )
                          )}
                          {isCompleted && (
                            <span className="text-slate-700 font-semibold flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs">
                              <span className="material-symbols-outlined text-[16px] text-slate-500">verified</span>
                              Đã nghiệm thu
                            </span>
                          )}
                          {isFollowerOnly && !isWaitingApproval && !isCompleted && (
                            <button 
                              onClick={() => setDiscussionTask(t)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-2xs transition-all text-[11px]"
                            >
                              <span className="material-symbols-outlined text-[14px] text-slate-500">chat</span>
                              Theo dõi & Trao đổi
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })
  )}
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
          isAssigner={isUserTaskAssigner(user, discussionTask, engineers)}
          isAssignee={isUserTaskAssignee(user, discussionTask, engineers)}
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
