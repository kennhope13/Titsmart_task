import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';
import { api } from '../services/apiSupabase';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';

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
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkOutFileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { fetchLogs(); }, [tab]);

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
    } catch (err) {
      console.error('Upload failed', err);
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
        userName: user.name,
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

      // Gửi thông báo realtime đến admin
      await addNotification({
        title: 'Chấm công vào ca',
        message: `${user.name} đã check-in${proj ? ` tại dự án ${proj.name}` : ''} lúc ${formatTime(result.checkInTime)}`,
        type: 'system',
        icon: 'login',
      });
    } catch (e) {
      console.error('Check-in failed', e);
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
    } catch (e) {
      console.error('Check-out failed', e);
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Check-in / Check-out Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">fingerprint</span>
            <h2 className="text-sm font-extrabold text-slate-800">
              {activeSession ? 'Đang trong ca làm việc' : 'Bắt đầu ca làm việc'}
            </h2>
            {activeSession && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Đang làm
              </span>
            )}
          </div>

          <div className="p-5">
            {activeSession ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">Giờ vào:</span> {formatDateTime(activeSession.checkInTime)}
                  </p>
                  {activeSession.projectName && (
                    <p className="text-sm text-slate-600">
                      <span className="font-bold text-slate-800">Dự án:</span> {activeSession.projectName}
                    </p>
                  )}
                  {activeSession.notes && (
                    <p className="text-xs text-slate-500">Ghi chú: {activeSession.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Check-out (Ra ca)
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dự án (tùy chọn)</label>
                    <select
                      value={selectedProject}
                      onChange={e => setSelectedProject(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                    >
                      <option value="">-- Không chọn dự án --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="VD: Làm ca sáng, bảo trì..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh hiện trường (tùy chọn)</label>
                  <div className="flex items-center gap-3">
                    {checkInImage ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        <img src={checkInImage} alt="preview" className="w-full h-full object-cover" />
                        <button onClick={() => setCheckInImage(null)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[10px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition text-xs"
                      >
                        <span className="material-symbols-outlined text-base">add_a_photo</span>
                        Chọn ảnh
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'in')} />
                  </div>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-800 text-white font-bold text-sm rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">login</span>
                  )}
                  Check-in (Vào ca)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters for Admin */}
        {tab === 'all' && isAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Ngày</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Nhân viên</label>
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white min-w-[180px]">
                <option value="">Tất cả</option>
                {engineers.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-xs text-slate-500 font-semibold">
              {filteredLogs.length} bản ghi
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">list_alt</span>
            <h2 className="text-sm font-extrabold text-slate-800">Lịch sử chấm công</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary inline-block" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chưa có dữ liệu chấm công</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                    {tab === 'all' && <th className="px-4 py-2.5 text-left font-bold">Nhân viên</th>}
                    <th className="px-4 py-2.5 text-left font-bold">Ngày</th>
                    <th className="px-4 py-2.5 text-left font-bold">Vào ca</th>
                    <th className="px-4 py-2.5 text-left font-bold">Ra ca</th>
                    <th className="px-4 py-2.5 text-left font-bold">Thời gian</th>
                    <th className="px-4 py-2.5 text-left font-bold">Dự án</th>
                    <th className="px-4 py-2.5 text-left font-bold">Ghi chú</th>
                    <th className="px-4 py-2.5 text-center font-bold">Ảnh</th>
                    {isAdmin && <th className="px-4 py-2.5 text-center font-bold">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      {tab === 'all' && (
                        <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{log.userName}</td>
                      )}
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(log.checkInTime)}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">
                          <span className="material-symbols-outlined text-[14px]">login</span>
                          {formatTime(log.checkInTime)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {log.checkOutTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700">
                            <span className="material-symbols-outlined text-[14px]">logout</span>
                            {formatTime(log.checkOutTime)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Đang làm
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-semibold whitespace-nowrap">
                        {getDuration(log.checkInTime, log.checkOutTime)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs max-w-[150px] truncate">{log.projectName || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[120px] truncate">{log.notes || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {log.checkInImage && (
                            <a href={log.checkInImage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[11px] font-bold">Vào</a>
                          )}
                          {log.checkOutImage && (
                            <a href={log.checkOutImage} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-[11px] font-bold">Ra</a>
                          )}
                          {!log.checkInImage && !log.checkOutImage && <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => setDeleteId(log.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
