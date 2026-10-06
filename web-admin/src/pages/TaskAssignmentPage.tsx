
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { SharedTaskTabs } from '../components/common/SharedTaskTabs';
import { CustomSelect } from '../components/common/CustomSelect';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission } from '../services/authStore';
import { AuditInfoCell } from '../components/common/AuditInfoCell';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Task } from '../types';
import { TaskDiscussionModal } from '../components/tasks/TaskDiscussionModal';
import { appendTaskDiscussion, parseTaskDiscussions, getLatestDiscussion, stripDiscussionThread } from '../utils/taskDiscussion';
import { getEngineersForProject } from '../utils/projectMemberUtils';
import { uploadAttachment } from '../utils/fileUploadHelper';
import { isUserTaskAssignee, isUserTaskAssigner, isUserTaskFollower, getTaskFollowerNames, isTaskReadyForAssignment } from '../utils/taskPermission';

export const TaskAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, projects, engineers, updateTask, materialPlans } = useRealtimeStore();
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
    return isUserTaskAssigner(currentUser, task, engineers);
  };

  const canDeleteTask = (currentUser: any, task: any): boolean => {
    if (!currentUser || !task) return false;
    const uRole = String(currentUser.role || '').toLowerCase();
    const uId = String(currentUser.id || '').toLowerCase();
    const uName = String(currentUser.name || '').toLowerCase();
    const uUsername = String(currentUser.username || '').toLowerCase();

    // 1. Quản trị viên tối cao luôn có quyền xóa
    if (uRole === 'admin' || uRole === 'quản trị viên' || uUsername === 'admin') {
      return true;
    }

    // 2. Người theo dõi TUYỆT ĐỐI KHÔNG CÓ QUYỀN XÓA
    const isFollower = (Array.isArray(task.followerIds) && task.followerIds.some((fid: string) => String(fid).toLowerCase() === uId)) ||
      (Array.isArray(task.followerNames) && task.followerNames.some((fn: string) => {
        const clean = String(fn).replace(/^[:|]+|[:|]+$/g, '').trim().toLowerCase();
        return clean && (clean.includes(uName) || uName.includes(clean) || (uUsername && clean.includes(uUsername)));
      }));
    if (isFollower) return false;

    // 3. Người được giao việc (nhận việc) cũng không có quyền xóa
    const isAssignee = isUserTaskAssignee(currentUser, task, engineers);
    if (isAssignee) return false;

    // 4. Người giao việc chính chủ hoặc Người có quyền quản lý công việc
    const isCreatorOrAssigner = isUserTaskAssigner(currentUser, task, engineers);
    const hasEditPermission = hasPermission(currentUser, 'EDIT_TASKS') || hasPermission(currentUser, 'ASSIGN_TASKS');

    return Boolean(isCreatorOrAssigner || hasEditPermission);
  };

  const handleAcceptTask = async (taskToAccept: Task) => {
    try {
      const isDirect = taskToAccept.sectionName === 'Giao việc trực tiếp' || taskToAccept.projectCode === 'COMPANY' || taskToAccept.code?.startsWith('TASK-DIRECT');
      const nextStatus = isDirect ? 'Đang làm' : 'Đang làm';
      await updateTask(taskToAccept.id, {
        status: nextStatus,
        progress: taskToAccept.progress > 0 ? taskToAccept.progress : 0.05
      });

      triggerToast(`Đã nhận việc thành công: "${taskToAccept.name}"!`, 'success');

      const store = useRealtimeStore.getState();
      const engName = user?.name || user?.username || 'Nhân sự';
      store.logActivity(`Nhân sự ${engName} đã XÁC NHẬN NHẬN VIỆC "${taskToAccept.name}"`, taskToAccept.projectCode);

      if (store.addNotification && (taskToAccept.assignerId || taskToAccept.assignerName)) {
        await store.addNotification({
          title: 'Nhân sự đã nhận việc',
          message: `${engName} đã xác nhận nhận việc "${taskToAccept.name}" [${taskToAccept.projectCode}].`,
          link: `/my-tasks?taskId=${encodeURIComponent(taskToAccept.id)}&highlight=${encodeURIComponent(taskToAccept.name || '')}`,
          type: `task_accepted:::${taskToAccept.assignerId || ''}:::${taskToAccept.assignerName || ''}`,
          icon: 'task_alt',
          senderId: user?.id,
          senderName: engName
        });
      }
    } catch (err) {
      console.error('Lỗi nhận việc:', err);
      triggerToast('Không thể nhận việc. Vui lòng thử lại!', 'warning');
    }
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
    const userName = user?.name || user?.username || 'Thành viên';
    const userId = user?.id || '';

    const isAssigner = isUserTaskAssigner(user, task, engineers);
    const isAssignee = isUserTaskAssignee(user, task, engineers);
    const isFollower = isUserTaskFollower(user, task, engineers) || (!isAssigner && !isAssignee);

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
    store.logActivity(`${senderRole} ${userName} đã TRAO ĐỔI về hạng mục: "${task.name}"`, task.projectCode);

    if (store.addNotification) {
      const parts = String(task.assignedEngineerName || '').split('|');
      const engIds = (parts.length > 1 ? parts[1] : (task.assignedEngineerId || '')).split(',').map(s => s.trim()).filter(Boolean);
      const engNames = (parts[0] || (task.assignedEngineerName || '')).split(',').map(s => s.trim()).filter(Boolean);

      const followerIds = task.followerIds || [];
      const followerNames = task.followerNames || [];

      const allRecipientIds = Array.from(new Set([
        task.assignerId,
        ...engIds,
        ...followerIds
      ])).filter(id => id && id !== userId);

      const allRecipientNames = Array.from(new Set([
        task.assignerName,
        ...engNames,
        ...followerNames
      ])).filter(Boolean);

      if (allRecipientIds.length > 0) {
        await store.addNotification({
          title: `Trao đổi công việc: ${task.name}`,
          message: `${senderRole} ${userName} đã trao đổi về công việc "${task.name}" [${task.projectCode}]: "${replyText || (fileAttachment ? (fileAttachment.type === 'image' ? 'Đã gửi 1 hình ảnh' : `Đã đính kèm tệp: ${fileAttachment.name}`) : '')}".`,
          link: `/my-tasks?taskId=${encodeURIComponent(task.id)}&highlight=${encodeURIComponent(task.name || '')}`,
          type: `task_reply:::${allRecipientIds.join(',')}:::${allRecipientNames.join(',')}`,
          icon: 'forum',
          senderId: userId,
          senderName: userName
        });
      }
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
  const urlTab = searchParams.get('tab') as 'project_tasks' | 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks' | null;
  const highlightedTaskId = searchParams.get('taskId');
  const highlightKeyword = searchParams.get('highlight')?.toLowerCase().trim() || null;
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'project_tasks' | 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks'>(() => {
    if (urlTab === 'direct') return 'direct';
    return 'project_tasks';
  });

  // Project Task Filter State
  const [projectFilterStatus, setProjectFilterStatus] = useState<'all' | 'unassigned' | 'pending' | 'in_progress' | 'review' | 'completed' | 'overdue'>(() => {
    if (urlTab === 'completed') return 'completed';
    return 'unassigned';
  });
  const [projectSearch, setProjectSearch] = useState('');

  // Direct Task Assignment State
  const [directTaskName, setDirectTaskName] = useState('');
  const [directEngineerId, setDirectEngineerId] = useState('');
  const [directFollowerIds, setDirectFollowerIds] = useState<string[]>([]);
  const [batchFollowerIds, setBatchFollowerIds] = useState<string[]>([]);
  const [directProjectCode, setDirectProjectCode] = useState('COMPANY');
  const [directDueDate, setDirectDueDate] = useState('');
  const [directPriority, setDirectPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [directNotes, setDirectNotes] = useState('');
  const [directFile, setDirectFile] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  const [directShowAttachMenu, setDirectShowAttachMenu] = useState(false);
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [savingDirectTask, setSavingDirectTask] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
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

      const followerEngs = engineers.filter(e => directFollowerIds.includes(e.id));
      const followerNames = followerEngs.map(e => e.name);

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
        followerIds: directFollowerIds.length > 0 ? directFollowerIds : undefined,
        followerNames: followerNames.length > 0 ? followerNames : undefined,
        assignerId: assignerId,
        assignerName: assignerName,
        dueDate: directDueDate || undefined,
        priority: directPriority,
        notes: initialNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: assignerName
      };

      const createdTaskId = await store.addTask(newTaskData);

      store.logActivity(
        `Quản lý ${assignerName} đã GIAO VIỆC TRỰC TIẾP "${newTaskData.name}" cho ${assignedEng.name}`,
        finalProjectCode
      );

      if (store.addNotification) {
        const taskIdParam = createdTaskId ? `taskId=${encodeURIComponent(createdTaskId)}&` : '';
        await store.addNotification({
          title: `Giao việc: ${newTaskData.name}`,
          message: `${assignerName} đã giao công việc trực tiếp "${newTaskData.name}" [${finalProjectName}] cho bạn${directDueDate ? ` (Hạn: ${directDueDate})` : ''}.`,
          link: `/my-tasks?${taskIdParam}highlight=${encodeURIComponent(newTaskData.name)}&category=direct`,
          type: `task_assigned:::${assignedEng.id}:::${assignedEng.name}`,
          icon: 'assignment_ind',
          senderId: assignerId,
          senderName: assignerName
        });

        if (directFollowerIds.length > 0) {
          await store.addNotification({
            title: `Theo dõi công việc: ${newTaskData.name}`,
            message: `${assignerName} đã thêm bạn vào danh sách THEO DÕI công việc "${newTaskData.name}" (phụ trách: ${assignedEng.name}) [${finalProjectName}].`,
            link: `/my-tasks?${taskIdParam}highlight=${encodeURIComponent(newTaskData.name)}&category=direct`,
            type: `task_follower:::${directFollowerIds.join(',')}:::${followerNames.join(',')}`,
            icon: 'visibility',
            senderId: assignerId,
            senderName: assignerName
          });
        }
      }

      triggerToast(`Đã giao việc thành công cho ${assignedEng.name}!`, 'success');
      setDirectTaskName('');
      setDirectNotes('');
      setDirectDueDate('');
      setDirectFile(null);
      setDirectFollowerIds([]);
      setDirectShowAttachMenu(false);
      setIsDirectModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi tạo công việc trực tiếp:', err);
      triggerToast('Lỗi khi giao việc. Vui lòng thử lại!', 'warning');
    } finally {
      setSavingDirectTask(false);
    }
  };

  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteDirectTask = (taskId: string, taskName: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (target && !canDeleteTask(user, target)) {
      triggerToast('Người theo dõi và người nhận việc không có quyền xóa công việc!', 'warning');
      return;
    }
    setTaskToDelete({ id: taskId, name: taskName });
  };

  const handleConfirmDeleteTask = () => {
    if (!taskToDelete) return;
    const store = useRealtimeStore.getState();
    store.deleteTask(taskToDelete.id);
    triggerToast(`Đã xóa công việc "${taskToDelete.name}"!`, 'success');
    setTaskToDelete(null);
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
    const qTab = searchParams.get('tab') as 'project_tasks' | 'unassigned' | 'assigned' | 'completed' | 'direct' | 'my-tasks' | null;
    if (qTab === 'direct') {
      setActiveTab('direct');
    } else if (qTab === 'unassigned' || qTab === 'assigned') {
      setActiveTab('project_tasks');
      setProjectFilterStatus('unassigned');
    } else if (qTab === 'completed') {
      setActiveTab('project_tasks');
      setProjectFilterStatus('completed');
    } else if (qTab === 'project_tasks') {
      setActiveTab('project_tasks');
    } else if ((location.state as any)?.tab) {
      const stTab = (location.state as any).tab;
      if (stTab === 'direct') {
        setActiveTab('direct');
      } else {
        setActiveTab('project_tasks');
        setProjectFilterStatus('unassigned');
      }
    }
    if (highlightedTaskId || highlightKeyword) {
      setIsHighlightActive(true);
    }
  }, [location.state, searchParams, highlightedTaskId, highlightKeyword]);

  // Initial fetch for tasks (live sync is handled by Supabase Realtime)
  useEffect(() => {
    useRealtimeStore.getState().fetchTasks(undefined);
  }, []);

  // Danh sách công việc dự án (không bao gồm việc nội bộ / trực tiếp)
  const projectAllTasks = useMemo(() => {
    return tasks.filter(t => !t.isSectionHeader && !(
      t.sectionName === 'Giao việc trực tiếp' ||
      t.projectCode === 'COMPANY' ||
      (t.code && t.code.startsWith('TASK-DIRECT'))
    ));
  }, [tasks]);

  const projectKpiStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let list = projectAllTasks;
    if (filterProjectCode !== 'all') {
      list = list.filter(t => t.projectCode === filterProjectCode);
    }
    const total = list.length;
    const unassigned = list.filter(t => !t.assignedEngineerId || t.status === 'Chưa làm').length;
    const pending = list.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc').length;
    const inProgress = list.filter(t => t.status === 'Đang làm').length;
    const review = list.filter(t => t.status === 'Chờ nghiệm thu').length;
    const completed = list.filter(t => t.status === 'Hoàn thành' || t.isDone).length;
    const overdue = list.filter(t => {
      if (t.status === 'Hoàn thành' || t.isDone) return false;
      if (!t.dueDate) return false;
      return String(t.dueDate).split('T')[0] < todayStr;
    }).length;

    return { total, unassigned, pending, inProgress, review, completed, overdue };
  }, [projectAllTasks, filterProjectCode]);

  const projectDisplayedTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let list = projectAllTasks;

    if (filterProjectCode !== 'all') {
      list = list.filter(t => t.projectCode === filterProjectCode);
    }

    if (projectFilterStatus === 'unassigned') {
      list = list.filter(t => !t.assignedEngineerId || t.status === 'Chưa làm');
    } else if (projectFilterStatus === 'pending') {
      list = list.filter(t => t.status === 'Chờ nhận việc' || t.status === 'Có thắc mắc');
    } else if (projectFilterStatus === 'in_progress') {
      list = list.filter(t => t.status === 'Đang làm');
    } else if (projectFilterStatus === 'review') {
      list = list.filter(t => t.status === 'Chờ nghiệm thu');
    } else if (projectFilterStatus === 'completed') {
      list = list.filter(t => t.status === 'Hoàn thành' || t.isDone);
    } else if (projectFilterStatus === 'overdue') {
      list = list.filter(t => {
        if (t.status === 'Hoàn thành' || t.isDone) return false;
        if (!t.dueDate) return false;
        return String(t.dueDate).split('T')[0] < todayStr;
      });
    }

    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase().trim();
      list = list.filter(t => 
        t.name?.toLowerCase().includes(q) ||
        t.sectionName?.toLowerCase().includes(q) ||
        t.assignedEngineerName?.toLowerCase().includes(q) ||
        t.projectName?.toLowerCase().includes(q) ||
        t.projectCode?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      if (highlightedTaskId && a.id === highlightedTaskId) return -1;
      if (highlightedTaskId && b.id === highlightedTaskId) return 1;

      const timeA = a.updatedAt || a.createdAt ? new Date(a.updatedAt || a.createdAt!).getTime() : 0;
      const timeB = b.updatedAt || b.createdAt ? new Date(b.updatedAt || b.createdAt!).getTime() : 0;
      return timeB - timeA;
    });
  }, [projectAllTasks, filterProjectCode, projectFilterStatus, projectSearch, highlightedTaskId]);

  // Trạng thái thu gọn / mở rộng nhóm dự án
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const toggleCollapseProject = (pCode: string) => {
    setCollapsedProjects(prev => ({ ...prev, [pCode]: !prev[pCode] }));
  };

  // Nhóm công việc theo từng dự án để hiển thị tinh gọn, không lặp lại cột Dự án
  const groupedProjectTasks = useMemo(() => {
    const map = new Map<string, typeof projectDisplayedTasks>();
    projectDisplayedTasks.forEach(t => {
      const pCode = t.projectCode || 'OTHER';
      if (!map.has(pCode)) {
        map.set(pCode, []);
      }
      map.get(pCode)!.push(t);
    });

    const groups: { project: { code: string; name: string }; tasks: typeof projectDisplayedTasks }[] = [];
    map.forEach((tList, pCode) => {
      const proj = projects.find(p => p.code === pCode) || { code: pCode, name: tList[0]?.projectName || pCode };
      groups.push({ project: proj, tasks: tList });
    });

    return groups;
  }, [projectDisplayedTasks, projects]);

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
  }, [isHighlightActive, highlightedTaskId, highlightKeyword, projectDisplayedTasks, directDisplayedTasks]);

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length > 0) {
      setSelectedTaskIds([]);
    } else if (groupedProjectTasks.length > 0) {
      setSelectedTaskIds(groupedProjectTasks[0].tasks.map(t => t.id));
    }
  };

  const handleToggleProjectGroup = (groupTasks: typeof projectDisplayedTasks) => {
    const groupIds = groupTasks.map(t => t.id);
    const isAllGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedTaskIds.includes(id));
    if (isAllGroupSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleToggleTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (!selectedEngineerId) {
      triggerToast('Vui lòng chọn kỹ sư / nhân sự!', 'warning');
      return;
    }
    if (selectedTaskIds.length === 0) {
      triggerToast('Vui lòng chọn ít nhất 1 hạng mục!', 'warning');
      return;
    }

    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    const readyTasks = selectedTasks.filter(t => isTaskReadyForAssignment(t, materialPlans).ready);
    const unreadyCount = selectedTasks.length - readyTasks.length;

    if (readyTasks.length === 0) {
      triggerToast('Tất cả các công việc được chọn đều chưa đủ điều kiện giao việc (Yêu cầu: "Đáp ứng" và "Đã có hàng")!', 'warning');
      return;
    }

    if (unreadyCount > 0) {
      triggerToast(`Đã bỏ qua ${unreadyCount} công việc chưa đủ điều kiện (Chưa "Đáp ứng" & "Đã có hàng").`, 'warning');
    }

    const eng = engineers.find(e => e.id === selectedEngineerId);
    const engName = eng ? eng.name : '';
    const assignerId = user?.id || '';
    const assignerName = user?.name || user?.username || 'Quản lý';

    const followerEngs = engineers.filter(e => batchFollowerIds.includes(e.id));
    const followerNames = followerEngs.map(e => e.name);

    readyTasks.forEach(task => {
      const id = task.id;
      const existingTask = task;
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
        followerIds: batchFollowerIds.length > 0 ? batchFollowerIds : undefined,
        followerNames: followerNames.length > 0 ? followerNames : undefined,
        assignerId: assignerId,
        assignerName: assignerName,
        status: 'Chờ nhận việc',
        notes: updatedNotes
      });
    });

    const store = useRealtimeStore.getState();
    store.logActivity(`Quản lý ${assignerName} đã GIAO ${readyTasks.length} CÔNG VIỆC cho ${engName}`, 'Hệ thống');

    if (store.addNotification) {
      store.addNotification({
        title: `Giao việc: ${engName}`,
        message: `${assignerName} đã giao ${readyTasks.length} công việc mới cho ${engName}${assignNote.trim() ? `: "${assignNote.trim()}"` : ''}${selectedFile ? (selectedFile.type === 'image' ? ' [Kèm 1 hình ảnh]' : ` [Kèm tệp: ${selectedFile.name}]`) : '.'}`,
        link: '/my-tasks?tab=pending&category=project',
        type: `task_assigned:::${selectedEngineerId}:::${engName}`,
        icon: 'assignment_ind',
        senderId: assignerId,
        senderName: assignerName
      });

      if (batchFollowerIds.length > 0) {
        store.addNotification({
          title: `Theo dõi ${selectedTaskIds.length} công việc mới`,
          message: `${assignerName} đã thêm bạn vào danh sách THEO DÕI ${selectedTaskIds.length} công việc giao cho ${engName}.`,
          link: '/my-tasks?category=project',
          type: `task_follower:::${batchFollowerIds.join(',')}:::${followerNames.join(',')}`,
          icon: 'visibility',
          senderId: assignerId,
          senderName: assignerName
        });
      }
    }

    triggerToast(`Đã giao ${selectedTaskIds.length} hạng mục cho ${engName}!`, 'success');
    setSelectedTaskIds([]);
    setIsModalOpen(false);
    setSelectedEngineerId('');
    setBatchFollowerIds([]);
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

  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm' || user?.username === 'admin';
  const canAccessAssignment = isAdmin || hasPermission(user, 'ASSIGN_TASKS');

  if (!canAccessAssignment) {
    return <Navigate to="/my-tasks" replace />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="border-b border-slate-200 bg-white shadow-sm px-3 md:px-6 md:pr-20 py-2.5 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 md:gap-2 relative z-50 shrink-0 no-drag-region electron-no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 w-full md:w-auto min-w-0">
          <div className="flex items-center justify-between gap-2 shrink-0 h-7 sm:h-8 md:h-auto pr-12 md:pr-0">
            <h1 className="page-title text-sm md:text-base font-extrabold text-slate-900 border-l-4 border-primary pl-2 shrink-0">
              Công việc
            </h1>
          </div>
          <SharedTaskTabs activeTab={activeTab as any} onTabChange={(t) => { setActiveTab(t as any); setSelectedTaskIds([]); }} />
        </div>
      </div>

      {activeTab === 'direct' ? (
        /* GIAO DIỆN GIAO VIỆC TRỰC TIẾP / VIỆC PHÁT SINH (EDGE-TO-EDGE & TỐI ƯU MOBILE) */
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          
          {/* Thanh Filter & Search & Nút Giao việc */}
          <div className="border-b border-slate-200 bg-white px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
            {/* Filter Status Chips */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setDirectFilterStatus('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({directKpiStats.total})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('pending')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'pending' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Chờ nhận ({directKpiStats.pending})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('in_progress')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'in_progress' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đang làm ({directKpiStats.inProgress})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('review')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'review' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Chờ nghiệm thu ({directKpiStats.review})
              </button>
              <button
                type="button"
                onClick={() => setDirectFilterStatus('completed')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  directFilterStatus === 'completed' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hoàn thành ({directKpiStats.completed})
              </button>
              {directKpiStats.overdue > 0 && (
                <button
                  type="button"
                  onClick={() => setDirectFilterStatus('overdue')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    directFilterStatus === 'overdue' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Trễ hạn ({directKpiStats.overdue})
                </button>
              )}
            </div>

            {/* Actions: Search & Nút Giao việc */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-nowrap">
              <div className="relative flex-1 sm:w-60 md:w-72 lg:w-80 sm:flex-initial">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">search</span>
                <input
                  type="text"
                  value={directSearch}
                  onChange={(e) => setDirectSearch(e.target.value)}
                  placeholder="Tìm nội dung, người nhận, ghi chú..."
                  className="w-full pl-8 pr-7 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white h-[32px] font-medium"
                />
                {directSearch && (
                  <button
                    type="button"
                    onClick={() => setDirectSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDirectModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer bg-primary text-white hover:bg-primary/90 h-[32px]"
                title="Giao việc"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span className="hidden sm:inline">Giao việc</span>
              </button>
            </div>
          </div>

          {/* Bảng Danh sách Công việc Đã giao Trực tiếp tràn viền edge-to-edge */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-white" onScroll={handleTableScroll}>
            <table className="w-full text-left border-collapse text-xs min-w-[950px]">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className="py-2.5 px-3 w-36 border-r border-slate-200">Dự án</th>
                  <th className="py-2.5 px-4 border-r border-slate-200">Nội dung công việc</th>
                  <th className="py-2.5 px-3 w-36 border-r border-slate-200">Người nhận việc</th>
                  <th className="py-2.5 px-3 w-36 border-r border-slate-200">Người theo dõi</th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200">Hạn chót</th>
                  <th className="py-2.5 px-3 w-20 text-center border-r border-slate-200">Ưu tiên</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">Trạng thái</th>
                  <th className="py-2.5 px-3 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {directDisplayedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Không có công việc phát sinh nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  directDisplayedTasks.map((t) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isOverdue = t.dueDate && String(t.dueDate).split('T')[0] < todayStr && t.status !== 'Hoàn thành' && !t.isDone;

                    return (
                      <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {t.projectCode ? (
                            <span 
                              onClick={() => navigate(`/projects/${encodeURIComponent(t.projectCode)}/tasks?taskId=${encodeURIComponent(t.id)}&highlight=${encodeURIComponent(t.name)}`)}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 hover:underline font-bold text-[10px] border border-blue-200 cursor-pointer inline-flex items-center gap-1 transition-colors"
                              title="Bấm để xem trong bảng Tiến độ công việc dự án"
                            >
                              <span>{projects.find(p => p.code === t.projectCode)?.name || t.projectName || t.projectCode}</span>
                              <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                              Chưa gán dự án
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-200">
                          <div 
                            onClick={() => {
                              if (t.projectCode) {
                                navigate(`/projects/${encodeURIComponent(t.projectCode)}/tasks?taskId=${encodeURIComponent(t.id)}&highlight=${encodeURIComponent(t.name)}`);
                              }
                            }}
                            className={`font-bold text-slate-900 text-xs ${t.projectCode ? 'hover:text-primary hover:underline cursor-pointer transition-colors' : ''}`}
                            title={t.projectCode ? 'Bấm để mở công việc trong bảng Tiến độ dự án' : undefined}
                          >
                            {t.name}
                          </div>
                          {(() => {
                            const latestDisc = getLatestDiscussion(t.notes, t.issue);
                            const cleanNote = stripDiscussionThread(t.notes)
                              .replace(/\[FOLLOWERS:[^\]]*\]/gi, '')
                              .replace(/\[\d{4}-\d{2}-\d{2}[^\]]*\]/g, '')
                              .trim();
                            const discContent = latestDisc?.content?.replace(/\[FOLLOWERS:[^\]]*\]/gi, '').trim() || '';
                            const displayNote = discContent || cleanNote;
                            const hasFile = latestDisc?.fileUrl || latestDisc?.fileName;
                            if (!displayNote && !hasFile) return null;
                            return (
                              <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-slate-400 shrink-0">
                                  {hasFile ? 'attach_file' : 'notes'}
                                </span>
                                <span className="truncate">
                                  {displayNote || (latestDisc?.fileName ? `Tệp đính kèm: ${latestDisc.fileName}` : 'Có ghi chú đính kèm')}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                              {t.assignedEngineerName?.[0] || 'N'}
                            </span>
                            <span className="truncate">{t.assignedEngineerName?.split('|')[0] || 'Chưa giao'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {(() => {
                            const followers = getTaskFollowerNames(t, engineers);
                            return followers.length > 0 ? (
                              <div className="flex flex-wrap gap-1" title={followers.join(', ')}>
                                {followers.map((fn: string, fIdx: number) => (
                                  <span
                                    key={fIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200"
                                  >
                                    <span className="material-symbols-outlined text-[11px] text-blue-600">visibility</span>
                                    <span>{fn}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-normal text-[11px]">—</span>
                            );
                          })()}
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {t.priority === 'High' ? 'Cao' : t.priority === 'Low' ? 'Thấp' : 'Chuẩn'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold inline-block bg-slate-100 text-slate-700 border border-slate-200">
                            {t.status || 'Chờ nhận việc'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canApproveTask(user, t) && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickApprove(e, t)}
                                className="p-1 bg-slate-900 hover:bg-slate-800 text-white rounded shadow-xs transition-colors"
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
                            {canDeleteTask(user, t) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDirectTask(t.id, t.name)}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Xóa công việc"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            )}
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
        /* GIAO DIỆN BẢNG CÔNG VIỆC DỰ ÁN (SUB-TABS & EDGE-TO-EDGE) */
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          
          {/* Thanh Filter & Search & Action đồng bộ */}
          <div className="border-b border-slate-200 bg-white px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
            {/* Filter Status Chips */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setProjectFilterStatus('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  projectFilterStatus === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({projectKpiStats.total})
              </button>
              <button
                type="button"
                onClick={() => setProjectFilterStatus('unassigned')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  projectFilterStatus === 'unassigned' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cần phân công ({projectKpiStats.unassigned})
              </button>
              <button
                type="button"
                onClick={() => setProjectFilterStatus('pending')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  projectFilterStatus === 'pending' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Chờ nhận ({projectKpiStats.pending})
              </button>
              <button
                type="button"
                onClick={() => setProjectFilterStatus('in_progress')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  projectFilterStatus === 'in_progress' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đang làm ({projectKpiStats.inProgress})
              </button>
              <button
                type="button"
                onClick={() => setProjectFilterStatus('review')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  projectFilterStatus === 'review' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Chờ nghiệm thu ({projectKpiStats.review})
              </button>
              <button
                type="button"
                onClick={() => setProjectFilterStatus('completed')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  projectFilterStatus === 'completed' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hoàn thành ({projectKpiStats.completed})
              </button>
              {projectKpiStats.overdue > 0 && (
                <button
                  type="button"
                  onClick={() => setProjectFilterStatus('overdue')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    projectFilterStatus === 'overdue' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Trễ hạn ({projectKpiStats.overdue})
                </button>
              )}
            </div>

            {/* Actions & Filters: Giao việc button (if unassigned), Project Dropdown, Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              {projectFilterStatus === 'unassigned' && (
                <button 
                  disabled={selectedTaskIds.length === 0}
                  onClick={() => setIsModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold shadow-xs transition-all whitespace-nowrap shrink-0 ${
                    selectedTaskIds.length > 0 ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">send</span>
                  Giao {selectedTaskIds.length > 0 ? selectedTaskIds.length : ''} việc
                </button>
              )}

              <CustomSelect 
                value={filterProjectCode} 
                onChange={(e) => setFilterProjectCode(e.target.value)}
                searchable={true}
                className="w-full sm:w-[190px] md:w-[210px] h-[32px] text-xs font-semibold bg-white shrink-0"
              >
                <option value="all">-- Tất cả Dự án --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.code}>{p.name}</option>
                ))}
              </CustomSelect>

              <div className="relative w-full sm:w-60 md:w-72 lg:w-80 shrink-0">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">search</span>
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Tìm việc dự án..."
                  className="w-full pl-8 pr-7 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white h-[32px] font-medium"
                />
                {projectSearch && (
                  <button
                    type="button"
                    onClick={() => setProjectSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bảng Danh sách Công việc Dự án tràn viền edge-to-edge */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-white" onScroll={handleTableScroll}>
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  {projectFilterStatus === 'unassigned' && (
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200"></th>
                  )}
                  <th className="py-2.5 px-4 border-r border-slate-200">Nội dung công việc</th>
                  <th className="py-2.5 px-3 w-36 border-r border-slate-200">Người phụ trách</th>
                  <th className="py-2.5 px-3 w-36 border-r border-slate-200">Người theo dõi</th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200">Khối lượng</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">Trạng thái</th>
                  <th className="py-2.5 px-4 w-36 border-r border-slate-200 text-center">Người cập nhật</th>
                  <th className="py-2.5 px-3 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {groupedProjectTasks.length === 0 ? (
                  <tr>
                    <td colSpan={projectFilterStatus === 'unassigned' ? 8 : 7} className="py-8 text-center text-slate-400 italic">
                      Không có công việc dự án nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  groupedProjectTasks.map((group) => {
                    const isCollapsed = Boolean(collapsedProjects[group.project.code]);
                    const completedCount = group.tasks.filter(t => t.isDone || t.status === 'Hoàn thành').length;
                    const inProgressCount = group.tasks.filter(t => t.status === 'Đang làm').length;

                    return (
                      <React.Fragment key={group.project.code}>
                        {/* Dòng Tiêu đề Phân nhóm theo Dự án */}
                        <tr className="bg-slate-100/95 hover:bg-slate-200/80 transition-colors border-y border-slate-300 sticky top-[33px] z-[5] select-none">
                          {projectFilterStatus === 'unassigned' && (
                            <td className="py-2 px-3 w-10 text-center border-r border-slate-200">
                              <input
                                type="checkbox"
                                className="w-4 h-4 cursor-pointer accent-primary"
                                checked={group.tasks.length > 0 && group.tasks.every(t => selectedTaskIds.includes(t.id))}
                                onChange={() => handleToggleProjectGroup(group.tasks)}
                                title="Chọn tất cả công việc của dự án này"
                              />
                            </td>
                          )}
                          <td colSpan={7} className="py-2 px-3">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCollapseProject(group.project.code)}
                                className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-slate-800 hover:text-primary transition-colors text-left cursor-pointer"
                              >
                                <span className={`material-symbols-outlined text-slate-500 text-[18px] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                                  expand_more
                                </span>
                                <span className="material-symbols-outlined text-primary text-[18px]">folder_open</span>
                                <span>{group.project.name}</span>
                              </button>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-bold border border-blue-200">
                                  {group.tasks.length} công việc
                                </span>
                                {completedCount > 0 && (
                                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                    ✓ {completedCount} xong
                                  </span>
                                )}
                                {inProgressCount > 0 && (
                                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                    ⚡ {inProgressCount} đang làm
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Danh sách công việc thuộc nhóm dự án */}
                        {!isCollapsed && group.tasks.map((t, tIdx) => {
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
                              className={`transition-colors cursor-pointer group ${
                                isTargetTask 
                                  ? 'highlighted-task-assignment-row bg-amber-100/60 hover:bg-amber-100/80 border-l-4 border-l-amber-500' 
                                  : isChecked && projectFilterStatus === 'unassigned' 
                                    ? 'bg-blue-50/70' 
                                    : 'hover:bg-blue-50/40'
                              }`}
                              onClick={() => handleRowClick(t, p?.code || t.projectCode)}
                              title="Nhấn vào dòng này để xem chi tiết công việc trong dự án"
                            >
                              {projectFilterStatus === 'unassigned' && (
                                <td className="py-2.5 px-3 text-center border-r border-slate-200 w-10" onClick={e => e.stopPropagation()}>
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 accent-primary cursor-pointer"
                                    checked={isChecked}
                                    title="Chọn để giao việc"
                                    onChange={() => handleToggleTask(t.id)}
                                  />
                                </td>
                              )}
                              <td className="py-2.5 px-4 border-r border-slate-200">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span className="font-bold text-slate-900 group-hover:text-primary transition-colors text-xs">{t.name}</span>
                                    {!isTaskReadyForAssignment(t, materialPlans).ready && (
                                      <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded shrink-0 whitespace-nowrap" title={isTaskReadyForAssignment(t, materialPlans).reason}>
                                        Chưa đủ ĐK giao
                                      </span>
                                    )}
                                  </div>
                                  <span className="material-symbols-outlined text-[15px] text-slate-300 group-hover:text-primary transition-colors shrink-0" title="Đi đến dự án">
                                    arrow_forward
                                  </span>
                                </div>
                                {t.sectionName && t.sectionName !== t.name && (
                                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{t.sectionName}</div>
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
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                {t.assignedEngineerName ? (
                                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                                      {t.assignedEngineerName[0]}
                                    </span>
                                    <span className="truncate">{t.assignedEngineerName.split('|')[0]}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-normal italic">Chưa phân công</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                {(() => {
                                  const followers = getTaskFollowerNames(t, engineers);
                                  return followers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1" title={followers.join(', ')}>
                                      {followers.map((fn: string, fIdx: number) => (
                                        <span
                                          key={fIdx}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200"
                                        >
                                          <span className="material-symbols-outlined text-[11px] text-blue-600">visibility</span>
                                          <span>{fn}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic font-normal text-[11px]">—</span>
                                  );
                                })()}
                              </td>
                              <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-700 font-bold">
                                {t.volume || '-'} {t.unit || ''}
                              </td>
                              <td className="py-2.5 px-3 text-center border-r border-slate-200">
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold inline-block bg-slate-100 text-slate-700 border border-slate-200">
                                  {t.status || 'Chưa làm'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-200 text-center">
                                <AuditInfoCell updatedBy={t.updatedBy} updatedAt={t.updatedAt} />
                              </td>
                              <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {canApproveTask(user, t) && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickApprove(e, t)}
                                      className="p-1 bg-slate-900 hover:bg-slate-800 text-white rounded shadow-xs transition-colors"
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
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>


        </div>
      )}

      {/* Modal Giao việc trực tiếp / Phát sinh */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_task</span>
                Giao việc phát sinh
              </h2>
              <button 
                type="button"
                onClick={() => setIsDirectModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateDirectTask} className="flex flex-col">
              <div className="p-5 sm:p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                
                {/* Tên công việc */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    Nội dung công việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={directTaskName}
                    onChange={(e) => setDirectTaskName(e.target.value)}
                    placeholder="VD: Kiểm tra tình trạng vật tư kho, Soạn hợp đồng dịch vụ..."
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium h-[38px]"
                  />
                </div>

                {/* Thuộc Dự án (Riêng 1 dòng) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    Dự án
                  </label>
                  <CustomSelect
                    value={directProjectCode}
                    onChange={(e) => setDirectProjectCode(e.target.value)}
                    searchable={true}
                    className="w-full h-[38px] text-xs sm:text-sm font-medium text-slate-800 bg-white"
                  >
                    <option value="COMPANY">Nội bộ Công ty / Văn phòng</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </CustomSelect>
                </div>

                {/* Hàng 2 cột: Người nhận việc & Người theo dõi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Chọn nhân sự nhận việc */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-700">
                      Người nhận việc <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={directEngineerId}
                      onChange={(e) => setDirectEngineerId(e.target.value)}
                      searchable={true}
                      placeholder="-- Chọn nhân sự --"
                      className="w-full h-[38px] text-xs sm:text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="">-- Chọn nhân sự --</option>
                      {engineers.map(eng => (
                        <option key={eng.id} value={eng.id}>
                          {eng.name} {eng.title ? `(${eng.title})` : ''}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>

                  {/* Người theo dõi */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                      <span>Người theo dõi</span>
                      <span className="text-xs font-normal text-slate-400">(Tùy chọn)</span>
                    </label>
                    <CustomSelect
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !directFollowerIds.includes(val)) {
                          setDirectFollowerIds(prev => [...prev, val]);
                        }
                      }}
                      searchable={true}
                      placeholder="+ Thêm người theo dõi..."
                      className="w-full h-[38px] text-xs sm:text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="">+ Thêm người theo dõi...</option>
                      {engineers
                        .filter(eng => eng.id !== directEngineerId && !directFollowerIds.includes(eng.id))
                        .map(eng => (
                          <option key={eng.id} value={eng.id}>
                            {eng.name} {eng.title ? `(${eng.title})` : ''}
                          </option>
                        ))}
                    </CustomSelect>
                    {directFollowerIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {directFollowerIds.map(fid => {
                          const eng = engineers.find(e => e.id === fid);
                          return (
                            <span
                              key={fid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold"
                            >
                              <span>{eng?.name || fid}</span>
                              <button
                                type="button"
                                onClick={() => setDirectFollowerIds(prev => prev.filter(id => id !== fid))}
                                className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                              >✕</button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hạn hoàn thành (Deadline) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-700">
                      Hạn hoàn thành (Deadline)
                    </label>
                    <input
                      type="date"
                      value={directDueDate}
                      onChange={(e) => setDirectDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white font-medium h-[38px]"
                    />
                  </div>

                  {/* Mức độ ưu tiên */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-700">
                      Mức độ ưu tiên
                    </label>
                    <CustomSelect
                      value={directPriority}
                      onChange={(e) => setDirectPriority(e.target.value as any)}
                      className="w-full h-[38px] text-xs sm:text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="Low">Thấp</option>
                      <option value="Medium">Trung bình</option>
                      <option value="High">Ưu tiên cao / Gấp</option>
                    </CustomSelect>
                  </div>
                </div>

                {/* Ghi chú & Đính kèm */}
                <div className="flex flex-col gap-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
                      Ghi chú / Hướng dẫn công việc (Tùy chọn)
                    </label>
                    <button
                      type="button"
                      onClick={() => setDirectShowAttachMenu(!directShowAttachMenu)}
                      className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                        directShowAttachMenu ? 'bg-blue-100 border-blue-300 text-primary' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">attach_file</span>
                      <span>{directFile ? 'Đã đính kèm' : 'Đính kèm'}</span>
                    </button>
                  </div>

                  {directFile && (
                    <div className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-lg text-xs text-blue-900 border border-blue-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                          {directFile.type === 'image' ? 'image' : 'attach_file'}
                        </span>
                        <span className="truncate font-medium">{directFile.name}</span>
                      </div>
                      <button type="button" onClick={() => setDirectFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer">✕</button>
                    </div>
                  )}

                  {directShowAttachMenu && (
                    <div className="relative">
                      <div className="fixed inset-0 z-40" onClick={() => setDirectShowAttachMenu(false)} />
                      <div className="absolute right-0 top-1 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => { setDirectShowAttachMenu(false); directCameraInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-primary rounded-lg text-left cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-[16px]">photo_camera</span>
                          <span>Chụp ảnh mới</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDirectShowAttachMenu(false); directImageInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-primary rounded-lg text-left cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-blue-600 text-[16px]">image</span>
                          <span>Thư viện ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDirectShowAttachMenu(false); directFileInputRef.current?.click(); }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-primary rounded-lg text-left cursor-pointer"
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

                  <textarea
                    rows={3}
                    value={directNotes}
                    onChange={(e) => setDirectNotes(e.target.value)}
                    onPaste={handleDirectPaste}
                    placeholder="Nhập hướng dẫn, yêu cầu hoặc lưu ý gửi cho nhân sự..."
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white resize-none"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)} 
                  className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white border border-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={savingDirectTask || isDirectUploading}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{savingDirectTask ? 'Đang gửi...' : 'Giao việc'}</span>
                </button>
              </div>
            </form>
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
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
                <CustomSelect 
                  value={selectedEngineerId} 
                  onChange={(e) => setSelectedEngineerId(e.target.value)}
                  searchable={true}
                  placeholder="-- Chọn nhân viên / kỹ sư --"
                  className="w-full h-[38px] text-sm bg-white font-medium"
                >
                  <option value="">-- Chọn nhân viên / kỹ sư --</option>
                  {assignableEngineers.map(e => (
                    <option key={e.id} value={e.id}>{e.name} {e.title ? `(${e.title})` : ''}</option>
                  ))}
                </CustomSelect>
                {assignableEngineers.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    * Dự án này chưa có nhân sự thành viên nào. Vui lòng thêm thành viên trong Quản lý dự án trước khi giao việc.
                  </p>
                )}
              </div>

              {/* Người theo dõi (Tùy chọn) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Người theo dõi</span>
                  <span className="text-xs font-normal text-slate-400">(Tùy chọn)</span>
                </label>
                <CustomSelect
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !batchFollowerIds.includes(val)) {
                      setBatchFollowerIds(prev => [...prev, val]);
                    }
                  }}
                  searchable={true}
                  placeholder="+ Thêm người theo dõi..."
                  className="w-full h-[38px] text-sm bg-white font-medium"
                >
                  <option value="">+ Thêm người theo dõi...</option>
                  {engineers
                    .filter(e => e.id !== selectedEngineerId && !batchFollowerIds.includes(e.id))
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.name} {e.title ? `(${e.title})` : ''}</option>
                    ))}
                </CustomSelect>
                {batchFollowerIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {batchFollowerIds.map(fid => {
                      const eng = engineers.find(e => e.id === fid);
                      return (
                        <span
                          key={fid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold"
                        >
                          <span>{eng?.name || fid}</span>
                          <button
                            type="button"
                            onClick={() => setBatchFollowerIds(prev => prev.filter(id => id !== fid))}
                            className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                          >✕</button>
                        </span>
                      );
                    })}
                  </div>
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
                    <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer">✕</button>
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
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white border border-slate-300 cursor-pointer">
                Hủy
              </button>
              <button onClick={handleAssign} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all flex items-center gap-2 cursor-pointer">
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
        currentUserId={user?.id}
        currentUserName={user?.name || user?.username}
        currentUserRole={user?.role}
        isAssigner={isUserTaskAssigner(user, discussionTask, engineers)}
        isAssignee={isUserTaskAssignee(user, discussionTask, engineers)}
        onSendReply={handleSendReply}
        onAccept={handleAcceptTask}
        onAcceptTask={handleAcceptTask}
      />

      <ConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Xác nhận xóa công việc"
        message={`Bạn có chắc chắn muốn xóa công việc "${taskToDelete?.name}"?`}
        confirmText="Xóa công việc"
        icon="delete"
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
