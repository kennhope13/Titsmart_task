import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, canManageItem } from '../services/authStore';
import { useParams, useSearchParams, useOutletContext, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FieldLog } from '../types';
import { FieldLogsTaskTable } from '../components/FieldLogsTaskTable';
import { CustomSelect } from '@/components/common/CustomSelect';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { supabase } from '../lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTime = (value: string) => {
  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch {
    return value;
  }
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString('vi-VN');
  } catch {
    return value;
  }
};

const formatTimeOnly = (value: string) => {
  try {
    const d = new Date(value);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  } catch {
    return value;
  }
};

// ── Lightbox ──────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{ images: string[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void }> = ({
  images, index, onClose, onPrev, onNext,
}) => (
  <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
    {/* Header / Actions */}
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
      <span className="rounded-full bg-black/50 px-3 py-1 text-[13px] font-bold text-white shadow-lg backdrop-blur-md">
        {index + 1} / {images.length}
      </span>
      <button onClick={onClose} className="rounded-full bg-black/50 p-2 text-white hover:bg-white/20 transition pointer-events-auto shadow-lg backdrop-blur-md cursor-pointer">
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>

    {/* Image Container (Scrollable) */}
    <div className="flex-1 overflow-auto p-4 text-center whitespace-nowrap" onClick={onClose}>
      <span className="inline-block h-full align-middle" />
      <img 
        src={images[index]} 
        alt="Ảnh hiện trường" 
        className="inline-block align-middle w-full max-w-5xl h-auto rounded-lg shadow-2xl cursor-default" 
        onClick={(e) => e.stopPropagation()} 
      />
    </div>

    {/* Navigation */}
    {images.length > 1 && (
      <>
        {index > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-white/20 transition shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        )}
        {index < images.length - 1 && (
          <button onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-white/20 transition shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        )}
      </>
    )}
  </div>
);

// ── Upload Modal ──────────────────────────────────────────────────────────────

const UploadModal: React.FC<{
  defaultProjectCode: string;
  defaultTaskId?: string;
  projects: { code: string; name: string }[];
  editLog?: any;
  onClose: () => void;
  onUpload: (input: { projectCode: string; note: string; images: string[]; taskId?: string; timestamp?: string }) => Promise<void>;
  onUpdate?: (id: string, input: { note: string; images: string[]; existingImages: string[]; taskId?: string; timestamp?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}> = ({ defaultProjectCode, defaultTaskId, projects, editLog, onClose, onUpload, onUpdate, onDelete }) => {
  const { user } = useAuthStore();
  const isAllowedToManage = !editLog || canManageItem(user, editLog);

  const [projectCode, setProjectCode] = useState(editLog?.projectCode || defaultProjectCode || '');
  const [note, setNote] = useState(editLog?.note || '');
  const [taskId, setTaskId] = useState(editLog?.taskId || defaultTaskId || '');
  const todayStr = new Date().toISOString().split('T')[0];
  const initialDate = editLog?.timestamp ? new Date(editLog.timestamp).toISOString().split('T')[0] : todayStr;
  const [logDate, setLogDate] = useState(initialDate);
  const { tasks } = useRealtimeStore();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editLog?.images || []);
  const [existingImages, setExistingImages] = useState<string[]>(editLog?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectCode && defaultProjectCode) setProjectCode(defaultProjectCode);
  }, [defaultProjectCode]);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = Array.from(list).filter(f => f.type.startsWith('image/'));
    if (next.length === 0) { setError('Chỉ chấp nhận file ảnh'); return; }
    setError('');
    setFiles(prev => [...prev, ...next]);
    next.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (idx: number) => {
    if (!isAllowedToManage) return;
    const isExisting = idx < existingImages.length;
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles(prev => prev.filter((_, i) => i !== (idx - existingImages.length)));
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToManage) return;
    if (!projectCode) { setError('Vui lòng chọn dự án'); return; }
    if (files.length === 0 && existingImages.length === 0 && !editLog) { setError('Vui lòng chọn ít nhất 1 ảnh'); return; }
    setIsUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `cccd/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('titsmart-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('titsmart-images').getPublicUrl(filePath);
        urls.push(publicUrl);
      }
      const timestampIso = logDate ? new Date(`${logDate}T12:00:00`).toISOString() : new Date().toISOString();
      if (editLog && onUpdate) {
        await onUpdate(editLog.id, { note, images: urls, existingImages, taskId, timestamp: timestampIso });
      } else {
        await onUpload({ projectCode, note, images: urls, taskId, timestamp: timestampIso });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(`Lỗi: ${err.message || JSON.stringify(err)}`);
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={editLog ? (isAllowedToManage ? 'Sửa ảnh hiện trường' : 'Chi tiết ảnh hiện trường (Chỉ xem)') : 'Upload ảnh hiện trường'} icon="add_a_photo" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {!isAllowedToManage && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-amber-600">lock</span>
            <span>Bạn đang xem ở chế độ chỉ đọc. Chỉ người tạo ({editLog?.createdByName || editLog?.updatedBy || 'Chính chủ'}) hoặc Quản trị viên mới có quyền chỉnh sửa/xóa nhật ký này.</span>
          </div>
        )}

        <fieldset disabled={!isAllowedToManage} className="flex flex-col gap-4">
          {/* Dự án */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dự án</label>
            <div className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 cursor-not-allowed">
              {projects.find(p => p.code === projectCode)?.name || projectCode}
            </div>
          </div>

          {/* Ảnh */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Ảnh hiện trường *</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img src={url} alt="preview" className="h-full w-full object-cover" />
                  {isAllowedToManage && (
                    <button type="button" onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600 cursor-pointer">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  )}
                </div>
              ))}
              {isAllowedToManage && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-primary transition cursor-pointer">
                  <span className="material-symbols-outlined mb-0.5 text-lg">add_photo_alternate</span>
                  <span className="text-[10px] font-bold">Thêm ảnh</span>
                </button>
              )}
            </div>
            {isAllowedToManage && (
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
            )}
            {files.length > 0 && (
              <p className="mt-2 text-[11px] font-semibold text-slate-500">{files.length} ảnh đã chọn</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Đầu mục công việc</label>
            <CustomSelect
              disabled={!isAllowedToManage}
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            >
              <option value="">-- Không liên kết --</option>
              {tasks.filter(t => t.projectCode === projectCode).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </CustomSelect>
          </div>

          {/* Thời gian thi công */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Thời gian thi công / Ngày báo cáo *</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-slate-800 font-semibold"
            />
            <p className="mt-1 text-[11px] text-slate-400">Tùy chọn ngày thực tế thi công (ví dụ: báo cáo bổ sung cho các ngày trước)</p>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Mô tả nội dung hiện trường (tùy chọn)..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
          </div>
        </fieldset>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
            {!isAllowedToManage ? 'Đóng' : 'Hủy'}
          </button>
          {isAllowedToManage && (
            <button type="submit" disabled={isUploading}
              className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer">
              {isUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  {editLog ? 'Cập nhật' : 'Upload'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const FieldLogsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { fieldLogs, projects, tasks, addFieldLog, deleteFieldLog, updateFieldLog, fetchFieldLogs } = useRealtimeStore();

  const resolvedProjectCode = useMemo(() => {
    if (!projectId) return '';
    const proj = projects.find(p => p.id === projectId || p.code === projectId);
    return proj ? proj.code : projectId;
  }, [projectId, projects]);

  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    if (resolvedProjectCode) {
      setSelectedProject(resolvedProjectCode);
    }
  }, [resolvedProjectCode]);

  useEffect(() => {
    const pParam = searchParams.get('project');
    if (pParam) {
      setSelectedProject(pParam);
    }
  }, [searchParams]);

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalNode(document.getElementById('project-header-actions')); }, []);
  const [showMobileExportMenu, setShowMobileExportMenu] = useState(false);
  const [showDesktopExportMenu, setShowDesktopExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTaskId, setUploadTaskId] = useState<string>('');
  const [editLog, setEditLog] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    fetchFieldLogs();
  }, [fetchFieldLogs]);

  const visibleLogs = useMemo(() => {
    const sorted = [...fieldLogs].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (!selectedProject) return sorted;
    return sorted.filter(l => l.projectCode === selectedProject);
  }, [fieldLogs, selectedProject]);

  const logsByProject = useMemo(() => {
    const groups = new Map<string, FieldLog[]>();
    for (const log of visibleLogs) {
      const arr = groups.get(log.projectCode) || [];
      arr.push(log);
      groups.set(log.projectCode, arr);
    }
    return Array.from(groups.entries());
  }, [visibleLogs]);

  const projectName = (code: string) => projects.find(p => p.code === code)?.name || code;
  const totalImages = visibleLogs.reduce((sum, l) => sum + l.images.length, 0);

  const handleDeleteLog = async (log: FieldLog) => {
    if (!canManageItem(user, log)) {
      alert("Bạn không có quyền xóa nhật ký này (Chỉ người tạo hoặc Quản trị viên mới có quyền xóa)!");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa nhật ký này?")) {
      try {
        await deleteFieldLog(log.id);
      } catch (err) {
        alert("Lỗi khi xóa nhật ký.");
      }
    }
  };

  const handleUpload = async (input: { projectCode: string; note: string; images: string[]; taskId?: string }) => {
    await addFieldLog({
      ...input,
      createdById: user?.id,
      createdByName: user?.name || user?.username,
    });
    await fetchFieldLogs();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteFieldLog(deletingId);
    } catch (e) {
      console.error(e);
    }
    setDeletingId(null);
  };

  const handleExportExcel = () => {
    try {
      const logsToExport = visibleLogs;
      if (logsToExport.length === 0) {
        alert('Không có dữ liệu nhật ký hiện trường để xuất Excel.');
        return;
      }

      const rows: any[] = [];
      logsToExport.forEach((l, index) => {
        const task = tasks.find(t => t.id === l.taskId);
        rows.push({
          'STT': index + 1,
          'Mã dự án': l.projectCode,
          'Mã / STT Hạng mục': task?.stt || '-',
          'Nội dung công việc': task?.name || 'Cập nhật chung',
          'Thời gian thi công': new Date(l.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          'Giờ cập nhật': new Date(l.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          'Nội dung nhật ký': l.note || '(Chỉ có ảnh)',
          'Số lượng ảnh': l.images?.length || 0,
          'Người cập nhật': l.updatedBy || 'Hệ thống',
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'NhatKyHienTruong');
      
      const fileName = `NhatKyHienTruong_${selectedProject || 'TatCa'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err: any) {
      console.error(err);
      alert(`Lỗi khi xuất file Excel: ${err.message || 'Không xác định'}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-100 overflow-hidden">
      {/* Header */}
      {!projectId && (
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-4 md:py-0 md:h-12 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between h-full">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">NHẬT KÝ HIỆN TRƯỜNG</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 md:w-60">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Tìm nhật ký..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all h-9"
                />
              </div>

              <CustomSelect value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                className="max-w-xs flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-64">
                <option value="">Tất cả dự án</option>
                {projects.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </CustomSelect>

              <button onClick={handleExportExcel}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100 transition-all">
                <span className="material-symbols-outlined text-lg">download</span>
                Xuất Excel
              </button>
            </div>
          </div>
        </header>
      )}

      {projectId && portalNode && createPortal(
        <div className="flex items-center gap-1.5 flex-nowrap w-full">
          {/* Search Input for Desktop & Mobile */}
          <div className="relative flex-1 min-w-0 md:w-56 md:flex-initial">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Tìm nhật ký..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all h-8"
            />
          </div>

          {/* Desktop Export File Dropdown Menu */}
          <div className="relative hidden md:block">
            <button 
              onClick={() => setShowDesktopExportMenu(!showDesktopExportMenu)} 
              className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 h-[34px] px-3.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">file_download</span>
              Xuất file
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>
            {showDesktopExportMenu && (
              <div className="fixed inset-0 z-40" onClick={() => setShowDesktopExportMenu(false)} />
            )}
            {showDesktopExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in duration-100">
                <button
                  onClick={() => {
                    setShowDesktopExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    setShowDesktopExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                >
                  <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                  CSV (.csv)
                </button>
                <button
                  onClick={() => {
                    setShowDesktopExportMenu(false);
                    window.print();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                >
                  <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                  PDF (.pdf)
                </button>
                <button
                  onClick={() => {
                    setShowDesktopExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                >
                  <span className="material-symbols-outlined text-base text-blue-600">description</span>
                  Word (.docx)
                </button>
              </div>
            )}
          </div>

          {/* Mobile Export File Dropdown Menu */}
          <div className="relative md:hidden shrink-0">
            <button
              onClick={() => setShowMobileExportMenu(!showMobileExportMenu)}
              className="flex items-center justify-center h-8 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-xs gap-0.5"
              title="Xuất file"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>
            {showMobileExportMenu && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMobileExportMenu(false)}
              />
            )}
            {showMobileExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in duration-100">
                <button
                  onClick={() => {
                    setShowMobileExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    setShowMobileExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                  CSV (.csv)
                </button>
                <button
                  onClick={() => {
                    setShowMobileExportMenu(false);
                    window.print();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                  PDF (.pdf)
                </button>
                <button
                  onClick={() => {
                    setShowMobileExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                >
                  <span className="material-symbols-outlined text-base text-blue-600">description</span>
                  Word (.docx)
                </button>
              </div>
            )}
          </div>
        </div>
      , portalNode)}

        <div className={`flex flex-col flex-1 min-h-0 ${(logsByProject.length === 0 && !selectedProject) || selectedProject ? '' : 'p-6'}`}>
          {selectedProject ? (
              <div className="flex flex-col flex-1 overflow-hidden bg-white">
                  {!projectId && (
                    <div className="p-2 border-b border-slate-200 bg-slate-50">
                      <button onClick={() => setSelectedProject('')} className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-200 transition flex items-center gap-1 text-sm font-medium">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Quay lại danh sách dự án
                      </button>
                    </div>
                  )}
                
                  <FieldLogsTaskTable 
                    selectedProject={selectedProject} 
                    searchQuery={searchQuery}
                    logs={logsByProject.find(p => p[0] === selectedProject)?.[1] || []} 
                    onAddLogClick={(tid) => {
                      setUploadTaskId(tid);
                      setIsUploadOpen(true);
                    }}
                    onEditLogClick={(log) => setEditLog(log)}
                    onDeleteLogClick={handleDeleteLog}
                  />
                </div>
              ) : logsByProject.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white flex-1 text-slate-400">
              <span className="material-symbols-outlined text-5xl">photo_library</span>
              <p className="text-sm font-bold">Chưa có ảnh hiện trường</p>
              <p className="text-xs">Nhấn <strong className="text-primary">Upload ảnh</strong> để thêm ảnh cho dự án</p>
            </div>
          ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {logsByProject.map(([projectCode, logs]) => {
                  const latestLog = logs[0];
                  if (!latestLog) return null;
                  const previewImages = logs.flatMap(l => l.images).slice(0, 4);
                  return (
                  <div key={projectCode} onClick={() => setSelectedProject(projectCode)} className="group cursor-pointer flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex flex-col p-5 border-b border-slate-100 bg-slate-50 group-hover:bg-primary/5 transition-colors">
                      <h3 className="font-bold text-slate-800 uppercase text-[14px] tracking-wide mb-1 truncate group-hover:text-primary transition-colors">
                        {projectName(projectCode)}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{logs.length} bản ghi nhật ký</p>
                    </div>

                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div className="mb-4">
                        <div className="flex items-center text-xs text-slate-400 mb-2">
                          <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                          Cập nhật: {formatTimeOnly(latestLog.timestamp)}
                        </div>
                        {latestLog.note && <p className="text-sm text-slate-600 line-clamp-2">{latestLog.note}</p>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {previewImages.map((img, i) => (
                          <div key={i} className="h-10 w-10 rounded bg-slate-100 overflow-hidden border border-slate-200">
                            <img src={img} className="h-full w-full object-cover" />
                          </div>
                        ))}
                        {logs.flatMap(l => l.images).length > 4 && (
                          <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-500 border border-slate-200">
                            +{logs.flatMap(l => l.images).length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
        </div>

      {/* Upload Modal */}
      {(isUploadOpen || editLog) && (
        <UploadModal
          defaultProjectCode={selectedProject}
            defaultTaskId={uploadTaskId}
          projects={projects}
          editLog={editLog}
          onClose={() => { setIsUploadOpen(false); setEditLog(null); setUploadTaskId(''); }}
          onUpload={handleUpload}
          onUpdate={async (id, input) => {
            if (updateFieldLog) await updateFieldLog(id, input);
            await fetchFieldLogs();
          }}
          onDelete={async (id) => {
            await deleteFieldLog(id);
            setEditLog(null);
          }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(l => l ? { ...l, index: l.index - 1 } : l)}
          onNext={() => setLightbox(l => l ? { ...l, index: l.index + 1 } : l)} />
      )}

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message="Xóa báo cáo này? Các ảnh trong báo cáo sẽ bị xóa vĩnh viễn."
        confirmText="Xóa báo cáo"
        icon="delete"
      />
    </div>
  );
};
