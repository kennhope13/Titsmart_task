import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { api } from '../services/apiSupabase';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { Toast } from '../components/common/Toast';
import * as XLSX from 'xlsx';
import { exportToStyledExcel } from '../utils/excelExportUtils';

import { LeaveRequest, LeaveType } from '../types';
import { PullToRefresh } from '../components/common/PullToRefresh';

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

// In-memory persistent cache across tab and route navigation
let cachedLogs: AttendanceLog[] = [];
let cachedLeaves: LeaveRequest[] = [];
let hasFetchedAttendanceData = false;

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
      roleStr === 'admin' ||
      roleStr.includes('quản trị') ||
      roleStr.includes('giám đốc') ||
      roleStr.includes('trưởng') ||
      roleStr.includes('chỉ huy') ||
      roleStr.includes('manager') ||
      roleStr.includes('pm') ||
      titleStr.includes('quản lý') ||
      titleStr.includes('trưởng') ||
      titleStr.includes('chỉ huy') ||
      titleStr.includes('giám đốc') ||
      perms.includes('APPROVE_LEAVE_STEP1' as any) ||
      perms.includes('APPROVE_LEAVE_FINAL' as any) ||
      perms.includes('VIEW_ALL_ATTENDANCE' as any) ||
      perms.includes('MANAGE_ATTENDANCE' as any)
    );
  }, [user, isAdmin]);

  const [mainTab, setMainTab] = useState<'attendance' | 'leave'>('attendance');
  const [highlightLeaveId, setHighlightLeaveId] = useState<string | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);
  const [logs, setLogs] = useState<AttendanceLog[]>(cachedLogs);
  const [loading, setLoading] = useState(!hasFetchedAttendanceData && cachedLogs.length === 0);
  const [selectedProject, setSelectedProject] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'my' | 'all'>('my');
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInImage, setCheckInImage] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLeaveExportMenu, setShowLeaveExportMenu] = useState(false);

  // State cho Xin nghỉ phép (khởi tạo từ cache)
  const [leaves, setLeaves] = useState<LeaveRequest[]>(cachedLeaves);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState('');
  const [leaveFilterDate, setLeaveFilterDate] = useState('');
  const [leavesLoading, setLeavesLoading] = useState(!hasFetchedAttendanceData && cachedLeaves.length === 0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Nghỉ phép năm');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [step1ReviewerId, setStep1ReviewerId] = useState('');
  const [step2ReviewerId, setStep2ReviewerId] = useState('');
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'info' | 'error' }>({ show: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [reviewStep, setReviewStep] = useState<1 | 2>(1);
  const [reviewNote, setReviewNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if ((viewParam === 'all' || viewParam === 'tat-ca') && canViewAll) {
      setTab('all');
    } else {
      setTab('my');
    }
  }, [searchParams, canViewAll]);

  useEffect(() => {
    if (!canViewAll && tab !== 'my') {
      setTab('my');
    }
  }, [canViewAll, tab]);

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

  const handleExportExcel = async (format: 'xlsx' | 'csv' | 'docx' = 'xlsx') => {
    if (!filteredLogs.length) return;
    const exportData = filteredLogs.map((log, index) => ({
      'STT': index + 1,
      'Ngày': formatDate(log.checkInTime),
      'Giờ': formatTime(log.checkInTime),
      'Nhân viên': log.userName,
      'Dự án': log.projectName || '',
      'Ghi chú': log.notes || '',
    }));

    const today = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ChamCong');
      XLSX.writeFile(workbook, `BangChamCong_${today}.csv`, { bookType: 'csv' });
    } else if (format === 'docx') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ChamCong');
      XLSX.writeFile(workbook, `BangChamCong_${today}.docx`, { bookType: 'xlsx' });
    } else {
      await exportToStyledExcel({
        fileName: `BangChamCong_${today}.xlsx`,
        sheetName: 'ChamCong',
        title: 'BẢNG THEO DÕI CHẤM CÔNG NHÂN VIÊN',
        data: exportData,
      });
    }
  };

  const handleExportLeavesExcel = async (format: 'xlsx' | 'csv' | 'docx' = 'xlsx') => {
    if (!displayedLeaves.length) return;
    const exportData = displayedLeaves.map((leave, index) => {
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
        'Người theo dõi': (leave.followerNames && leave.followerNames.length > 0) ? leave.followerNames.join(', ') : '—',
        'Trạng thái': statusStr,
        'Quản lý duyệt': leave.step1ReviewerName ? `${leave.step1ReviewerName} (${leave.step1ReviewedAt ? 'Đã duyệt' : 'Chờ'})` : '—',
        'Ý kiến Quản lý': leave.step1ReviewNote || '',
        'Ban Giám Đốc duyệt': leave.step2ReviewerName || leave.reviewerName || '—',
        'Ý kiến Ban Giám Đốc': leave.step2ReviewNote || leave.reviewNote || ''
      };
    });

    const today = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'XinNghiPheP');
      XLSX.writeFile(workbook, `BangNghiPhep_${today}.csv`, { bookType: 'csv' });
    } else if (format === 'docx') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'XinNghiPheP');
      XLSX.writeFile(workbook, `BangNghiPhep_${today}.docx`, { bookType: 'xlsx' });
    } else {
      await exportToStyledExcel({
        fileName: `BangNghiPhep_${today}.xlsx`,
        sheetName: 'XinNghiPhep',
        title: 'DANH SÁCH ĐƠN XIN NGHỈ PHÉP',
        data: exportData,
      });
    }
  };

  // Lọc danh sách nghỉ phép ngay trong bộ nhớ (0ms latency, không reload, không spinner khi đổi tab)
  const displayedLeaves = React.useMemo(() => {
    let list = leaves;
    if ((!canViewAll || tab === 'my') && user) {
      list = list.filter(l => {
        const matchId = String(l.userId || '') === String(user.id || '');
        const matchName = user.name && l.userName && l.userName.trim().toLowerCase() === user.name.trim().toLowerCase();
        const matchUsername = user.username && l.userName && l.userName.trim().toLowerCase() === user.username.trim().toLowerCase();
        const matchFollower = Array.isArray(l.followerIds) && (
          l.followerIds.includes(user.id) || 
          (user.name && l.followerNames?.includes(user.name)) ||
          (user.username && l.followerNames?.includes(user.username))
        );
        return matchId || matchName || matchUsername || matchFollower;
      });
    }
    if (leaveSearchQuery.trim()) {
      const q = leaveSearchQuery.toLowerCase().trim();
      list = list.filter(l => {
        const matchUser = l.userName?.toLowerCase().includes(q);
        const matchType = l.leaveType?.toLowerCase().includes(q);
        const matchReason = l.reason?.toLowerCase().includes(q);
        const matchReviewer1 = l.step1ReviewerName?.toLowerCase().includes(q);
        const matchReviewer2 = l.step2ReviewerName?.toLowerCase().includes(q);
        const matchStartDate = formatDate(l.startDate)?.toLowerCase().includes(q);
        const matchEndDate = formatDate(l.endDate)?.toLowerCase().includes(q);
        return matchUser || matchType || matchReason || matchReviewer1 || matchReviewer2 || matchStartDate || matchEndDate;
      });
    }
    if (leaveFilterDate) {
      list = list.filter(l => {
        const start = l.startDate ? String(l.startDate).split('T')[0] : '';
        const end = l.endDate ? String(l.endDate).split('T')[0] : start;
        const target = leaveFilterDate.split('T')[0];
        if (start && end) {
          return target >= start && target <= end;
        }
        return start === target || end === target;
      });
    }
    return list;
  }, [leaves, tab, user, leaveSearchQuery, leaveFilterDate, canViewAll]);

  const fetchLogs = async (forceShowSpinner = false) => {
    if (forceShowSpinner || (!hasFetchedAttendanceData && cachedLogs.length === 0)) {
      setLoading(true);
    }
    try {
      const data = await api.attendance.getAll();
      cachedLogs = data;
      setLogs(data);
    } catch (e) {
      console.error('Failed to fetch attendance logs', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async (forceShowSpinner = false) => {
    if (forceShowSpinner || (!hasFetchedAttendanceData && cachedLeaves.length === 0)) {
      setLeavesLoading(true);
    }
    try {
      const data = await api.leaves.getAll();
      cachedLeaves = data;
      setLeaves(data);
      hasFetchedAttendanceData = true;
    } catch (e) {
      console.error('Failed to fetch leave requests', e);
    } finally {
      setLeavesLoading(false);
    }
  };

  useEffect(() => {
    // Chỉ nạp dữ liệu một lần duy nhất khi vào trang
    fetchLogs(false);
    fetchLeaves(false);

    const channel = supabase.channel('attendance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        // Cập nhật ngầm trong nền khi database thay đổi
        fetchLogs(false);
        fetchLeaves(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateLeave = async () => {
    if (!user || isSubmitting) return;

    if (!leaveReason.trim()) {
      setModalError('Vui lòng nhập lý do xin nghỉ cụ thể!');
      return;
    }

    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (end < start) {
      setModalError('Ngày kết thúc không thể trước ngày bắt đầu!');
      return;
    }

    setModalError(null);
    setIsSubmitting(true);
    try {
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const step1Eng = step1ReviewerId ? engineers.find(e => e.id === step1ReviewerId) : undefined;
      const step2Eng = step2ReviewerId ? engineers.find(e => e.id === step2ReviewerId) : undefined;
      const followerEngs = engineers.filter(e => followerIds.includes(e.id));
      const followerNames = followerEngs.map(e => e.name);

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
        followerIds: followerIds.length > 0 ? followerIds : undefined,
        followerNames: followerNames.length > 0 ? followerNames : undefined,
      });

      cachedLeaves = [newLeave, ...cachedLeaves];
      setLeaves(prev => [newLeave, ...prev]);
      setShowLeaveModal(false);
      setLeaveReason('');
      setStep1ReviewerId('');
      setStep2ReviewerId('');
      setFollowerIds([]);
      setModalError(null);
      showToast('Gửi đơn xin nghỉ phép thành công!', 'success');

      // Gửi thông báo: Nếu có chọn Quản lý thì gửi Quản lý duyệt trước, nếu không thì mặc định gửi Admin
      if (step1Eng) {
        await addNotification({
          title: 'Đơn xin nghỉ phép mới (Chờ duyệt)',
          message: `${user.name} vừa tạo đơn xin ${leaveType.toLowerCase()} (${diffDays} ngày: từ ${formatDate(leaveStartDate)} đến ${formatDate(leaveEndDate)}) (chờ ${step1Eng.name} duyệt bước 1)`,
          type: `leave_pending:::${step1Eng.id}:::${step1Eng.name}`,
          icon: 'event_busy',
          link: '/attendance?tab=leave',
        });
      } else {
        // Mặc định thông báo đến Ban Giám Đốc / Admin
        await addNotification({
          title: 'Đơn xin nghỉ phép mới',
          message: `${user.name} vừa tạo đơn xin ${leaveType.toLowerCase()} (${diffDays} ngày: từ ${formatDate(leaveStartDate)} đến ${formatDate(leaveEndDate)}) (chờ Ban Giám Đốc / Quản trị duyệt)`,
          type: 'leave_pending:::admin:::Quản trị viên',
          icon: 'event_busy',
          link: '/attendance?tab=leave',
        });
      }

      // Gửi thông báo cho những người theo dõi (Followers)
      if (followerIds.length > 0) {
        await addNotification({
          title: 'Thông báo nghỉ phép (Theo dõi)',
          message: `${user.name} đã tạo đơn xin ${leaveType.toLowerCase()} (${diffDays} ngày: từ ${formatDate(leaveStartDate)} đến ${formatDate(leaveEndDate)}). Bạn nhận thông báo này vì được thêm vào theo dõi.`,
          type: `leave_follower:::${followerIds.join(',')}:::${followerNames.join(',')}`,
          icon: 'visibility',
          link: '/attendance?tab=leave',
        });
      }
    } catch (e: any) {
      showToast('Lỗi tạo đơn xin nghỉ: ' + (e.message || 'Không thể tạo đơn'), 'error');
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

      cachedLeaves = cachedLeaves.map(l => l.id === reviewLeave.id ? updated : l);
      setLeaves(prev => prev.map(l => l.id === reviewLeave.id ? updated : l));
      setReviewLeave(null);
      setReviewNote('');
      showToast(finalStatus === 'REJECTED' ? 'Đã từ chối đơn xin nghỉ.' : 'Đã xét duyệt đơn xin nghỉ thành công.', 'success');

      // Tiêu đề & nội dung & đối tượng nhận thông báo đích danh
      let notifTitle = '';
      let notifMsg = '';
      let notifType = '';

      if (finalStatus === 'APPROVED_STEP1') {
        // Quản lý đã duyệt bước 1 -> Mặc định gửi thông báo đến Admin duyệt bước cuối và nhân viên
        notifTitle = 'Đơn nghỉ phép đã được Quản lý duyệt';
        notifMsg = `Đơn của ${reviewLeave.userName} đã được ${user.name} duyệt → Chờ Ban Giám Đốc / Quản trị phê duyệt cuối cùng.`;
        notifType = `leave_step1_approved:::admin,${reviewLeave.userId}:::Quản trị viên,${reviewLeave.userName}`;
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

      // Nếu đơn được duyệt hoàn tất và có người theo dõi, gửi thông báo cập nhật cho người theo dõi
      if (finalStatus === 'APPROVED' && reviewLeave.followerIds && reviewLeave.followerIds.length > 0) {
        await addNotification({
          title: 'Đơn nghỉ phép đã duyệt (Theo dõi)',
          message: `Đơn xin ${reviewLeave.leaveType.toLowerCase()} của ${reviewLeave.userName} (${reviewLeave.totalDays} ngày: từ ${formatDate(reviewLeave.startDate)} đến ${formatDate(reviewLeave.endDate)}) đã được phê duyệt.`,
          type: `leave_follower_approved:::${reviewLeave.followerIds.join(',')}:::${(reviewLeave.followerNames || []).join(',')}`,
          icon: 'event_available',
          link: '/attendance?tab=leave',
        });
      }
    } catch (e: any) {
      showToast('Lỗi duyệt đơn: ' + (e.message || 'Không thể duyệt đơn'), 'error');
    }
    setIsSubmitting(false);
  };

  const handleDeleteLeave = (id: string) => {
    setDeleteLeaveId(id);
  };

  const handleConfirmDeleteLeave = async () => {
    if (!deleteLeaveId) return;
    try {
      await api.leaves.delete(deleteLeaveId);
      cachedLeaves = cachedLeaves.filter(l => l.id !== deleteLeaveId);
      setLeaves(prev => prev.filter(l => l.id !== deleteLeaveId));
      showToast('Đã xóa đơn nghỉ phép thành công.', 'info');
    } catch (e: any) {
      showToast('Lỗi xóa đơn: ' + (e.message || 'Không thể xóa đơn'), 'error');
    }
    setDeleteLeaveId(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `attendance/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from('titsmart-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('titsmart-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setCheckInImage(url);
    } catch (err: any) {
      console.error('Upload failed', err);
      showToast('Lỗi tải ảnh: ' + (err.message || 'Không thể tải ảnh'), 'error');
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
      cachedLogs = [result, ...cachedLogs];
      setLogs(prev => [result, ...prev]);
      setCheckInImage(null);
      setNotes('');
      setSelectedProject('');
      setShowCheckInModal(false);
      showToast('Chấm công thành công!', 'success');

      // Gửi thông báo realtime chỉ đến admin
      await addNotification({
        title: 'Chấm công',
        message: `${user.name} đã chấm công${proj ? ` tại dự án ${proj.name}` : ''} lúc ${formatTime(result.checkInTime)}`,
        link: '/attendance?tab=attendance&view=all',
        type: 'attendance:::admin',
        icon: 'fingerprint',
      });
    } catch (e: any) {
      console.error('Attendance failed', e);
      showToast('Lỗi chấm công: ' + (e.message || 'Chấm công thất bại'), 'error');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.attendance.delete(deleteId);
      cachedLogs = cachedLogs.filter(l => l.id !== deleteId);
      setLogs(prev => prev.filter(l => l.id !== deleteId));
    } catch (e) { console.error(e); }
    setDeleteId(null);
  };

  // Filter logs (0ms latency, lọc ngay trong bộ nhớ khi chuyển tab 'Của tôi' / 'Tất cả')
  const filteredLogs = React.useMemo(() => {
    let list = logs;
    if ((!canViewAll || tab === 'my') && user) {
      list = list.filter(l => {
        const matchId = String(l.userId || '') === String(user.id || '');
        const matchName = user.name && l.userName && l.userName.trim().toLowerCase() === user.name.trim().toLowerCase();
        return matchId || matchName;
      });
    }
    return list.filter(l => {
      if (filterDate) {
        const logDate = new Date(l.checkInTime).toISOString().split('T')[0];
        if (logDate !== filterDate && l.checkOutTime) return false;
      }
      if (filterUser && l.userId !== filterUser) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = l.userName?.toLowerCase().includes(q);
        const matchProject = l.projectName?.toLowerCase().includes(q);
        const matchNotes = l.notes?.toLowerCase().includes(q);
        const matchDate = formatDate(l.checkInTime)?.toLowerCase().includes(q);
        if (!matchUser && !matchProject && !matchNotes && !matchDate) return false;
      }
      return true;
    });
  }, [logs, tab, user, filterDate, filterUser, searchQuery, canViewAll]);

  const todayStr = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-2 py-1.5 md:py-0 md:h-12 flex items-center justify-between gap-1.5 shrink-0 pr-16 md:pr-20">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="border-l-4 border-primary pl-1.5 flex items-center">
            <h1 className="page-title text-xs sm:text-sm md:text-base font-extrabold text-slate-900 shrink-0">
              {mainTab === 'attendance' ? 'Chấm công' : 'Nghỉ phép'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setMainTab('attendance')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer select-none shrink-0 ${mainTab === 'attendance' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
            >
              <span className="material-symbols-outlined text-[15px]">fingerprint</span>
              <span>Chấm công</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('leave')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer select-none shrink-0 ${mainTab === 'leave' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
            >
              <span className="material-symbols-outlined text-[15px]">event_busy</span>
              <span>Xin nghỉ</span>
              {leaves.filter(l => l.status === 'PENDING').length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-bold">
                  {leaves.filter(l => l.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop-only Right controls (My/All switcher + Action Button) pushed to far right */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
          {canViewAll && (
            <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs shrink-0">
              <button
                onClick={() => setTab('my')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tab === 'my' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
              >Của tôi</button>
              <button
                onClick={() => setTab('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tab === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'}`}
              >Tất cả</button>
            </div>
          )}

          {mainTab === 'attendance' ? (
            <div className="flex items-center gap-2">
              {/* Desktop Date Filter for Attendance */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2 text-slate-500 text-[18px] pointer-events-none">calendar_month</span>
                  <input 
                    type="date" 
                    value={filterDate} 
                    onChange={e => setFilterDate(e.target.value)}
                    className="pl-7 pr-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 cursor-pointer h-8" 
                  />
                </div>
                {filterDate && (
                  <button 
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer h-8 shrink-0"
                    title="Hiển thị tất cả các ngày"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    <span>Tất cả ngày</span>
                  </button>
                )}
              </div>

              {/* User filter if viewing all */}
              {canViewAll && tab === 'all' && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                  <CustomSelect value={filterUser} onChange={e => setFilterUser(e.target.value)}
                    searchable={true}
                    className="px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 min-w-[140px] h-8">
                    <option value="">Tất cả nhân viên</option>
                    {engineers.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </CustomSelect>
                </div>
              )}

              {/* Desktop Search for Attendance */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2 text-slate-400 text-sm pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none h-8 w-36 lg:w-44 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>

              {/* Export file for Attendance */}
              {filteredLogs.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg border border-emerald-200 transition-colors shadow-xs cursor-pointer h-8"
                    title="Xuất file"
                  >
                    <span className="material-symbols-outlined text-[15px]">file_download</span>
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

              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0 h-8 cursor-pointer active:scale-95"
                title="Chấm công"
              >
                <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                <span className="hidden sm:inline">Chấm công</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Desktop Date Filter for Leave */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2 text-slate-500 text-[18px] pointer-events-none">calendar_month</span>
                  <input 
                    type="date" 
                    value={leaveFilterDate} 
                    onChange={e => setLeaveFilterDate(e.target.value)}
                    className="pl-7 pr-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 cursor-pointer h-8" 
                  />
                </div>
                {leaveFilterDate && (
                  <button 
                    type="button"
                    onClick={() => setLeaveFilterDate('')}
                    className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer h-8 shrink-0"
                    title="Hiển thị tất cả các ngày"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    <span>Tất cả ngày</span>
                  </button>
                )}
              </div>

              {/* Desktop Search for Leave */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2 text-slate-400 text-sm pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm nghỉ phép..."
                  value={leaveSearchQuery}
                  onChange={e => setLeaveSearchQuery(e.target.value)}
                  className="pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none h-8 w-36 lg:w-48 transition-colors"
                />
                {leaveSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLeaveSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>

              {leaves.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowLeaveExportMenu(!showLeaveExportMenu)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg border border-emerald-200 transition-colors shadow-xs cursor-pointer h-8"
                    title="Xuất file"
                  >
                    <span className="material-symbols-outlined text-[15px]">file_download</span>
                    <span>Xuất file</span>
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
              <button
                onClick={() => { setShowLeaveModal(true); setModalError(null); }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer active:scale-95 h-8"
                title="Tạo đơn xin nghỉ"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Tạo đơn xin nghỉ</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {mainTab === 'attendance' ? (
        <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col bg-slate-50">
          {/* Check-in / Check-out & Search Bar (Mobile only) */}
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

              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors shrink-0 h-8 cursor-pointer active:scale-95"
                title="Chấm công"
              >
                <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                <span className="hidden sm:inline">Chấm công</span>
              </button>
            </div>

            {/* Mobile Search & Date Filter */}
            <div className="px-3 pb-2 flex items-center gap-2">
              <div className="flex-1 relative items-center min-w-0">
                <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-sm pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none h-8 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>
              <input 
                type="date" 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 cursor-pointer h-8 w-32" 
              />
            </div>
          </div>

          {/* Attendance Table Area */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <PullToRefresh
              onRefresh={async () => {
                await Promise.all([fetchLogs(true), fetchLeaves(true)]);
              }}
              className="flex-1 pb-16 md:pb-0"
            >
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Đang tải lịch sử chấm công...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Chưa có bản ghi chấm công nào.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase sticky top-0 z-10 text-[10px] sm:text-xs">
                      <th className="px-2 py-2 sm:p-3 leading-tight break-words">Nhân viên</th>
                      <th className="px-2 py-2 sm:p-3 leading-tight break-words">Thời gian</th>
                      <th className="px-2 py-2 sm:p-3 leading-tight break-words">Dự án</th>
                      <th className="px-2 py-2 sm:p-3 leading-tight break-words">Ghi chú</th>
                      <th className="px-2 py-2 sm:p-3 text-center leading-tight break-words">Hình ảnh</th>
                      {isAdmin && <th className="px-2 py-2 sm:p-3 text-center w-10 sm:w-12 leading-tight">TT</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-800">{log.userName}</td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                          {formatDateTime(log.checkInTime)}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[200px] truncate" title={log.projectName}>
                          {log.projectName || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[200px] truncate" title={log.notes}>
                          {log.notes || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {log.checkInImage || log.checkOutImage ? (
                            <button
                              onClick={() => setViewImage(log.checkInImage || log.checkOutImage || null)}
                              className="inline-flex items-center gap-1 text-primary hover:text-blue-700 transition-colors bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[11px] font-bold cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[13px]">image</span>
                              <span>Xem ảnh</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
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
            </PullToRefresh>
          </div>
        </div>
      ) : (
        /* Tab Xin nghỉ phép */
        <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col bg-slate-50">
          {/* Mobile-only Toolbar Bar (On Desktop, controls are neatly in the top header) */}
          <div className="md:hidden px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 shadow-xs relative z-10">
            {canViewAll ? (
              <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-bold shrink-0">
                <button
                  onClick={() => setTab('my')}
                  className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${tab === 'my' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >Của tôi</button>
                <button
                  onClick={() => setTab('all')}
                  className={`px-2 py-0.5 rounded-md text-[10px] transition-all ${tab === 'all' ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >Tất cả</button>
              </div>
            ) : null}

            {/* Mobile Date Filter in Leave Tab */}
            <div className="relative flex items-center shrink-0">
              <input 
                type="date" 
                value={leaveFilterDate} 
                onChange={e => setLeaveFilterDate(e.target.value)}
                className="w-28 px-1.5 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 cursor-pointer h-8" 
              />
              {leaveFilterDate && (
                <button
                  type="button"
                  onClick={() => setLeaveFilterDate('')}
                  className="absolute right-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Xóa lọc ngày"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {/* Mobile Search Bar in Leave Tab */}
            <div className="flex-1 relative flex items-center min-w-0">
              <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-sm pointer-events-none">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={leaveSearchQuery}
                onChange={e => setLeaveSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none h-8 transition-colors"
              />
              {leaveSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLeaveSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {leaves.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowLeaveExportMenu(!showLeaveExportMenu)}
                    className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg border border-emerald-200 transition-colors shadow-xs cursor-pointer"
                    title="Xuất file"
                  >
                    <span className="material-symbols-outlined text-[17px]">file_download</span>
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

              {/* Add Leave Button (Mobile only: icon-only) */}
              <button
                onClick={() => { setShowLeaveModal(true); setModalError(null); }}
                className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs transition-all shrink-0 active:scale-95 cursor-pointer"
                title="Tạo đơn xin nghỉ"
              >
                <span className="material-symbols-outlined text-[19px]">add</span>
              </button>
            </div>
          </div>

          <PullToRefresh
            onRefresh={async () => {
              await Promise.all([fetchLeaves(true), fetchLogs(true)]);
            }}
            className="flex-1 bg-slate-50 md:bg-white pb-16 md:pb-0"
          >
            {leavesLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Đang tải danh sách nghỉ phép...</span>
              </div>
            ) : displayedLeaves.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
                <span>Chưa có đơn xin nghỉ phép nào.</span>
              </div>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="block md:hidden p-3 space-y-2.5">
                  {displayedLeaves.map((l, idx) => {
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
                          {l.followerNames && l.followerNames.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-primary">visibility</span>
                                <span>Người theo dõi:</span>
                              </span>
                              <span className="font-bold text-primary truncate max-w-[200px]">
                                {l.followerNames.join(', ')}
                              </span>
                            </div>
                          )}
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
                        <th className="p-3">Nhân viên</th>
                        <th className="p-3">Loại nghỉ</th>
                        <th className="p-3">Thời gian nghỉ</th>
                        <th className="p-3 text-center">Số ngày</th>
                        <th className="p-3">Lý do</th>
                        <th className="p-3">Người theo dõi</th>
                        <th className="p-3 text-center">Trạng thái</th>
                        <th className="p-3">Quản lý duyệt</th>
                        <th className="p-3">Quản trị duyệt</th>
                        <th className="p-3 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedLeaves.map((l) => {
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
                          <td className="p-3 font-bold text-slate-800">{l.userName}</td>
                          <td className="p-3 font-semibold text-slate-700">{l.leaveType}</td>
                          <td className="p-3 whitespace-nowrap text-slate-700">
                            {formatDate(l.startDate)} → {formatDate(l.endDate)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">{l.totalDays} ngày</td>
                          <td className="p-3 text-slate-600 max-w-[180px] truncate" title={l.reason}>
                            {l.reason}
                          </td>
                          {/* Cột Người theo dõi */}
                          <td className="p-3 text-slate-600 max-w-[160px]">
                            {l.followerNames && l.followerNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1" title={l.followerNames.join(', ')}>
                                {l.followerNames.map((fn, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-primary border border-blue-200/80 rounded-md text-[10px] font-medium"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">person</span>
                                    <span className="truncate max-w-[100px]">{fn}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
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
          </PullToRefresh>
        </div>
      )}

      {/* Modal tạo đơn xin nghỉ phép */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Tạo đơn xin nghỉ phép" icon="event_busy" size="lg">
        <div className="space-y-4 py-2">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
              <span className="font-semibold">{modalError}</span>
            </div>
          )}
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

          {/* Gom Quản lý trực tiếp duyệt & Người theo dõi lên cùng 1 hàng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Ô Quản lý trực tiếp duyệt (Bước 1 - Tùy chọn) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <span className="material-symbols-outlined text-[16px] text-primary">person_check</span>
                    <span>Quản lý trực tiếp duyệt</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">(Tùy chọn)</span>
                </label>
                <CustomSelect
                  value={step1ReviewerId}
                  onChange={e => {
                    setStep1ReviewerId(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  searchable={true}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                >
                  <option value="">-- Không qua quản lý (Admin duyệt) --</option>
                  {step1Reviewers.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </CustomSelect>
              </div>
              <p className="text-[10px] text-slate-400 italic mt-1">* Ban Giám Đốc / Admin mặc định duyệt cuối</p>
            </div>

            {/* Ô Người theo dõi (Follow / CC) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                  <span>Người theo dõi (Follow / CC)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">(Tùy chọn)</span>
              </label>

              <div className="space-y-2">
                <CustomSelect
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !followerIds.includes(val)) {
                      setFollowerIds(prev => [...prev, val]);
                    }
                  }}
                  searchable={true}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                >
                  <option value="">+ Chọn người theo dõi / thông báo...</option>
                  {engineers
                    .filter(eng => eng.id !== user?.id && !followerIds.includes(eng.id))
                    .map(eng => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.role || eng.title || 'Nhân viên'})
                      </option>
                    ))}
                </CustomSelect>

                {/* Danh sách người theo dõi đã chọn dạng chip */}
                {followerIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {followerIds.map(fid => {
                      const eng = engineers.find(e => e.id === fid);
                      return (
                        <span
                          key={fid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/90 text-primary border border-blue-200/80 rounded-lg text-xs font-semibold animate-in fade-in"
                        >
                          <span className="material-symbols-outlined text-[13px]">person</span>
                          <span>{eng?.name || fid}</span>
                          <button
                            type="button"
                            onClick={() => setFollowerIds(prev => prev.filter(id => id !== fid))}
                            className="w-3.5 h-3.5 rounded-full bg-blue-200/70 hover:bg-red-100 hover:text-red-600 inline-flex items-center justify-center transition-colors text-slate-600 cursor-pointer"
                            title="Bỏ chọn"
                          >
                            <span className="material-symbols-outlined text-[10px]">close</span>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
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

      {/* Chấm công Modal */}
      <Modal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} title="Chấm công" icon="fingerprint" size="md">
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            Thời gian chấm công: <span className="font-bold text-slate-800">{formatTime(new Date().toISOString())} {formatDate(new Date().toISOString())}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh hiện trường / hình ảnh (tùy chọn)</label>
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
                  className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition text-xs cursor-pointer">
                  <span className="material-symbols-outlined text-base">add_a_photo</span>
                  Chọn ảnh
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú (tùy chọn)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Nhập ghi chú công việc..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-2">
          <button onClick={() => setShowCheckInModal(false)}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm cursor-pointer">
            Hủy
          </button>
          <button onClick={handleCheckIn} disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-blue-800 text-white font-bold rounded-lg disabled:opacity-50 transition-colors text-sm cursor-pointer shadow-sm">
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span className="material-symbols-outlined text-lg">fingerprint</span>}
            Xác nhận Chấm công
          </button>
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

      <ConfirmModal
        isOpen={deleteLeaveId !== null}
        onClose={() => setDeleteLeaveId(null)}
        onConfirm={handleConfirmDeleteLeave}
        title="Xác nhận xóa đơn"
        message="Bạn có chắc chắn muốn xóa đơn nghỉ phép này?"
        confirmText="Xóa đơn"
        icon="delete"
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
};
