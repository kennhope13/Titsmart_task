import React, { useState, useEffect, useRef } from 'react';
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
  const { projects, engineers, addNotification } = useRealtimeStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'Quản trị viên' || user?.role === 'pm';

  const [mainTab, setMainTab] = useState<'attendance' | 'leave'>('attendance');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<AttendanceLog | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'my' | 'all'>('my');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUser, setFilterUser] = useState('');
  const [checkInImage, setCheckInImage] = useState<string | null>(null);
  const [checkOutImage, setCheckOutImage] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // State cho Xin nghỉ phép
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Nghỉ phép năm');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkOutFileRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    if (!filteredLogs.length) return;
    const exportData = filteredLogs.map((log, index) => ({
      'STT': index + 1,
      'Ngày': formatDate(log.checkInTime),
      'Nhân viên': log.userName,
      'Giờ vào': formatTime(log.checkInTime),
      'Giờ ra': log.checkOutTime ? formatTime(log.checkOutTime) : '',
      'Thời gian': log.checkOutTime ? getDuration(log.checkInTime, log.checkOutTime) : '',
      'Dự án': log.projectName || '',
      'Ghi chú': log.notes || '',
      'Ảnh vào': log.checkInImage || '',
      'Ảnh ra': log.checkOutImage || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ChamCong');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `BangChamCong_${today}.xlsx`);
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

      const newLeave = await api.leaves.create({
        userId: user.id,
        userName: user.name || user.username || 'Unknown',
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        totalDays: diffDays,
        reason: leaveReason.trim(),
      });

      setLeaves(prev => [newLeave, ...prev]);
      setShowLeaveModal(false);
      setLeaveReason('');

      await addNotification({
        title: 'Đơn xin nghỉ phép mới',
        message: `${user.name} vừa tạo đơn xin ${leaveType.toLowerCase()} (${diffDays} ngày: từ ${formatDate(leaveStartDate)} đến ${formatDate(leaveEndDate)})`,
        type: 'system',
        icon: 'event_busy',
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
      const updated = await api.leaves.review(reviewLeave.id, {
        status,
        reviewerId: user.id,
        reviewerName: user.name || user.username || 'Admin',
        reviewNote: reviewNote.trim() || undefined,
      });

      setLeaves(prev => prev.map(l => l.id === reviewLeave.id ? updated : l));
      setReviewLeave(null);
      setReviewNote('');

      await addNotification({
        title: status === 'APPROVED' ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép bị từ chối',
        message: `Đơn xin ${reviewLeave.leaveType} của ${reviewLeave.userName} đã được ${status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi ${user.name}`,
        type: 'system',
        icon: status === 'APPROVED' ? 'check_circle' : 'cancel',
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

      // Gửi thông báo realtime đến admin
      await addNotification({
        title: 'Chấm công vào ca',
        message: `${user.name} đã check-in${proj ? ` tại dự án ${proj.name}` : ''} lúc ${formatTime(result.checkInTime)}`,
        type: 'system',
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

      // Gửi thông báo realtime đến admin
      await addNotification({
        title: 'Chấm công ra ca',
        message: `${user.name} đã check-out lúc ${formatTime(result.checkOutTime)}. Thời gian làm việc: ${getDuration(result.checkInTime, result.checkOutTime)}`,
        type: 'system',
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
      if (logDate !== filterDate) return false;
    }
    if (filterUser && l.userId !== filterUser) return false;
    return true;
  });

  const todayStr = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-2 py-1.5 md:py-0 md:h-12 flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
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
          {isAdmin && (
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
              className="flex items-center gap-1.5 px-3.5 py-1 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Tạo đơn xin nghỉ</span>
            </button>
          )}
        </div>
      </header>

      {mainTab === 'attendance' ? (
        <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col bg-slate-50">
          {/* Check-in / Check-out Bar (Mobile only) */}
          <div className="bg-white border-b border-slate-200 shadow-xs shrink-0 md:hidden">
            <div className="px-3 py-2 sm:px-4 sm:py-2 flex items-center justify-between gap-2">
              {isAdmin ? (
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

          {/* Filters for Admin */}
          {tab === 'all' && isAdmin && (
            <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center gap-3 shrink-0 shadow-xs relative z-10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_month</span>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50" />
              </div>
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
              <div className="ml-auto flex items-center gap-3">
                <div className="px-2.5 py-1 bg-slate-100 text-[11px] text-slate-600 font-bold rounded-full border border-slate-200">
                  {filteredLogs.length} bản ghi
                </div>
                {filteredLogs.length > 0 && (
                  <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Xuất Excel
                  </button>
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

            <div className="flex-1 overflow-y-auto">
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
          <div className="bg-white border-b border-slate-200 shadow-xs px-3 py-2 sm:px-4 sm:py-2 flex items-center justify-between gap-2 md:hidden">
            {isAdmin ? (
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
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">add</span>
              <span>Tạo đơn xin nghỉ</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {leaves.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Chưa có đơn xin nghỉ phép nào.</div>
            ) : (
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
                    <th className="p-3">Người duyệt / Ghi chú</th>
                    <th className="p-3 text-center w-16">TT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((l, idx) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{l.userName}</td>
                      <td className="p-3 font-semibold text-slate-700">{l.leaveType}</td>
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">{l.totalDays} ngày</td>
                      <td className="p-3 text-slate-600 max-w-[200px] truncate" title={l.reason}>{l.reason}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {l.status === 'PENDING' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Chờ duyệt
                          </span>
                        )}
                        {l.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Đã duyệt
                          </span>
                        )}
                        {l.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                            Từ chối
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {l.reviewerName ? (
                          <div>
                            <span className="font-bold text-slate-700">{l.reviewerName}</span>
                            {l.reviewNote && <p className="text-[11px] text-slate-500 italic">{l.reviewNote}</p>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isAdmin && l.status === 'PENDING' && (
                            <button
                              onClick={() => { setReviewLeave(l); setReviewNote(''); }}
                              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold border border-blue-200"
                            >
                              Duyệt
                            </button>
                          )}
                          {(isAdmin || l.userId === user?.id) && (
                            <button
                              onClick={() => handleDeleteLeave(l.id)}
                              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal tạo đơn xin nghỉ phép */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Tạo đơn xin nghỉ phép" icon="event_busy" size="md">
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
      <Modal isOpen={!!reviewLeave} onClose={() => setReviewLeave(null)} title="Xét duyệt đơn xin nghỉ" icon="rate_review" size="md">
        {reviewLeave && (
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p><span className="font-bold text-slate-700">Nhân viên:</span> {reviewLeave.userName}</p>
              <p><span className="font-bold text-slate-700">Loại nghỉ:</span> {reviewLeave.leaveType}</p>
              <p><span className="font-bold text-slate-700">Thời gian:</span> {formatDate(reviewLeave.startDate)} → {formatDate(reviewLeave.endDate)} ({reviewLeave.totalDays} ngày)</p>
              <p><span className="font-bold text-slate-700">Lý do:</span> {reviewLeave.reason}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phản hồi / Phê duyệt ghi chú (tùy chọn)</label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Ghi chú ý kiến của cấp quản lý..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleReviewLeave('REJECTED')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-sm transition-all disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => handleReviewLeave('APPROVED')}
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-sm shadow-sm transition-all disabled:opacity-50"
              >
                Chấp thuận duyệt
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
