import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { api } from '../services/apiSupabase';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '../components/common/CustomSelect';
import * as XLSX from 'xlsx';

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

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel('attendance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab]);

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
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white pl-3 pr-14 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">Chấm công</h1>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('my')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'my' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >Của tôi</button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'all' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >Tất cả</button>
          </div>
        )}
      </header>

      <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col bg-slate-50">
        {/* Check-in / Check-out Bar */}
        <div className="bg-white border-b border-slate-200 shadow-xs shrink-0">
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="material-symbols-outlined text-primary text-[20px]">fingerprint</span>
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex-1 min-w-[200px]">
              {activeSession ? 'Đang trong ca làm việc' : 'Quản lý chấm công'}
            </h2>

            {activeSession ? (
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Đang làm
                </span>
                <p className="text-sm text-slate-600">
                  <span className="hidden sm:inline">Giờ vào: </span>
                  <span className="font-bold text-slate-800">{formatDateTime(activeSession.checkInTime)}</span>
                </p>
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="flex items-center gap-2 px-5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Check-out (Ra ca)
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex items-center gap-2 px-6 py-1.5 bg-primary hover:bg-blue-800 text-white font-bold text-sm rounded-lg shadow-sm transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                Check-in (Vào ca)
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
            <span className="material-symbols-outlined text-primary text-[18px]">list_alt</span>
            <h2 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wide">Lịch sử chấm công</h2>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary mb-2" />
                <span className="text-xs">Đang tải...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center h-full">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history_toggle_off</span>
                <span className="font-semibold text-[13px]">Chưa có dữ liệu chấm công</span>
              </div>
            ) : (
              <table className="w-full text-[13px] text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                  <tr>
                    {tab === 'all' && <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Nhân viên</th>}
                    <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Ngày</th>
                    <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Vào ca</th>
                    <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Ra ca</th>
                    <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Thời gian</th>
                    <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Dự án</th>
                    <th className="p-3 font-bold bg-slate-50 whitespace-nowrap">Ghi chú</th>
                    <th className="p-3 text-center font-bold bg-slate-50 whitespace-nowrap">Ảnh</th>
                    {isAdmin && <th className="p-3 text-center font-bold bg-slate-50 whitespace-nowrap">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {tab === 'all' && (
                        <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">{log.userName}</td>
                      )}
                      <td className="p-3 text-slate-600 whitespace-nowrap font-medium">{formatDate(log.checkInTime)}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-700 font-bold text-xs">
                          <span className="material-symbols-outlined text-[14px]">login</span>
                          {formatTime(log.checkInTime)}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.checkOutTime ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 font-bold text-xs">
                            <span className="material-symbols-outlined text-[14px]">logout</span>
                            {formatTime(log.checkOutTime)}
                          </span>
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
