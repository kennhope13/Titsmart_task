
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { SharedTaskTabs } from '../components/common/SharedTaskTabs';
import { CustomSelect } from '../components/common/CustomSelect';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission } from '../services/authStore';
import { AuditInfoCell } from '../components/common/AuditInfoCell';
import { Task } from '../types';
import { TaskDiscussionModal } from '../components/tasks/TaskDiscussionModal';
import { appendTaskDiscussion, parseTaskDiscussions, getLatestDiscussion } from '../utils/taskDiscussion';
import { getEngineersForProject } from '../utils/projectMemberUtils';
import { uploadAttachment } from '../utils/fileUploadHelper';

export const TaskAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, projects, engineers, updateTask } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [discussionTask, setDiscussionTask] = useState<Task | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadAttachment(file, 'task_assignments');
      setSelectedFile(result);
    } catch (err) {
      console.error('Lỗi tải file:', err);
      triggerToast('Không thể tải file lên. Vui lòng thử lại.', 'warning');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setIsUploading(true);
          try {
            const result = await uploadAttachment(file, 'task_assignments');
            setSelectedFile(result);
          } catch (err) {
            console.error('Lỗi tải ảnh:', err);
          } finally {
            setIsUploading(false);
          }
          break;
        }
      }
    }
  };

  const canApproveTask = (currentUser: any, task: any): boolean => {
    if (!currentUser || !task) return false;
    if (task.status !== 'Chờ nghiệm thu') return false;

    const userId = String(currentUser.id || '').toLowerCase();
    const userName = String(currentUser.name || '').toLowerCase();
    const userUsername = String(currentUser.username || '').toLowerCase();

    const myEng = Array.isArray(engineers) ? engineers.find(e => 
      (e.id && String(e.id).toLowerCase() === userId) ||
      (e.name && String(e.name).toLowerCase() === userName) ||
      (e.username && String(e.username).toLowerCase() === userUsername)
    ) : null;

    const myIds = [userId, myEng?.id?.toLowerCase()].filter(Boolean) as string[];
    const myNames = [userName, userUsername, myEng?.name?.toLowerCase()].filter(Boolean) as string[];

    const taskAssignerId = String(task.assignerId || '').trim().toLowerCase();
    const taskAssignerName = String(task.assignerName || '').trim().toLowerCase();

    // 1. Nếu công việc có assignerId cụ thể
    if (taskAssignerId && taskAssignerId !== 'admin') {
      return myIds.includes(taskAssignerId);
    }

    // 2. Nếu công việc có assignerName cụ thể
    if (taskAssignerName && taskAssignerName !== 'quản trị viên' && taskAssignerName !== 'quản lý') {
      return myNames.some(n => taskAssignerName.includes(n) || n.includes(taskAssignerName));
    }

    // 3. Nếu người giao là admin hoặc không có người giao cụ thể -> chỉ admin/quản trị viên mới được nghiệm thu
    const role = String(currentUser.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || currentUser.username === 'admin';
    return isAdmin;
  };

  const handleQuickApprove = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    if (!canApproveTask(user, task)) {
      triggerToast('Chỉ người giao việc mới có quyền nghiệm thu!', 'warning');
      return;
    }
    updateTask(task.id, { status: 'Hoàn thành', progress: 1, constrStatus: 'Đã hoàn thành', isDone: true });
    triggerToast(`Đã nghiệm thu hoàn thành: "${task.name}"!`, 'success');

    const store = useRealtimeStore.getState();
    const adminName = user?.name || user?.username || 'Quản lý';
    const adminId = user?.id || '';
    store.logActivity(`Người giao việc ${adminName} đã NGHIỆM THU HOÀN THÀNH công việc: "${task.name}"`, task.projectCode);

    if (store.addNotification && (task.assignedEngineerId || task.assignedEngineerName)) {
      const engId = task.assignedEngineerId || '';
      const engName = task.assignedEngineerName?.split('|')[0] || '';
      await store.addNotification({
        title: `Công việc đã nghiệm thu`,
        message: `${adminName} đã nghiệm thu hoàn thành công việc "${task.name}" [${task.projectCode}].`,
        link: `/my-tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_approved:::${engId}:::${engName}`,
        icon: 'verified',
        senderId: adminId,
        senderName: adminName
      });
    }
  };

  const handleSendReply = async (task: Task, replyText: string, fileAttachment?: { url: string; type: 'image' | 'file'; name: string }) => {
    const store = useRealtimeStore.getState();
    const userName = user?.name || user?.username || 'Người giao việc';
    const userId = user?.id || '';
    const updatedNotes = appendTaskDiscussion(task.notes || '', {
      senderId: userId,
      senderName: userName,
      senderRole: 'Người giao việc',
      type: 'reply',
      content: replyText,
      fileUrl: fileAttachment?.url,
      fileType: fileAttachment?.type,
      fileName: fileAttachment?.name
    });

    const nextStatus = task.status === 'Đang làm' ? 'Đang làm' : 'Chờ nhận việc';

    updateTask(task.id, {
      status: nextStatus,
      notes: updatedNotes
    });

    triggerToast('Đã gửi phản hồi hướng dẫn!', 'success');
    store.logActivity(`Người giao việc ${userName} đã PHẢN HỒI THẮC MẮC về hạng mục: "${task.name}"`, task.projectCode);

    if (store.addNotification && (task.assignedEngineerId || task.assignedEngineerName)) {
      const parts = String(task.assignedEngineerName || '').split('|');
      const engIds = (parts.length > 1 ? parts[1] : (task.assignedEngineerId || '')).split(',').map(s => s.trim()).filter(Boolean);
      const engNames = (parts[0] || (task.assignedEngineerName || '')).split(',').map(s => s.trim()).filter(Boolean);

      await store.addNotification({
        title: 'Phản hồi hướng dẫn công việc',
        message: `${userName} đã phản hồi thắc mắc về công việc "${task.name}" [${task.projectCode}]: "${replyText}".`,
        link: `/my-tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
        type: `task_reply:::${engIds.join(',')}:::${engNames.join(',')}`,
        icon: 'chat',
        senderId: userId,
        senderName: userName
      });
    }
  };

  const handleRowClick = (task: any, pCode?: string) => {
    if (activeTab === 'unassigned') {
      handleToggleTask(task.id);
    } else {
      const targetProjectCode = pCode || task.projectCode;
      if (targetProjectCode) {
        navigate(`/projects/${encodeURIComponent(targetProjectCode)}/tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`);
      }
    }
  };
  
  const [filterProjectCode, setFilterProjectCode] = useState('all');
  const urlTab = searchParams.get('tab') as 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks' | null;
  const highlightedTaskId = searchParams.get('taskId');
  const highlightKeyword = searchParams.get('highlight')?.toLowerCase().trim() || null;
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks'>(() => urlTab || (location.state as any)?.tab || 'assigned');

  // Direct Task Assignment State
  const [directTaskName, setDirectTaskName] = useState('');
  const [directEngineerId, setDirectEngineerId] = useState('');
  const [directProjectCode, setDirectProjectCode] = useState('COMPANY');
  const [directDueDate, setDirectDueDate] = useState('');
  const [directPriority, setDirectPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [directNotes, setDirectNotes] = useState('');
  const [directFile, setDirectFile] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  const [directShowAttachMenu, setDirectShowAttachMenu] = useState(false);
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [savingDirectTask, setSavingDirectTask] = useState(false);
  const [directFilterStatus, setDirectFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'review' | 'completed' | 'overdue'>('all');
  const [directSearch, setDirectSearch] = useState('');
  const [directPersonFilter, setDirectPersonFilter] = useState('all');

  const directFileInputRef = useRef<HTMLInputElement>(null);
  const directCameraInputRef = useRef<HTMLInputElement>(null);
  const directImageInputRef = useRef<HTMLInputElement>(null);

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDirectUploading(true);
    try {
      const result = await uploadAttachment(file, 'task_assignments');
      setDirectFile(result);
    } catch (err) {
      console.error('Lỗi tải file:', err);
      triggerToast('Không thể tải file lên. Vui lòng thử lại.', 'warning');
    } finally {
      setIsDirectUploading(false);
      e.target.value = '';
    }
  };

  const handleDirectPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setIsDirectUploading(true);
          try {
            const result = await uploadAttachment(file, 'task_assignments');
            setDirectFile(result);
          } catch (err) {
            console.error('Lỗi tải ảnh:', err);
          } finally {
            setIsDirectUploading(false);
          }
          break;
        }
      }
    }
  };

  const handleCreateDirectTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directTaskName.trim()) {
      triggerToast('Vui lòng nhập tên công việc!', 'warning');
      return;
    }
    if (!directEngineerId) {
      triggerToast('Vui lòng chọn nhân sự nhận việc!', 'warning');
      return;
    }

    const assignedEng = engineers.find(e => e.id === directEngineerId);
    if (!assignedEng) {
      triggerToast('Không tìm thấy thông tin nhân sự đã chọn!', 'warning');
      return;
    }

    setSavingDirectTask(true);
    try {
      const store = useRealtimeStore.getState();
      const assignerName = user?.name || user?.username || 'Quản lý';
      const assignerId = user?.id || '';
      const chosenProject = projects.find(p => p.code === directProjectCode);
      const isInternal = directProjectCode === 'COMPANY' || !chosenProject;
      const finalProjectCode = isInternal ? 'COMPANY' : directProjectCode;
      const finalProjectName = isInternal ? 'Nội bộ Công ty / Văn phòng' : chosenProject.name;

      let initialNotes = '';
      if (directNotes.trim() || directFile) {
        initialNotes = appendTaskDiscussion('', {
          senderId: assignerId,
          senderName: assignerName,
          senderRole: 'Người giao việc',
          type: 'assign_note',
          content: directNotes.trim() || 'Giao việc trực tiếp',
          fileUrl: directFile?.url,
          fileType: directFile?.type,
          fileName: directFile?.name
        });
      }

      const newTaskData = {
        stt: String((store.tasks || []).length + 1),
        code: `TASK-DIRECT-${Date.now().toString().slice(-4)}`,
        name: directTaskName.trim(),
        projectCode: finalProjectCode,
        projectName: finalProjectName,
        volume: 1,
        unit: 'Việc',
        progress: 0,
        status: 'Chờ nhận việc' as const,
        purchaseStatus: 'Không có hàng',
        constrStatus: 'Chưa thi công',
        isDone: false,
        isSectionHeader: false,
        sectionName: 'Giao việc trực tiếp',
        assignedEngineerId: assignedEng.id,
        assignedEngineerName: assignedEng.name,
        assignerId: assignerId,
        assignerName: assignerName,
        dueDate: directDueDate || undefined,
        priority: directPriority,
        notes: initialNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: assignerName
      };

      await store.addTask(newTaskData);

      store.logActivity(
        `Quản lý ${assignerName} đã GIAO VIỆC TRỰC TIẾP "${newTaskData.name}" cho ${assignedEng.name}`,
        finalProjectCode
      );

      if (store.addNotification) {
        await store.addNotification({
          title: `Giao việc trực tiếp: ${newTaskData.name}`,
          message: `${assignerName} đã giao công việc trực tiếp "${newTaskData.name}" [${finalProjectName}] cho bạn${directDueDate ? ` (Hạn: ${directDueDate})` : ''}.`,
          type: `task_assigned:::${assignedEng.id}:::${assignedEng.name}`,
          icon: 'assignment_ind',
          senderId: assignerId,
          senderName: assignerName
        });
      }

      triggerToast(`Đã giao việc thành công cho ${assignedEng.name}!`, 'success');
      setDirectTaskName('');
      setDirectNotes('');
      setDirectDueDate('');
      setDirectFile(null);
      setDirectShowAttachMenu(false);
    } catch (err) {
      console.error('Lỗi khi tạo công việc trực tiếp:', err);
      triggerToast('Lỗi khi giao việc. Vui lòng thử lại!', 'warning');
    } finally {
      setSavingDirectTask(false);
    }
  };

  const handleDeleteDirectTask = (taskId: string, taskName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa công việc "${taskName}"?`)) return;
    const store = useRealtimeStore.getState();
    store.deleteTask(taskId);
    triggerToast(`Đã xóa công việc "${taskName}"!`, 'success');
  };

  useEffect(() => {
    if (highlightedTaskId) {
      const found = tasks.find(t => t.id === highlightedTaskId);
      const shouldOpenDiscussion = searchParams.get('discuss') === 'true' || found?.status === 'Có thắc mắc';
      if (found && shouldOpenDiscussion) {
        setDiscussionTask(found);
      }
    }
  }, [highlightedTaskId, tasks, searchParams]);

  useEffect(() => {
    const qTab = searchParams.get('tab') as 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks' | null;
    if (qTab) {
      setActiveTab(qTab);
    } else if ((location.state as any)?.tab) {
      setActiveTab((location.state as any).tab);
    }
    if (highlightedTaskId || highlightKeyword) {
      setIsHighlightActive(true);
    }
  }, [location.state, searchParams, highlightedTaskId, highlightKeyword]);

  // Fast background polling fallback so task status updates immediately across all browsers
  useEffect(() => {
    useRealtimeStore.getState().fetchTasks(undefined);
    const interval = setInterval(() => {
      useRealtimeStore.getState().fetchTasks(undefined);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const displayedTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.isSectionHeader);
    if (activeTab === 'unassigned') {
      filtered = filtered.filter(t => !t.assignedEngineerId || t.status === 'Chưa làm' || t.status === 'Chờ nhận việc');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(t => t.status === 'Hoàn thành');
    } else if (activeTab === 'direct') {
      // In direct tab, we filter direct tasks below in directDisplayedTasks
      return [];
    } else {
      // 'assigned' = Đang thực hiện (đã giao việc, đang làm hoặc chờ nghiệm thu)
      filtered = filtered.filter(t => t.assignedEngineerId && t.status !== 'Chưa làm' && t.status !== 'Chờ nhận việc' && t.status !== 'Hoàn thành');
    }
    
    if (filterProjectCode !== 'all') {
      filtered = filtered.filter(t => t.projectCode === filterProjectCode);
    }

    // Sắp xếp đưa những công việc VỪA MỚI CẬP NHẬT lên đầu bảng
    return filtered.sort((a, b) => {
      // Ưu tiên dòng đang được click từ thông báo
      if (highlightedTaskId && a.id === highlightedTaskId) return -1;
      if (highlightedTaskId && b.id === highlightedTaskId) return 1;

      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [tasks, filterProjectCode, activeTab, highlightedTaskId]);

  // Danh sách công việc giao trực tiếp
  const directAllTasks = useMemo(() => {
    return tasks.filter(t => !t.isSectionHeader && (
      t.sectionName === 'Giao việc trực tiếp' ||
      t.projectCode === 'COMPANY' ||
      (t.code && t.code.startsWith('TASK-DIRECT'))
    ));
  }, [tasks]);

  const directKpiStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const total = directAllTasks.length;
    const completed = directAllTasks.filter(t => t.status === 'Hoàn thành' || t.isDone).length;
    const inProgress = directAllTasks.filter(t => t.status === 'Đang làm').length;
    const pending = directAllTasks.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc').length;
    const review = directAllTasks.filter(t => t.status === 'Chờ nghiệm thu').length;
    const overdue = directAllTasks.filter(t => {
      if (t.status === 'Hoàn thành' || t.isDone) return false;
      if (!t.dueDate) return false;
      const due = String(t.dueDate).split('T')[0];
      return due < todayStr;
    }).length;

    return { total, completed, inProgress, pending, review, overdue };
  }, [directAllTasks]);

  const directDisplayedTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let list = directAllTasks;

    if (directPersonFilter !== 'all') {
      list = list.filter(t => t.assignedEngineerId === directPersonFilter || t.assignedEngineerName?.includes(directPersonFilter));
    }

    if (directFilterStatus === 'pending') {
      list = list.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc');
    } else if (directFilterStatus === 'in_progress') {
      list = list.filter(t => t.status === 'Đang làm');
    } else if (directFilterStatus === 'review') {
      list = list.filter(t => t.status === 'Chờ nghiệm thu');
    } else if (directFilterStatus === 'completed') {
      list = list.filter(t => t.status === 'Hoàn thành' || t.isDone);
    } else if (directFilterStatus === 'overdue') {
      list = list.filter(t => {
        if (t.status === 'Hoàn thành' || t.isDone) return false;
        if (!t.dueDate) return false;
        return String(t.dueDate).split('T')[0] < todayStr;
      });
    }

    if (directSearch.trim()) {
      const q = directSearch.toLowerCase().trim();
      list = list.filter(t => 
        t.name?.toLowerCase().includes(q) ||
        t.assignedEngineerName?.toLowerCase().includes(q) ||
        t.projectName?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt ? new Date(a.updatedAt || a.createdAt!).getTime() : 0;
      const timeB = b.updatedAt || b.createdAt ? new Date(b.updatedAt || b.createdAt!).getTime() : 0;
      return timeB - timeA;
    });
  }, [directAllTasks, directPersonFilter, directFilterStatus, directSearch]);

  // Lọc danh sách kỹ sư / nhân viên thuộc các dự án của những task đang được chọn giao việc
  const assignableEngineers = useMemo(() => {
    if (selectedTaskIds.length === 0) {
      if (filterProjectCode && filterProjectCode !== 'all') {
        return getEngineersForProject(filterProjectCode, engineers, projects);
      }
      return engineers;
    }

    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    const projectCodes = Array.from(new Set(selectedTasks.map(t => t.projectCode || t.projectName).filter(Boolean)));

    if (projectCodes.length === 0) {
      return engineers;
    }

    // Nếu tất cả các task thuộc 1 dự án (phổ biến nhất)
    if (projectCodes.length === 1) {
      return getEngineersForProject(projectCodes[0], engineers, projects);
    }

    // Nếu chọn nhiều task thuộc nhiều dự án khác nhau: nhân sự phải thuộc TẤT CẢ các dự án đó (intersection) hoặc nếu không có ai thì lấy union
    const candidateSets = projectCodes.map(pCode => getEngineersForProject(pCode, engineers, projects));
    const commonEngineers = candidateSets.reduce((acc, currentList) => {
      const currentIds = new Set(currentList.map(e => e.id));
      return acc.filter(e => currentIds.has(e.id));
    });

    if (commonEngineers.length > 0) {
      return commonEngineers;
    }

    // Fallback: union of engineers in those projects
    const allProjEngIds = new Set<string>();
    const unionEngs: typeof engineers = [];
    candidateSets.forEach(list => {
      list.forEach(eng => {
        if (!allProjEngIds.has(eng.id)) {
          allProjEngIds.add(eng.id);
          unionEngs.push(eng);
        }
      });
    });

    return unionEngs;
  }, [selectedTaskIds, tasks, filterProjectCode, engineers, projects]);

  useEffect(() => {
    if (isHighlightActive && (highlightedTaskId || highlightKeyword)) {
      const timer = setTimeout(() => {
        const elem = document.querySelector('.highlighted-task-assignment-row');
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
  }, [isHighlightActive, highlightedTaskId, highlightKeyword, displayedTasks]);

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === displayedTasks.length && displayedTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(displayedTasks.map(t => t.id));
    }
  };

  const handleToggleTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (!selectedEngineerId) {
      triggerToast('Vui lòng chọn kỹ sư!', 'warning');
      return;
    }
    if (selectedTaskIds.length === 0) {
      triggerToast('Vui lòng chọn ít nhất 1 hạng mục!', 'warning');
      return;
    }

    const eng = engineers.find(e => e.id === selectedEngineerId);
    const engName = eng ? eng.name : '';
    const assignerId = user?.id || '';
    const assignerName = user?.name || user?.username || 'Quản lý';

    selectedTaskIds.forEach(id => {
      const existingTask = tasks.find(t => t.id === id);
      let updatedNotes = existingTask?.notes || '';
      if (assignNote.trim() || selectedFile) {
        updatedNotes = appendTaskDiscussion(updatedNotes, {
          senderId: assignerId,
          senderName: assignerName,
          senderRole: 'Người giao việc',
          type: 'assign_note',
          content: assignNote.trim(),
          fileUrl: selectedFile?.url,
          fileType: selectedFile?.type,
          fileName: selectedFile?.name
        });
      }
      updateTask(id, {
        assignedEngineerId: selectedEngineerId,
        assignedEngineerName: engName,
        assignerId: assignerId,
        assignerName: assignerName,
        status: 'Chờ nhận việc',
        notes: updatedNotes
      });
    });

    const store = useRealtimeStore.getState();
    store.logActivity(`Quản lý ${assignerName} đã GIAO ${selectedTaskIds.length} CÔNG VIỆC cho ${engName}`, 'Hệ thống');

    if (store.addNotification) {
      store.addNotification({
        title: `Giao việc: ${engName}`,
        message: `${assignerName} đã giao ${selectedTaskIds.length} công việc mới cho ${engName}${assignNote.trim() ? `: "${assignNote.trim()}"` : ''}${selectedFile ? (selectedFile.type === 'image' ? ' [Kèm 1 hình ảnh]' : ` [Kèm tệp: ${selectedFile.name}]`) : '.'}`,
        type: `task_assigned:::${selectedEngineerId}:::${engName}`,
        icon: 'assignment_ind',
        senderId: assignerId,
        senderName: assignerName
      });
    }

    triggerToast(`Đã giao ${selectedTaskIds.length} hạng mục cho ${engName}!`, 'success');
    setSelectedTaskIds([]);
    setIsModalOpen(false);
    setSelectedEngineerId('');
    setAssignNote('');
    setSelectedFile(null);
    setShowAttachMenu(false);
  };

  const [isScrolledHorizontally, setIsScrolledHorizontally] = useState(false);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (scrollLeft > 10 && !isScrolledHorizontally) {
      setIsScrolledHorizontally(true);
    } else if (scrollLeft <= 10 && isScrolledHorizontally) {
      setIsScrolledHorizontally(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'Quản trị viên') {
    return <div className="p-8 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="border-b border-slate-200 bg-white shadow-sm px-3 md:px-6 md:pr-20 py-2.5 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 md:gap-2 relative z-50 shrink-0 no-drag-region electron-no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 w-full md:w-auto min-w-0">
          <div className="flex items-center justify-between gap-2 shrink-0 h-7 sm:h-8 md:h-auto pr-12 md:pr-0">
            <h1 className="page-title text-sm md:text-base font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">
              CÔNG VIỆC
            </h1>
          </div>
          <SharedTaskTabs activeTab={activeTab as any} onTabChange={(t) => { setActiveTab(t); setSelectedTaskIds([]); }} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          {activeTab !== 'direct' && (
            <CustomSelect 
              value={filterProjectCode} 
              onChange={(e) => setFilterProjectCode(e.target.value)}
              className="flex-1 md:w-[220px] h-[34px] text-xs font-bold text-slate-800"
            >
              <option value="all">-- Tất cả Dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.code}>{p.name}</option>
              ))}
            </CustomSelect>
          )}

          {activeTab === 'unassigned' && (
            <button 
              disabled={selectedTaskIds.length === 0}
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold shadow-sm transition-all whitespace-nowrap shrink-0 ${
                selectedTaskIds.length > 0 ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-base">send</span>
              Giao {selectedTaskIds.length > 0 ? selectedTaskIds.length : ''} việc
            </button>
          )}

          {activeTab !== 'direct' && (
            <button 
              onClick={() => setActiveTab('direct')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-bold shadow-xs transition-all whitespace-nowrap shrink-0 bg-primary hover:bg-primary/90 text-white"
              title="Giao việc trực tiếp / ngoài dự án"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              <span>Giao việc nhanh</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'direct' ? (
        /* GIAO DIỆN GIAO VIỆC TRỰC TIẾP / VIỆC RIÊNG NGOÀI DỰ ÁN (EDGE-TO-EDGE & TỐI ƯU MOBILE) */
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          
          {/* Form Giao việc trực tiếp */}
          <div className="border-b border-slate-200 bg-slate-50/60 p-3 sm:p-4 shrink-0">
            <form onSubmit={handleCreateDirectTask} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-3">
                
                {/* Tên công việc */}
                <div className="sm:col-span-2 md:col-span-6 flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nội dung công việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={directTaskName}
                    onChange={(e) => setDirectTaskName(e.target.value)}
                    placeholder="VD: Kiểm tra tình trạng vật tư kho, Soạn hợp đồng dịch vụ..."
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium"
                  />
                </div>

                {/* Chọn nhân sự nhận việc */}
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Người nhận việc <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={directEngineerId}
                    onChange={(e) => setDirectEngineerId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium"
                  >
                    <option value="">-- Chọn nhân sự --</option>
                    {engineers.map(eng => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} {eng.title ? `(${eng.title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thuộc Dự án / Nội bộ */}
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Dự án / Phạm vi
                  </label>
                  <select
                    value={directProjectCode}
                    onChange={(e) => setDirectProjectCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium text-slate-800"
                  >
                    <option value="COMPANY">Nội bộ Công ty / Văn phòng</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hạn hoàn thành (Deadline) */}
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Hạn hoàn thành
                  </label>
                  <input
                    type="date"
                    value={directDueDate}
                    onChange={(e) => setDirectDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium"
                  />
                </div>

                {/* Mức độ ưu tiên */}
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={directPriority}
                    onChange={(e) => setDirectPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium"
                  >
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Ưu tiên cao / Gấp</option>
                  </select>
                </div>

                {/* Ghi chú & Đính kèm */}
                <div className="sm:col-span-2 md:col-span-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Ghi chú / Yêu cầu
                    </label>
                    <button
                      type="button"
                      onClick={() => setDirectShowAttachMenu(!directShowAttachMenu)}
                      className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                        directShowAttachMenu ? 'bg-blue-100 border-blue-300 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">attach_file</span>
                      <span>{directFile ? 'Đã đính kèm' : 'Đính kèm'}</span>
                    </button>
                  </div>

                  {directFile && (
                    <div className="flex items-center justify-between bg-blue-50 px-2.5 py-1 rounded text-[11px] text-blue-900 border border-blue-200 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[14px] text-primary shrink-0">
                          {directFile.type === 'image' ? 'image' : 'attach_file'}
                        </span>
                        <span className="truncate font-medium">{directFile.name}</span>
                      </div>
                      <button type="button" onClick={() => setDirectFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
                    </div>
                  )}

                  {directShowAttachMenu && (
                    <div className="relative">
                      <div className="fixed inset-0 z-40" onClick={() => setDirectShowAttachMenu(false)} />
                      <div className="absolute right-0 top-1 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => { setDirectShowAttachMenu(false); directCameraInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-primary rounded-lg text-left"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-[16px]">photo_camera</span>
                          <span>Chụp ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDirectShowAttachMenu(false); directImageInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-primary rounded-lg text-left"
                        >
                          <span className="material-symbols-outlined text-blue-600 text-[16px]">image</span>
                          <span>Thư viện ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDirectShowAttachMenu(false); directFileInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-primary rounded-lg text-left"
                        >
                          <span className="material-symbols-outlined text-amber-500 text-[16px]">folder_open</span>
                          <span>Tệp tài liệu</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <input type="file" ref={directCameraInputRef} onChange={handleDirectFileUpload} className="hidden" accept="image/*" capture="environment" />
                  <input type="file" ref={directImageInputRef} onChange={handleDirectFileUpload} className="hidden" accept="image/*" />
                  <input type="file" ref={directFileInputRef} onChange={handleDirectFileUpload} className="hidden" accept="*/*" />

                  <input
                    type="text"
                    value={directNotes}
                    onChange={(e) => setDirectNotes(e.target.value)}
                    onPaste={handleDirectPaste}
                    placeholder="Nhập hướng dẫn, lưu ý..."
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>

                {/* Nút submit */}
                <div className="sm:col-span-2 md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={savingDirectTask || isDirectUploading}
                    className="w-full h-[32px] sm:h-[34px] px-4 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>{savingDirectTask ? 'Đang gửi...' : 'Giao việc'}</span>
                  </button>
                </div>

              </div>
            </form>
          </div>

          {/* Thanh Filter & Search đồng bộ */}
          <div className="border-b border-slate-200 bg-white px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
            {/* Filter Status Chips */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setDirectFilterStatus('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'all' ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({directKpiStats.total})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('pending')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Chờ nhận ({directKpiStats.pending})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('in_progress')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'in_progress' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Đang làm ({directKpiStats.inProgress})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('review')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'review' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                Chờ nghiệm thu ({directKpiStats.review})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('completed')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Hoàn thành ({directKpiStats.completed})
              </button>
              {directKpiStats.overdue > 0 && (
                <button
                  type="button"
                  onClick={() => setDirectFilterStatus('overdue')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    directFilterStatus === 'overdue' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Trễ hạn ({directKpiStats.overdue})
                </button>
              )}
            </div>

            {/* Bộ lọc Người nhận & Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={directPersonFilter}
                onChange={(e) => setDirectPersonFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:border-primary focus:ring-1 focus:ring-primary flex-1 sm:flex-initial"
              >
                <option value="all">-- Tất cả nhân sự --</option>
                {engineers.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.name}</option>
                ))}
              </select>

              <div className="relative flex-1 sm:w-48">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">search</span>
                <input
                  type="text"
                  value={directSearch}
                  onChange={(e) => setDirectSearch(e.target.value)}
                  placeholder="Tìm việc..."
                  className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* Bảng Danh sách Công việc Đã giao Trực tiếp tràn viền edge-to-edge */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-white" onScroll={handleTableScroll}>
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">STT</th>
                  <th className="py-2.5 px-4 border-r border-slate-200">Nội dung công việc</th>
                  <th className="py-2.5 px-4 w-44 border-r border-slate-200">Người nhận việc</th>
                  <th className="py-2.5 px-4 w-44 border-r border-slate-200">Dự án / Phạm vi</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">Hạn chót</th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200">Ưu tiên</th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-slate-200">Trạng thái</th>
                  <th className="py-2.5 px-3 w-28 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {directDisplayedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Không có công việc trực tiếp nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  directDisplayedTasks.map((t, idx) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isOverdue = t.dueDate && String(t.dueDate).split('T')[0] < todayStr && t.status !== 'Hoàn thành' && !t.isDone;

                    return (
                      <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200">{idx + 1}</td>
                        <td className="py-2.5 px-4 border-r border-slate-200">
                          <div className="font-bold text-slate-900 text-xs">{t.name}</div>
                          {t.notes && (
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-slate-400 shrink-0">notes</span>
                              <span>{t.notes.replace(/\[\d{4}-\d{2}-\d{2}[^\]]*\]/g, '').trim()}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-200">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-primary flex items-center justify-center text-[10px] font-black">
                              {t.assignedEngineerName?.[0] || 'N'}
                            </span>
                            <span>{t.assignedEngineerName?.split('|')[0] || 'Chưa giao'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-200">
                          {t.projectCode === 'COMPANY' || !t.projectCode ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                              Nội bộ / Văn phòng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                              {t.projectName || t.projectCode}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          {t.dueDate ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              isOverdue ? 'bg-red-100 text-red-700' : 'text-slate-700'
                            }`}>
                              {t.dueDate}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.priority === 'High' ? 'bg-red-100 text-red-700' :
                            t.priority === 'Low' ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {t.priority === 'High' ? 'Cao' : t.priority === 'Low' ? 'Thấp' : 'Chuẩn'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            t.status === 'Hoàn thành' || t.isDone ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'Chờ nghiệm thu' ? 'bg-indigo-100 text-indigo-800 font-black ring-1 ring-indigo-300' :
                            t.status === 'Đang làm' ? 'bg-blue-100 text-blue-800' :
                            t.status === 'Có thắc mắc' ? 'bg-amber-100 text-amber-800' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {t.status || 'Chờ nhận việc'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canApproveTask(user, t) && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickApprove(e, t)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs transition-colors"
                                title="Nghiệm thu hoàn thành"
                              >
                                <span className="material-symbols-outlined text-[15px]">verified</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDiscussionTask(t)}
                              className="p-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-primary rounded transition-colors"
                              title="Trao đổi, hướng dẫn"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDirectTask(t.id, t.name)}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Xóa công việc"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        /* GIAO DIỆN BẢNG CÔNG VIỆC DỰ ÁN TRUYỀN THỐNG */
        <div className="flex-1 overflow-hidden flex flex-col border-t border-slate-200">
          <div 
            className="w-full h-full overflow-auto custom-scrollbar bg-white"
            onScroll={handleTableScroll}
          >
            <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  {activeTab === 'unassigned' && (
                    <th className={`py-2.5 px-3 w-[50px] min-w-[50px] bg-slate-50 text-center border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
                      isScrolledHorizontally ? 'hidden sm:table-cell sticky left-0 z-20' : 'sticky left-0 z-20'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 cursor-pointer accent-primary"
                        checked={displayedTasks.length > 0 && selectedTaskIds.length === displayedTasks.length}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                  )}
                  <th className={`py-2.5 px-4 w-[250px] border-r border-slate-200 bg-slate-50 ${
                    isScrolledHorizontally ? 'sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''
                  }`}>Dự án</th>
                  <th className="py-2.5 px-4 border-r border-slate-200">Nội dung công việc</th>
                  <th className="py-2.5 px-4 w-40 border-r border-slate-200">Người phụ trách</th>
                  <th className="py-2.5 px-4 w-32 border-r border-slate-200">Trạng thái</th>
                  <th className="py-2.5 px-4 w-20 text-center border-r border-slate-200">KL</th>
                  <th className="py-2.5 px-4 w-20 text-center border-r border-slate-200">ĐVT</th>
                  <th className="py-2.5 px-4 w-40 border-r border-slate-200 text-center">NGƯỜI CẬP NHẬT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-medium italic">Không có công việc nào</td>
                  </tr>
                ) : (
                  displayedTasks.map((t, idx) => {
                    const p = projects.find(proj => proj.code === t.projectCode);
                    const isChecked = selectedTaskIds.includes(t.id);
                    const isTargetTask = isHighlightActive && (
                      (highlightedTaskId && t.id === highlightedTaskId) ||
                      (highlightKeyword && (
                        t.name?.toLowerCase().includes(highlightKeyword) ||
                        t.sectionName?.toLowerCase().includes(highlightKeyword)
                      ))
                    );
                    return (
                      <tr 
                        key={t.id} 
                        className={`transition-all cursor-pointer group ${
                          isTargetTask 
                            ? 'highlighted-task-assignment-row bg-amber-100/60 hover:bg-amber-100/80 border-l-4 border-l-amber-500 border-y border-amber-300/70 ring-1 ring-inset ring-amber-300/50 font-medium' 
                            : isChecked && activeTab === 'unassigned' 
                              ? 'bg-blue-50/50' 
                              : 'bg-white hover:bg-blue-50/50'
                        }`} 
                        onClick={() => handleRowClick(t, p?.code || t.projectCode)}
                        title={activeTab !== 'unassigned' ? "Nhấn vào dòng này để xem chi tiết công việc trong dự án" : undefined}
                      >
                        {activeTab === 'unassigned' && (
                          <td className={`py-2.5 px-3 text-center border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isChecked ? 'bg-blue-50' : 'bg-white'} ${
                            isScrolledHorizontally ? 'hidden sm:table-cell sticky left-0 z-10' : 'sticky left-0 z-10'
                          }`} onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 cursor-pointer accent-primary"
                              checked={isChecked}
                              onChange={() => handleToggleTask(t.id)}
                            />
                          </td>
                        )}
                        <td className={`py-2.5 px-4 font-bold text-slate-700 text-[11px] uppercase border-r border-slate-200 ${isChecked ? 'bg-blue-50' : 'bg-white'} ${
                          isScrolledHorizontally ? 'sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''
                        }`}>{p ? p.name : t.projectCode}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800 text-xs border-l border-slate-200 flex flex-col">
                          <div className="flex items-center justify-between gap-2">
                            <span className="group-hover:text-blue-600 transition-colors">{t.name}</span>
                            {activeTab !== 'unassigned' && (
                              <span className="material-symbols-outlined text-[15px] text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" title="Đi đến công việc">
                                arrow_forward
                              </span>
                            )}
                          </div>
                          {t.sectionName && t.sectionName !== t.name && (
                            <span className="text-[10px] text-slate-500 mt-1">{t.sectionName}</span>
                          )}
                          {t.status === 'Có thắc mắc' && (() => {
                            const latestDisc = getLatestDiscussion(t.notes, t.issue);
                            return (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDiscussionTask(t);
                                }}
                                className="mt-1.5 p-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 rounded text-[11px] text-amber-950 font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                                title="Nhấn để xem chi tiết thắc mắc và phản hồi"
                              >
                                <span className="material-symbols-outlined text-[14px] text-amber-600 shrink-0">help_center</span>
                                <span className="truncate">
                                  <strong>Thắc mắc:</strong> {latestDisc?.content || t.issue || 'Cần làm rõ yêu cầu công việc'}
                                </span>
                                <span className="text-[10px] text-amber-700 font-bold underline shrink-0 ml-auto">Xem</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-bold text-slate-700 border-l border-slate-200">
                          {t.assignedEngineerName ? t.assignedEngineerName.split('|')[0] : <span className="text-slate-400 font-normal italic">Chưa có</span>}
                        </td>
                        <td className="py-2.5 px-4 border-l border-slate-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${
                              t.status === 'Có thắc mắc' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              t.status === 'Chờ nhận việc' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'Đang làm' ? 'bg-blue-100 text-blue-700' :
                              t.status === 'Chờ nghiệm thu' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                              t.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {t.status || 'Chưa làm'}
                            </span>
                            {canApproveTask(user, t) && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickApprove(e, t)}
                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-[10px] rounded shadow-xs flex items-center gap-1 transition-all"
                                title="Nghiệm thu hoàn thành ngay lập tức"
                              >
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                Nghiệm thu
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600 font-medium text-xs border-l border-slate-200">{t.volume}</td>
                        <td className="py-2.5 px-4 text-center text-slate-600 font-medium text-xs border-l border-slate-200">{t.unit}</td>
                        <td className="py-2.5 px-4 border-l border-slate-200">
                          <AuditInfoCell updatedBy={t.updatedBy} updatedAt={t.updatedAt} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assignment_add</span>
                Giao việc cho nhân viên
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">info</span>
                Bạn đang chọn giao {selectedTaskIds.length} đầu mục công việc.
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Chọn người phụ trách <span className="text-red-500">*</span></label>
                <select 
                  value={selectedEngineerId} 
                  onChange={(e) => setSelectedEngineerId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full font-medium"
                >
                  <option value="">-- Chọn nhân viên / kỹ sư --</option>
                  {assignableEngineers.map(e => (
                    <option key={e.id} value={e.id}>{e.name} {e.title ? `(${e.title})` : ''}</option>
                  ))}
                </select>
                {assignableEngineers.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    * Dự án này chưa có nhân sự thành viên nào. Vui lòng thêm thành viên trong Quản lý dự án trước khi giao việc.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
                    Ghi chú / Hướng dẫn công việc (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 font-semibold transition-colors cursor-pointer ${showAttachMenu ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-900'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">attach_file</span>
                    <span>Đính kèm</span>
                  </button>
                </div>

                {/* Thẻ xem trước File đang đính kèm */}
                {selectedFile && (
                  <div className="flex items-center justify-between bg-blue-50 px-2.5 py-1.5 rounded-lg text-[11px] text-blue-900 border border-blue-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-blue-700 shrink-0">
                        {selectedFile.type === 'image' ? 'image' : 'attach_file'}
                      </span>
                      <span className="truncate font-medium max-w-[240px]">{selectedFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
                  </div>
                )}

                {/* Popover Menu: Camera / Thư viện / Tệp */}
                {showAttachMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                    <div className="absolute right-0 top-7 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          cameraInputRef.current?.click();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">photo_camera</span>
                        <span>Chụp ảnh mới</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          imageInputRef.current?.click();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-blue-600 text-[18px]">image</span>
                        <span>Thư viện ảnh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-amber-500 text-[18px]">folder_open</span>
                        <span>Tệp tài liệu</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Hidden File Inputs */}
                <input type="file" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" capture="environment" />
                <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />

                <textarea 
                  value={assignNote} 
                  onChange={(e) => setAssignNote(e.target.value)}
                  onPaste={handlePaste}
                  rows={3}
                  placeholder="Nhập yêu cầu, lưu ý hoặc tiêu chuẩn kỹ thuật gửi cho nhân viên..."
                  className="border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white border border-slate-300">
                Hủy
              </button>
              <button onClick={handleAssign} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Xác nhận giao việc
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskDiscussionModal
        isOpen={!!discussionTask}
        onClose={() => setDiscussionTask(null)}
        task={tasks.find(tk => tk.id === discussionTask?.id) || discussionTask}
        onSendReply={handleSendReply}
      />

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
