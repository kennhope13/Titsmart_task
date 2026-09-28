import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { api } from '../services/apiSupabase';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '../components/common/CustomSelect';
import * as XLSX from 'xlsx';

import { LeaveRequest, LeaveType } from '../types';

interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  projectId?: string;
  projectName?: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInImage?: string;
  checkOutImage?: string;
  notes?: string;
}

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
};

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
};

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
};

const getDuration = (checkIn: string, checkOut?: string) => {
  if (!checkOut) return '—';
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const { projects, engineers, addNotification } = useRealtimeStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  // Cho phép Quản lý (Cấp 2), Người duyệt (APPROVE_LEAVE_STEP1/FINAL) và Admin xem 'Tất cả' để duyệt
  const canViewAll = React.useMemo(() => {
    if (!user) return false;
    const roleStr = String(user.role || '').toLowerCase();
    const titleStr = String((user as any).title || '').toLowerCase();
    const usernameStr = String(user.username || '').toLowerCase();
    const perms = Array.isArray(user.permissions) ? user.permissions : [];

    return (
      isAdmin ||
      usernameStr === 'admin' ||
      roleStr.includes('admin') ||
      roleStr.includes('quản trị') ||
      roleStr.includes('quản lý') ||
      roleStr.includes('manager') ||
      roleStr.includes('pm') ||
      roleStr.includes('trưởng') ||
      roleStr.includes('chỉ huy') ||
      roleStr.includes('giám đốc') ||
      titleStr.includes('quản lý') ||
      titleStr.includes('trưởng') ||
      titleStr.includes('chỉ huy') ||
      titleStr.includes('pm') ||
      perms.includes('APPROVE_LEAVE_STEP1' as any) ||
      perms.includes('APPROVE_LEAVE_FINAL' as any) ||
      perms.includes('VIEW_ALL_ATTENDANCE' as any) ||
      perms.includes('MANAGE_ATTENDANCE' as any) ||
      perms.includes('MANAGE_USERS' as any) ||
      perms.includes('ASSIGN_TASKS' as any) ||
      perms.includes('VIEW_PROJECTS' as any)
    );
  }, [user, isAdmin]);

  const [mainTab, setMainTab] = useState<'attendance' | 'leave'>('attendance');
  const [highlightLeaveId, setHighlightLeaveId] = useState<string | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<AttendanceLog | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'my' | 'all'>('my');
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [checkInImage, setCheckInImage] = useState<string | null>(null);
  const [checkOutImage, setCheckOutImage] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLeaveExportMenu, setShowLeaveExportMenu] = useState(false);

  // State cho Xin nghỉ phép
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Nghỉ phép năm');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [step1ReviewerId, setStep1ReviewerId] = useState('');
  const [step2ReviewerId, setStep2ReviewerId] = useState('');
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [reviewStep, setReviewStep] = useState<1 | 2>(1);
  const [reviewNote, setReviewNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkOutFileRef = useRef<HTMLInputElement>(null);

  // Danh sách Người duyệt Cấp 2 (Chỉ những người được cấp quyền Cấp 2 / APPROVE_LEAVE_STEP1, không bao gồm Cấp 1 / Admin)
  const step1Reviewers = React.useMemo(() => {
    return engineers.filter(eng => {
      if (eng.id === user?.id) return false;
      const perms = eng.permissions || [];
      const userStr = String((eng as any).username || '').toLowerCase();
      // Loại trừ Admin và người có quyền duyệt Cấp 1
      if (userStr === 'admin' || perms.includes('APPROVE_LEAVE_FINAL' as any)) return false;
      const roleStr = String(eng.role || eng.title || '').toLowerCase();
      return perms.includes('APPROVE_LEAVE_STEP1' as any) ||
        roleStr.includes('quản lý') ||
        roleStr.includes('trưởng') ||
        roleStr.includes('chỉ huy') ||
        roleStr.includes('pm');
    });
  }, [engineers, user]);

  // Danh sách Người duyệt Cấp 1 (Những người có quyền Cấp 1 / APPROVE_LEAVE_FINAL hoặc Admin)
  const step2Reviewers = React.useMemo(() => {
    return engineers.filter(eng => {
      const perms = eng.permissions || [];
      const roleStr = String(eng.role || eng.title || '').toLowerCase();
      const userStr = String((eng as any).username || '').toLowerCase();
      return perms.includes('APPROVE_LEAVE_FINAL' as any) ||
        userStr === 'admin' ||
        roleStr.includes('giám đốc') ||
        roleStr.includes('admin') ||
        roleStr.includes('quản trị viên') ||
        roleStr.includes('chủ tịch');
    });
  }, [engineers]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const viewParam = searchParams.get('view') || searchParams.get('type') || searchParams.get('scope');
    const leaveIdParam = searchParams.get('leaveId') || searchParams.get('id');
    const highlightParam = searchParams.get('highlight');
    if (tabParam === 'leave' || tabParam === 'leaves' || leaveIdParam || highlightParam) {
      setMainTab('leave');
      if (leaveIdParam) {
        setHighlightLeaveId(leaveIdParam);
        setIsHighlightActive(true);
      }
    } else if (tabParam === 'attendance') {
      setMainTab('attendance');
    }

    if (viewParam === 'all' || viewParam === 'tat-ca') {
      setTab('all');
    } else if (viewParam === 'my' || viewParam === 'cua-toi') {
      setTab('my');
    }
  }, [searchParams]);

  useEffect(() => {
    if (isHighlightActive && highlightLeaveId) {
      const timer = setTimeout(() => {
        const elem = document.querySelector('.highlighted-leave-row');
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
  }, [isHighlightActive, highlightLeaveId, leaves]);

  const handleExportExcel = (format: 'xlsx' | 'csv' | 'docx' = 'xlsx') => {
    if (!filteredLogs.length) return;
    const exportData = filteredLogs.map((log, index) => ({
      'STT': index + 1,
      'Ngày': formatDate(log.checkInTime),
      'Nhân viên': log.userName,
      'Giờ vào': formatTime(log.checkInTime),
      'Giờ ra': log.checkOutTime ? formatTime(log.checkOutTime) : 'Đang làm',
      'Thời gian': log.checkOutTime ? getDuration(log.checkInTime, log.checkOutTime) : '—',
      'Dự án': log.projectName || '',
      'Ghi chú': log.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ChamCong');
    const today = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      XLSX.writeFile(workbook, `BangChamCong_${today}.csv`, { bookType: 'csv' });
    } else if (format === 'docx') {
      XLSX.writeFile(workbook, `BangChamCong_${today}.docx`, { bookType: 'xlsx' });
    } else {
      XLSX.writeFile(workbook, `BangChamCong_${today}.xlsx`);
    }
  };

  const handleExportLeavesExcel = (format: 'xlsx' | 'csv' | 'docx' = 'xlsx') => {
    if (!leaves.length) return;
    const exportData = leaves.map((leave, index) => {
      let statusStr = 'Chờ duyệt';
      if (leave.status === 'PENDING_STEP1') statusStr = 'Chờ Quản lý duyệt';
      else if (leave.status === 'APPROVED_STEP1') statusStr = 'Quản lý đã duyệt - Chờ BGD phê duyệt';
      else if (leave.status === 'APPROVED') statusStr = 'Đã duyệt hoàn tất';
      else if (leave.status === 'REJECTED') statusStr = 'Từ chối';

      return {
        'STT': index + 1,
        'Nhân viên': leave.userName,
        'Loại nghỉ': leave.leaveType,
        'Từ ngày': formatDate(leave.startDate),
        'Đến ngày': formatDate(leave.endDate),
        'Số ngày': leave.totalDays,
        'Lý do': leave.reason,
        'Trạng thái': statusStr,
        'Quản lý duyệt': leave.step1ReviewerName ? `${leave.step1ReviewerName} (${leave.step1ReviewedAt ? 'Đã duyệt' : 'Chờ'})` : '—',
        'Ý kiến Quản lý': leave.step1ReviewNote || '',
        'Ban Giám Đốc duyệt': leave.step2ReviewerName || leave.reviewerName || '—',
        'Ý kiến Ban Giám Đốc': leave.step2ReviewNote || leave.reviewNote || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'XinNghiPheP');
    const today = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      XLSX.writeFile(workbook, `BangNghiPhep_${today}.csv`, { bookType: 'csv' });
    } else if (format === 'docx') {
      XLSX.writeFile(workbook, `BangNghiPhep_${today}.docx`, { bookType: 'xlsx' });
    } else {
      XLSX.writeFile(workbook, `BangNghiPhep_${today}.xlsx`);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = tab === 'my' && user
        ? await api.attendance.getByUser(user.id)
        : await api.attendance.getAll();
      setLogs(data);
      // Find active session for today
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySession = data.find((l: AttendanceLog) =>
          l.userId === user.id &&
          new Date(l.checkInTime) >= today &&
          !l.checkOutTime
        );
        setActiveSession(todaySession || null);
      }
    } catch (e) {
      console.error('Failed to fetch attendance logs', e);
    }
    setLoading(false);
  };

  const fetchLeaves = async () => {
    try {
      const data = tab === 'my' && user
        ? await api.leaves.getByUser(user.id)
        : await api.leaves.getAll();
      setLeaves(data);
    } catch (e) {
      console.error('Failed to fetch leave requests', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchLeaves();
    const channel = supabase.channel('attendance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        fetchLogs();
        fetchLeaves();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab]);

  const handleCreateLeave = async () => {
    if (!user || !leaveReason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const start = new Date(leaveStartDate);
      const end = new Date(leaveEndDate);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (!step1ReviewerId && !step2ReviewerId) {
        alert('Vui lòng chọn ít nhất 1 người duyệt (Quản lý hoặc Ban Giám Đốc)!');
        setIsSubmitting(false);
        return;
      }

      const step1Eng = engineers.find(e => e.id === step1ReviewerId);
      const step2Eng = engineers.find(e => e.id === step2ReviewerId);

      const newLeave = await api.leaves.create({
        userId: user.id,
        userName: user.name || user.username || 'Unknown',
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        totalDays: diffDays,
        reason: leaveReason.trim(),
        step1ReviewerId: step1ReviewerId || undefined,
        step1ReviewerName: step1Eng?.name || undefined,
        step2ReviewerId: step2ReviewerId || undefined,
        step2ReviewerName: step2Eng?.name || undefined,
      });

      setLeaves(prev => [newLeave, ...prev]);
      setShowLeaveModal(false);
      setLeaveReason('');
      setStep1ReviewerId('');
      setStep2ReviewerId('');

      // Xác định người nhận thông báo đầu tiên
      let targetRecipientId = '';
      let targetRecipientName = '';
      let targetMsgNote = '';

      if (step1Eng) {
        targetRecipientId = step1Eng.id;
        targetRecipientName = step1Eng.name;
        targetMsgNote = ` (chờ ${step1Eng.name} duyệt)`;
      } else if (step2Eng) {
        targetRecipientId = step2Eng.id;
        targetRecipientName = step2Eng.name;
        targetMsgNote = ` (chờ ${step2Eng.name} phê duyệt)`;
      }

      await addNotification({
        title: 'Đơn xin nghỉ phép mới',
        message: `${user.name} vừa tạo đơn xin ${leaveType.toLowerCase()} (${diffDays} ngày: từ ${formatDate(leaveStartDate)} đến ${formatDate(leaveEndDate)})${targetMsgNote}`,
        type: `leave_pending:::${targetRecipientId}:::${targetRecipientName}`,
        icon: 'event_busy',
        link: '/attendance?tab=leave',
      });
    } catch (e: any) {
      alert('Lỗi tạo đơn xin nghỉ: ' + (e.message || JSON.stringify(e)));
    }
    setIsSubmitting(false);
  };

  const handleReviewLeave = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewLeave || !user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Xác định trạng thái mới dựa trên reviewStep
      let finalStatus: 'APPROVED_STEP1' | 'APPROVED' | 'REJECTED' = status;
      if (status === 'APPROVED') {
        if (reviewStep === 1) {
          // Quản lý duyệt bước 1 -> Luôn chuyển lên Quản trị / Ban Giám Đốc duyệt bước cuối
          finalStatus = 'APPROVED_STEP1';
        } else {
          // Quản trị / Ban Giám Đốc phê duyệt -> Hoàn tất đơn
          finalStatus = 'APPROVED';
        }
      }

      const updated = await api.leaves.review(reviewLeave.id, {
        status: finalStatus,
        reviewerId: user.id,
        reviewerName: user.name || user.username || 'Admin',
        reviewNote: reviewNote.trim() || undefined,
        step: reviewStep,
      });

      setLeaves(prev => prev.map(l => l.id === reviewLeave.id ? updated : l));
      setReviewLeave(null);
      setReviewNote('');

      // Tiêu đề & nội dung & đối tượng nhận thông báo đích danh
      let notifTitle = '';
      let notifMsg = '';
      let notifType = '';

      if (finalStatus === 'APPROVED_STEP1') {
        // Quản lý đã duyệt -> Gửi thông báo đến Quản trị (step2Reviewer hoặc tất cả Admin) và nhân viên
        const step2Reviewer = engineers.find(e => e.id === reviewLeave.step2ReviewerId || e.name === reviewLeave.step2ReviewerName);
        const targetId = step2Reviewer ? `${step2Reviewer.id},admin,${reviewLeave.userId}` : `admin,${reviewLeave.userId}`;
        const targetName = step2Reviewer ? `${step2Reviewer.name},Quản trị viên,${reviewLeave.userName}` : `Quản trị viên,${reviewLeave.userName}`;

        notifTitle = 'Đơn nghỉ phép đã được Quản lý duyệt';
        notifMsg = `Đơn của ${reviewLeave.userName} đã được ${user.name} duyệt → Chờ ${reviewLeave.step2ReviewerName || 'Quản trị hệ thống'} phê duyệt.`;
        notifType = `leave_step1_approved:::${targetId}:::${targetName}`;
      } else if (finalStatus === 'APPROVED') {
        // Phê duyệt hoàn tất -> Gửi đích danh cho nhân viên làm đơn
        notifTitle = 'Đơn nghỉ phép đã được PHÊ DUYỆT';
        notifMsg = `Đơn xin ${reviewLeave.leaveType.toLowerCase()} của bạn đã được phê duyệt chính thức bởi ${user.name}.`;
        notifType = `leave_approved:::${reviewLeave.userId}:::${reviewLeave.userName}`;
      } else {
        // Từ chối -> Gửi đích danh cho nhân viên làm đơn
        notifTitle = 'Đơn nghỉ phép bị TỪ CHỐI';
        notifMsg = `Đơn xin ${reviewLeave.leaveType.toLowerCase()} của bạn đã bị từ chối bởi ${user.name}. Lý do: ${reviewNote.trim() || 'Không có lý do cụ thể'}`;
        notifType = `leave_rejected:::${reviewLeave.userId}:::${reviewLeave.userName}`;
      }

      await addNotification({
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        icon: finalStatus === 'REJECTED' ? 'cancel' : 'check_circle',
        link: '/attendance?tab=leave',
      });
    } catch (e: any) {
      alert('Lỗi duyệt đơn: ' + (e.message || JSON.stringify(e)));
    }
    setIsSubmitting(false);
  };

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn nghỉ phép này?')) return;
    try {
      await api.leaves.delete(id);
      setLeaves(prev => prev.filter(l => l.id !== id));
    } catch (e: any) {
      alert('Lỗi xóa đơn: ' + (e.message || JSON.stringify(e)));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `attendance/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from('titsmart-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('titsmart-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'in' | 'out') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      if (type === 'in') setCheckInImage(url);
      else setCheckOutImage(url);
    } catch (err: any) {
      console.error('Upload failed', err);
      alert('Lỗi tải ảnh: ' + (err.message || JSON.stringify(err)));
    }
    e.target.value = '';
  };

  const handleCheckIn = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const proj = projects.find(p => p.id === selectedProject);
      const result = await api.attendance.checkIn({
        userId: user.id,
        userName: user.name || user.username || 'Unknown',
        projectId: selectedProject || undefined,
        projectName: proj?.name,
        checkInImage: checkInImage || undefined,
        notes: notes || undefined,
      });
      setActiveSession(result);
      setLogs(prev => [result, ...prev]);
      setCheckInImage(null);
      setNotes('');
      setSelectedProject('');
      setShowCheckInModal(false);

      // Gửi thông báo realtime chỉ đến admin
      await addNotification({
        title: 'Chấm công vào ca',
        message: `${user.name} đã check-in${proj ? ` tại dự án ${proj.name}` : ''} lúc ${formatTime(result.checkInTime)}`,
        link: '/attendance?tab=attendance&view=all',
        type: 'attendance:::admin',
        icon: 'login',
      });
    } catch (e: any) {
      console.error('Check-in failed', e);
      alert('Lỗi chấm công: ' + (e.message || JSON.stringify(e)));
    }
    setIsSubmitting(false);
  };

  const handleCheckOut = async () => {
    if (!activeSession || !user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await api.attendance.checkOut(activeSession.id, {
        checkOutImage: checkOutImage || undefined,
        notes: checkOutNotes || undefined,
      });
      setActiveSession(null);
      setLogs(prev => prev.map(l => l.id === result.id ? result : l));
      setCheckOutImage(null);
      setCheckOutNotes('');
      setShowCheckOutModal(false);

      // Gửi thông báo realtime chỉ đến admin
      await addNotification({
        title: 'Chấm công ra ca',
        message: `${user.name} đã check-out lúc ${formatTime(result.checkOutTime)}. Thời gian làm việc: ${getDuration(result.checkInTime, result.checkOutTime)}`,
        link: '/attendance?tab=attendance&view=all',
        type: 'attendance:::admin',
        icon: 'logout',
      });
    } catch (e: any) {
      console.error('Check-out failed', e);
      alert('Lỗi check-out: ' + (e.message || JSON.stringify(e)));
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.attendance.delete(deleteId);
      setLogs(prev => prev.filter(l => l.id !== deleteId));
      if (activeSession?.id === deleteId) setActiveSession(null);
    } catch (e) { console.error(e); }
    setDeleteId(null);
  };

  // Filter logs
  const filteredLogs = logs.filter(l => {
    if (filterDate) {
      const logDate = new Date(l.checkInTime).toISOString().split('T')[0];
      if (logDate !== filterDate && l.checkOutTime) return false;
    }
    if (filterUser && l.userId !== filterUser) return false;
    return true;
  });

  const todayStr = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-2 py-1.5 md:py-0 md:h-12 flex items-center justify-between gap-1.5 shrink-0 pr-14 md:pr-4">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="border-l-4 border-primary pl-1.5 flex items-center">
            <h1 className="page-title text-xs sm:text-sm md:text-base font-extrabold text-slate-900 uppercase shrink-0">
              {mainTab === 'attendance' ? 'Chấm công' : 'Nghỉ phép'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setMainTab('attendance')}
              className={`px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 text-[11px] sm:text-xs font-bold rounded-md transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer select-none shrink-0 ${mainTab === 'attendance' ? 'bg-primary text-white shadow-xs font-black' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'}`}
            >
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">fingerprint</span>
              <span>Chấm công</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('leave')}
              className={`px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 text-[11px] sm:text-xs font-bold rounded-md transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer select-none shrink-0 ${mainTab === 'leave' ? 'bg-primary text-white shadow-xs font-black' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'}`}
            >
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">event_busy</span>
              <span>Xin nghỉ</span>
              {leaves.filter(l => l.status === 'PENDING').length > 0 && (
                <span className="ml-0.5 px-1 py-0.2 bg-red-500 text-white rounded-full text-[9px] font-extrabold">
                  {leaves.filter(l => l.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop-only Right controls (My/All switcher + Action Button) pushed to far right */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {canViewAll && (
            <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-bold shrink-0">
              <button
                onClick={() => setTab('my')}
                className={`px-2.5 py-1 rounded-md transition-all ${tab === 'my' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
              >Của tôi</button>
              <button
                onClick={() => setTab('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${tab === 'all' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
              >Tất cả</button>
            </div>
          )}

          {mainTab === 'attendance' ? (
            activeSession ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Đang làm
                </span>
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Ra ca
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                Vào ca
              </button>
            )
          ) : (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
              title="Tạo đơn xin nghỉ"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Tạo đơn xin nghỉ</span>
            </button>
          )}
        </div>
      </header>

      {mainTab === 'attendance' ? (
        <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col bg-slate-50">
          {/* Check-in / Check-out Bar (Mobile only) */}
          <div className="bg-white border-b border-slate-200 shadow-xs shrink-0 md:hidden">
            <div className="px-3 py-2 sm:px-4 sm:py-2 flex items-center justify-between gap-2">
              {canViewAll ? (
                <div className="inline-flex md:hidden items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setTab('my')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md text-[10px] sm:text-xs transition-all ${tab === 'my' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >Của tôi</button>
                  <button
                    onClick={() => setTab('all')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md text-[10px] sm:text-xs transition-all ${tab === 'all' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >Tất cả</button>
                </div>
              ) : <div />}

              {activeSession ? (
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Đang làm
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600">
                    <span className="hidden sm:inline">Giờ vào: </span>
                    <span className="font-bold text-slate-800">{formatDateTime(activeSession.checkInTime)}</span>
                  </p>
                  <button
                    onClick={() => setShowCheckOutModal(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">logout</span>
                    Ra ca
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCheckInModal(true)}
                  className="flex items-center gap-1.5 px-5 py-1.5 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">login</span>
                  Vào ca
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          {mainTab === 'attendance' && (
            <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center gap-3 shrink-0 shadow-xs relative z-10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_month</span>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 cursor-pointer" />
                {filterDate ? (
                  <button 
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer"
                    title="Hiển thị tất cả các ngày"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    Tất cả ngày
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 font-semibold italic">(Tất cả các ngày)</span>
                )}
              </div>
              {canViewAll && tab === 'all' && (
                <>
                  <div className="h-4 w-px bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                    <CustomSelect value={filterUser} onChange={e => setFilterUser(e.target.value)}
                      searchable={true}
                      className="px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 min-w-[150px]">
                      <option value="">Tất cả nhân viên</option>
                      {engineers.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </CustomSelect>
                  </div>
                </>
              )}
              <div className="ml-auto flex items-center gap-3">
                <div className="px-2.5 py-1 bg-slate-100 text-[11px] text-slate-600 font-bold rounded-full border border-slate-200">
                  {filteredLogs.length} bản ghi
                </div>
                {filteredLogs.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg border border-emerald-200 transition-colors shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      <span>Xuất file</span>
                      <span className="material-symbols-outlined text-xs">expand_more</span>
                    </button>
                    {showExportMenu && (
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    )}
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in duration-100">
                        <button
                          onClick={() => { setShowExportMenu(false); handleExportExcel('xlsx'); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                          Excel (.xlsx)
                        </button>
                        <button
                          onClick={() => { setShowExportMenu(false); handleExportExcel('csv'); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                          CSV (.csv)
                        </button>
                        <button
                          onClick={() => { setShowExportMenu(false); window.print(); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                          PDF (.pdf)
                        </button>
                        <button
                          onClick={() => { setShowExportMenu(false); handleExportExcel('docx'); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base text-blue-600">description</span>
                          Word (.docx)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Table Area */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-slate-500 text-[18px]">history</span>
              <h3 className="text-xs font-bold text-slate-700 uppercase">Lịch sử chấm công</h3>
            </div>

            <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Đang tải lịch sử chấm công...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Chưa có bản ghi chấm công nào.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase sticky top-0 z-10">
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3">Nhân viên</th>
                      <th className="p-3">Giờ vào</th>
                      <th className="p-3">Giờ ra</th>
                      <th className="p-3">Thời gian làm</th>
                      <th className="p-3">Dự án</th>
                      <th className="p-3">Ghi chú</th>
                      <th className="p-3 text-center">Hình ảnh</th>
                      {isAdmin && <th className="p-3 text-center w-12">TT</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{log.userName}</td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                          {formatDateTime(log.checkInTime)}
                        </td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                          {log.checkOutTime ? (
                            formatTime(log.checkOutTime)
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Đang làm
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 font-bold whitespace-nowrap">
                          {getDuration(log.checkInTime, log.checkOutTime)}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[200px] truncate" title={log.projectName}>
                          {log.projectName || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[200px] truncate" title={log.notes}>
                          {log.notes || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {log.checkInImage && (
                              <button onClick={() => setViewImage(log.checkInImage || null)} className="flex items-center gap-1 text-primary hover:text-blue-700 transition-colors bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[11px] font-bold">
                                <span className="material-symbols-outlined text-[12px]">image</span> Vào
                              </button>
                            )}
                            {log.checkOutImage && (
                              <button onClick={() => setViewImage(log.checkOutImage || null)} className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors bg-red-50 px-2 py-0.5 rounded border border-red-100 text-[11px] font-bold">
                                <span className="material-symbols-outlined text-[12px]">image</span> Ra
                              </button>
                            )}
                            {!log.checkInImage && !log.checkOutImage && <span className="text-slate-300 text-xs">—</span>}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-center whitespace-nowrap">
                            <button onClick={() => setDeleteId(log.id)} className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Tab Xin nghỉ phép */
        <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col bg-slate-50">
          {/* Unified Subheader Bar */}
          <div className="px-3 py-2 sm:px-4 sm:py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 shadow-xs relative z-10">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0">event_busy</span>
              <h3 className="text-xs font-bold text-slate-700 uppercase hidden sm:inline truncate">Danh sách đơn xin nghỉ phép</h3>
              <h3 className="text-xs font-bold text-slate-700 uppercase sm:hidden truncate">Đơn nghỉ phép</h3>
              <div className="px-2 py-0.5 bg-slate-100 text-[11px] text-slate-600 font-bold rounded-full border border-slate-200 shrink-0">
                {leaves.length}
              </div>

              {canViewAll && (
                <div className="inline-flex md:hidden items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-bold shrink-0 ml-1">
                  <button
                    onClick={() => setTab('my')}
                    className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${tab === 'my' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >Của tôi</button>
                  <button
                    onClick={() => setTab('all')}
                    className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${tab === 'all' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >Tất cả</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {leaves.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowLeaveExportMenu(!showLeaveExportMenu)}
                    className="flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] sm:text-xs rounded-lg border border-emerald-200 transition-colors shadow-xs cursor-pointer h-8"
                    title="Xuất file"
                  >
                    <span className="material-symbols-outlined text-[15px]">file_download</span>
                    <span className="hidden sm:inline">Xuất file</span>
                    <span className="material-symbols-outlined text-xs">expand_more</span>
                  </button>
                  {showLeaveExportMenu && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowLeaveExportMenu(false)} />
                  )}
                  {showLeaveExportMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in duration-100">
                      <button
                        onClick={() => { setShowLeaveExportMenu(false); handleExportLeavesExcel('xlsx'); }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => { setShowLeaveExportMenu(false); handleExportLeavesExcel('csv'); }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                        CSV (.csv)
                      </button>
                      <button
                        onClick={() => { setShowLeaveExportMenu(false); window.print(); }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                        PDF (.pdf)
                      </button>
                      <button
                        onClick={() => { setShowLeaveExportMenu(false); handleExportLeavesExcel('docx'); }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-blue-600">description</span>
                        Word (.docx)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Add Leave Button (mobile only '+' button, full text on desktop) */}
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center justify-center gap-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all h-8 w-8 sm:w-auto sm:px-3.5 shrink-0 active:scale-95 cursor-pointer"
                title="Tạo đơn xin nghỉ"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Tạo đơn</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 md:bg-white pb-16 md:pb-0">
            {leaves.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Chưa có đơn xin nghỉ phép nào.</div>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="block md:hidden p-3 space-y-2.5">
                  {leaves.map((l, idx) => {
                    const isMatch = Boolean(highlightLeaveId && l.id === highlightLeaveId);
                    const canReviewStep1 = (
                      (l.status === 'PENDING_STEP1' || (l.status === 'PENDING' && l.step1ReviewerId)) &&
                      (
                        (l.step1ReviewerId && (user?.id === l.step1ReviewerId || user?.name === l.step1ReviewerName)) ||
                        (!l.step1ReviewerId && (user?.permissions?.includes('APPROVE_LEAVE_STEP1' as any) || isAdmin))
                      )
                    );
                    const canReviewStep2 = (
                      (
                        (l.status === 'APPROVED_STEP1') || 
                        (l.status === 'PENDING' && !l.step1ReviewerId)
                      ) &&
                      (
                        (l.step2ReviewerId && (user?.id === l.step2ReviewerId || user?.name === l.step2ReviewerName)) ||
                        (!l.step2ReviewerId && (user?.permissions?.includes('APPROVE_LEAVE_FINAL' as any) || isAdmin)) ||
                        isAdmin
                      )
                    );

                    return (
                      <div
                        key={l.id}
                        onClick={() => setIsHighlightActive(false)}
                        className={`p-3.5 bg-white rounded-xl border transition-all shadow-2xs space-y-2.5 ${
                          isMatch
                            ? 'bg-amber-100/60 border-amber-400 font-medium'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{l.userName}</h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {formatDate(l.startDate)} → {formatDate(l.endDate)} ({l.totalDays} ngày)
                              </p>
                            </div>
                          </div>
                          <div>
                            {l.status === 'PENDING_STEP1' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Chờ Quản lý duyệt
                              </span>
                            )}
                            {l.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {l.step1ReviewerId ? 'Chờ Quản lý duyệt' : 'Chờ Quản trị duyệt'}
                              </span>
                            )}
                            {l.status === 'APPROVED_STEP1' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                                Quản lý đã duyệt • Chờ Quản trị
                              </span>
                            )}
                            {l.status === 'APPROVED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Đã duyệt hoàn tất
                              </span>
                            )}
                            {l.status === 'REJECTED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                Từ chối
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold text-slate-500">Loại nghỉ:</span>
                            <span className="font-bold text-slate-800">{l.leaveType}</span>
                          </div>
                          <div className="text-slate-600">
                            <span className="font-semibold text-slate-500">Lý do: </span>
                            <span>{l.reason}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60 text-[11px]">
                            <div>
                              <span className="text-slate-400 font-semibold block">Quản lý duyệt:</span>
                              {l.step1ReviewerName ? (
                                <div>
                                  <span className="font-bold text-slate-700">{l.step1ReviewerName}</span>
                                  {l.step1ReviewedAt ? (
                                    <span className="ml-1 text-[10px] font-bold text-emerald-600">✓ Đã duyệt</span>
                                  ) : (
                                    <span className="ml-1 text-[10px] text-amber-600">(Đang chờ)</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block">Quản trị duyệt:</span>
                              {l.step2ReviewerName || (l.reviewerName && !l.step1ReviewerName) ? (
                                <div>
                                  <span className="font-bold text-slate-700">{l.step2ReviewerName || l.reviewerName}</span>
                                  {l.status === 'APPROVED' ? (
                                    <span className="ml-1 text-[10px] font-bold text-emerald-600">✓ Đã duyệt</span>
                                  ) : (
                                    <span className="ml-1 text-[10px] text-slate-400">(Chờ duyệt)</span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="font-semibold text-slate-700">Quản trị</span>
                                  {l.status === 'APPROVED' ? (
                                    <span className="ml-1 text-[10px] font-bold text-emerald-600">✓ Đã duyệt</span>
                                  ) : l.status === 'APPROVED_STEP1' ? (
                                    <span className="ml-1 text-[10px] font-bold text-amber-600">(Chờ duyệt)</span>
                                  ) : (
                                    <span className="ml-1 text-[10px] text-slate-400 italic">—</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Thao tác trên Mobile */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {canReviewStep1 && (
                            <button
                              onClick={() => { setReviewLeave(l); setReviewStep(1); setReviewNote(''); }}
                              className="px-3 py-1.5 bg-blue-50 text-primary hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
                              title="Quản lý duyệt"
                            >
                              Duyệt
                            </button>
                          )}
                          {canReviewStep2 && (
                            <button
                              onClick={() => { setReviewLeave(l); setReviewStep(2); setReviewNote(''); }}
                              className="px-3 py-1.5 bg-primary text-white hover:bg-blue-800 rounded-lg text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                              title="Quản trị duyệt"
                            >
                              Duyệt
                            </button>
                          )}
                          {(isAdmin || l.userId === user?.id || (user?.username && l.userName === user.name)) && (
                            <button
                              onClick={() => handleDeleteLeave(l.id)}
                              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Xóa đơn"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase sticky top-0 z-10">
                        <th className="p-3 w-12 text-center">STT</th>
                        <th className="p-3">Nhân viên</th>
                        <th className="p-3">Loại nghỉ</th>
                        <th className="p-3">Thời gian nghỉ</th>
                        <th className="p-3 text-center">Số ngày</th>
                        <th className="p-3">Lý do</th>
                        <th className="p-3 text-center">Trạng thái</th>
                        <th className="p-3">Quản lý duyệt</th>
                        <th className="p-3">Quản trị duyệt</th>
                        <th className="p-3 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaves.map((l, idx) => {
                        const isMatch = Boolean(highlightLeaveId && l.id === highlightLeaveId);
                        
                        // Quyền duyệt Quản lý (Trưởng nhóm / Quản lý duyệt bước đầu)
                        const canReviewStep1 = (
                          (l.status === 'PENDING_STEP1' || (l.status === 'PENDING' && l.step1ReviewerId)) &&
                          (
                            (l.step1ReviewerId && (user?.id === l.step1ReviewerId || user?.name === l.step1ReviewerName)) ||
                            (!l.step1ReviewerId && (user?.permissions?.includes('APPROVE_LEAVE_STEP1' as any) || isAdmin))
                          )
                        );

                        // Quyền duyệt Quản trị (Admin duyệt quyết định cuối)
                        const canReviewStep2 = (
                          (
                            (l.status === 'APPROVED_STEP1') || 
                            (l.status === 'PENDING' && !l.step1ReviewerId)
                          ) &&
                          (
                            (l.step2ReviewerId && (user?.id === l.step2ReviewerId || user?.name === l.step2ReviewerName)) ||
                            (!l.step2ReviewerId && (user?.permissions?.includes('APPROVE_LEAVE_FINAL' as any) || isAdmin)) ||
                            isAdmin
                          )
                        );

                        return (
                        <tr 
                          key={l.id} 
                          onClick={() => setIsHighlightActive(false)}
                          className={`transition-colors ${
                            isMatch
                              ? 'highlighted-leave-row bg-amber-100/60 hover:bg-amber-100/80 border-l-4 border-l-amber-500 border-y border-amber-300/70 ring-1 ring-inset ring-amber-300/50 font-medium'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">{l.userName}</td>
                          <td className="p-3 font-semibold text-slate-700">{l.leaveType}</td>
                          <td className="p-3 whitespace-nowrap text-slate-700">
                            {formatDate(l.startDate)} → {formatDate(l.endDate)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">{l.totalDays} ngày</td>
                          <td className="p-3 text-slate-600 max-w-[180px] truncate" title={l.reason}>{l.reason}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {l.status === 'PENDING_STEP1' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Chờ Quản lý duyệt
                              </span>
                            )}
                            {l.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {l.step1ReviewerId ? 'Chờ Quản lý duyệt' : 'Chờ Quản trị duyệt'}
                              </span>
                            )}
                            {l.status === 'APPROVED_STEP1' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                                Quản lý đã duyệt • Chờ Quản trị
                              </span>
                            )}
                            {l.status === 'APPROVED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Đã duyệt hoàn tất
                              </span>
                            )}
                            {l.status === 'REJECTED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                Từ chối
                              </span>
                            )}
                          </td>
                          {/* Cột Quản lý */}
                          <td className="p-3 text-slate-600">
                            {l.step1ReviewerName ? (
                              <div>
                                <span className="font-bold text-slate-800">{l.step1ReviewerName}</span>
                                {l.step1ReviewedAt ? (
                                  <span className="ml-1 text-[10px] font-bold text-emerald-600">✓ Đã duyệt</span>
                                ) : l.status === 'REJECTED' ? (
                                  <span className="ml-1 text-[10px] font-bold text-red-600">✗ Từ chối</span>
                                ) : (
                                  <span className="ml-1 text-[10px] font-medium text-amber-600">(Đang chờ)</span>
                                )}
                                {l.step1ReviewNote && <p className="text-[11px] text-slate-500 italic truncate max-w-[150px]" title={l.step1ReviewNote}>{l.step1ReviewNote}</p>}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          {/* Cột Quản trị */}
                          <td className="p-3 text-slate-600">
                            {l.step2ReviewerName || (l.reviewerName && !l.step1ReviewerName) ? (
                              <div>
                                <span className="font-bold text-slate-800">{l.step2ReviewerName || l.reviewerName}</span>
                                {l.status === 'APPROVED' ? (
                                  <span className="ml-1 text-[10px] font-bold text-emerald-600">✓ Phê duyệt</span>
                                ) : l.status === 'REJECTED' && !l.step1ReviewedAt ? (
                                  <span className="ml-1 text-[10px] font-bold text-red-600">✗ Từ chối</span>
                                ) : (
                                  <span className="ml-1 text-[10px] font-medium text-slate-400">(Chờ duyệt)</span>
                                )}
                                {(l.step2ReviewNote || l.reviewNote) && <p className="text-[11px] text-slate-500 italic truncate max-w-[150px]" title={l.step2ReviewNote || l.reviewNote}>{l.step2ReviewNote || l.reviewNote}</p>}
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold text-slate-700">Quản trị</span>
                                {l.status === 'APPROVED_STEP1' ? (
                                  <span className="ml-1 text-[10px] font-bold text-amber-600 animate-pulse">(Chờ duyệt)</span>
                                ) : l.status === 'APPROVED' ? (
                                  <span className="ml-1 text-[10px] font-bold text-emerald-600">✓ Đã duyệt</span>
                                ) : (
                                  <span className="ml-1 text-[10px] text-slate-400 italic">—</span>
                                )}
                              </div>
                            )}
                          </td>
                          {/* Thao tác */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {canReviewStep1 && (
                                <button
                                  onClick={() => { setReviewLeave(l); setReviewStep(1); setReviewNote(''); }}
                                  className="px-2.5 py-1 bg-blue-50 text-primary hover:bg-blue-100 rounded text-[11px] font-bold border border-blue-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                  title="Quản lý duyệt"
                                >
                                  Duyệt
                                </button>
                              )}
                              {canReviewStep2 && (
                                <button
                                  onClick={() => { setReviewLeave(l); setReviewStep(2); setReviewNote(''); }}
                                  className="px-2.5 py-1 bg-primary text-white hover:bg-blue-800 rounded text-[11px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                                  title="Quản trị duyệt"
                                >
                                  Duyệt
                                </button>
                              )}
                              {(isAdmin || l.userId === user?.id || (user?.username && l.userName === user.name)) && (
                                <button
                                  onClick={() => handleDeleteLeave(l.id)}
                                  className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Xóa đơn"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal tạo đơn xin nghỉ phép */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Tạo đơn xin nghỉ phép" icon="event_busy" size="lg">
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Loại nghỉ phép</label>
            <CustomSelect
              value={leaveType}
              onChange={e => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="Nghỉ phép năm">Nghỉ phép năm</option>
              <option value="Nghỉ bệnh">Nghỉ bệnh</option>
              <option value="Nghỉ việc riêng">Nghỉ việc riêng</option>
              <option value="Nghỉ không lương">Nghỉ không lương</option>
              <option value="Khác">Khác</option>
            </CustomSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Từ ngày</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={e => setLeaveStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đến ngày</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={e => setLeaveEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Quản lý duyệt</span>
                <span className="text-[11px] font-normal text-slate-400">(Tùy chọn)</span>
              </label>
              <CustomSelect
                value={step1ReviewerId}
                onChange={e => setStep1ReviewerId(e.target.value)}
                searchable={true}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
              >
                <option value="">-- Không chọn --</option>
                {step1Reviewers.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Ban Giám Đốc duyệt</span>
                <span className="text-[11px] font-normal text-slate-400">(Tùy chọn)</span>
              </label>
              <CustomSelect
                value={step2ReviewerId}
                onChange={e => setStep2ReviewerId(e.target.value)}
                searchable={true}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
              >
                <option value="">-- Không chọn --</option>
                {step2Reviewers.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lý do xin nghỉ</label>
            <textarea
              rows={3}
              value={leaveReason}
              onChange={e => setLeaveReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200"
            >
              Hủy
            </button>
            <button
              onClick={handleCreateLeave}
              disabled={isSubmitting || !leaveReason.trim()}
              className="px-5 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50"
            >
              Gửi đơn xin nghỉ
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Duyệt đơn xin nghỉ phép */}
      <Modal
        isOpen={!!reviewLeave}
        onClose={() => setReviewLeave(null)}
        title={reviewStep === 1 ? 'Xét duyệt đơn xin nghỉ (Quản lý)' : 'Phê duyệt đơn xin nghỉ (Quản trị)'}
        icon="rate_review"
        size="md"
      >
        {reviewLeave && (
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <p><span className="font-bold text-slate-700">Nhân viên làm đơn:</span> <strong className="text-slate-900">{reviewLeave.userName}</strong></p>
              <p><span className="font-bold text-slate-700">Loại nghỉ:</span> {reviewLeave.leaveType}</p>
              <p><span className="font-bold text-slate-700">Thời gian nghỉ:</span> {formatDate(reviewLeave.startDate)} → {formatDate(reviewLeave.endDate)} ({reviewLeave.totalDays} ngày)</p>
              <p><span className="font-bold text-slate-700">Lý do:</span> {reviewLeave.reason}</p>
              {reviewStep === 2 && reviewLeave.step1ReviewerName && (
                <div className="pt-2 border-t border-slate-200/80 text-slate-800">
                  <p><span className="font-bold text-primary">Quản lý đã duyệt:</span> {reviewLeave.step1ReviewerName} {reviewLeave.step1ReviewedAt && `(${formatDate(reviewLeave.step1ReviewedAt)})`}</p>
                  {reviewLeave.step1ReviewNote && <p className="italic text-slate-600">Ý kiến Quản lý: "{reviewLeave.step1ReviewNote}"</p>}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ý kiến / Ghi chú duyệt (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder={reviewStep === 1 ? "Ghi chú ý kiến của quản lý trực tiếp..." : "Ghi chú phê duyệt của Quản trị..."}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleReviewLeave('REJECTED')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => handleReviewLeave('APPROVED')}
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-blue-800 text-white font-bold rounded-lg text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                Duyệt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Image Modal */}
      <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="Ảnh hiện trường" icon="image" size="lg">
        {viewImage && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center min-h-[300px]">
              <img src={viewImage} alt="Attendance" className="max-w-full max-h-[70vh] object-contain" />
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button onClick={() => setViewImage(null)} className="px-5 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm">
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Check-in Modal */}
      <Modal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} title="Check-in (Vào ca)" icon="login" size="md">
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            Bạn đang chuẩn bị bắt đầu ca làm việc lúc <span className="font-bold">{formatTime(new Date().toISOString())} {formatDate(new Date().toISOString())}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh hiện trường khi vào ca (tùy chọn)</label>
            <div className="flex items-center gap-3">
              {checkInImage ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  <img src={checkInImage} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => setCheckInImage(null)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition text-xs">
                  <span className="material-symbols-outlined text-base">add_a_photo</span>
                  Chọn ảnh
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'in')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dự án (tùy chọn)</label>
            <CustomSelect
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              searchable={true}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            >
              <option value="">-- Không chọn dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </CustomSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="VD: Làm ca sáng, bảo trì..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-2">
          <button onClick={() => setShowCheckInModal(false)}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm">
            Hủy
          </button>
          <button onClick={handleCheckIn} disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-blue-800 text-white font-bold rounded-lg disabled:opacity-50 transition-colors text-sm">
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span className="material-symbols-outlined text-lg">login</span>}
            Xác nhận Check-in
          </button>
        </div>
      </Modal>

      {/* Check-out Modal */}
      <Modal isOpen={showCheckOutModal} onClose={() => setShowCheckOutModal(false)} title="Check-out (Ra ca)" icon="logout" size="md">
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            Bạn đã check-in lúc <span className="font-bold">{activeSession ? formatDateTime(activeSession.checkInTime) : ''}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh hiện trường khi ra ca (tùy chọn)</label>
            <div className="flex items-center gap-3">
              {checkOutImage ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  <img src={checkOutImage} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => setCheckOutImage(null)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => checkOutFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition text-xs">
                  <span className="material-symbols-outlined text-base">add_a_photo</span>
                  Chọn ảnh
                </button>
              )}
              <input ref={checkOutFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'out')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
            <textarea
              rows={2}
              value={checkOutNotes}
              onChange={e => setCheckOutNotes(e.target.value)}
              placeholder="Công việc đã hoàn thành..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button onClick={() => setShowCheckOutModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm">
              Hủy
            </button>
            <button onClick={handleCheckOut} disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors text-sm">
              {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span className="material-symbols-outlined text-lg">logout</span>}
              Xác nhận Check-out
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa bản ghi chấm công này?"
        confirmText="Xóa"
        icon="delete"
      />
    </div>
  );
};
