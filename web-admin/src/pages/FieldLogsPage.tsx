import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { useParams, useOutletContext, Link } from 'react-router-dom';
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
  onUpload: (input: { projectCode: string; note: string; images: string[]; taskId?: string }) => Promise<void>;
  onUpdate?: (id: string, input: { note: string; images: string[]; existingImages: string[]; taskId?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}> = ({ defaultProjectCode, defaultTaskId, projects, editLog, onClose, onUpload, onUpdate, onDelete }) => {
  const [projectCode, setProjectCode] = useState(editLog?.projectCode || defaultProjectCode || '');
  const [note, setNote] = useState(editLog?.note || '');
  const [taskId, setTaskId] = useState(editLog?.taskId || defaultTaskId || '');
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
      if (editLog && onUpdate) {
        await onUpdate(editLog.id, { note, images: urls, existingImages, taskId });
      } else {
        await onUpload({ projectCode, note, images: urls, taskId });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(`Lỗi: ${err.message || JSON.stringify(err)}`);
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={editLog ? 'Sửa ảnh hiện trường' : 'Upload ảnh hiện trường'} icon="add_a_photo" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
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
                <button type="button" onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-primary transition">
              <span className="material-symbols-outlined mb-0.5 text-lg">add_photo_alternate</span>
              <span className="text-[10px] font-bold">Thêm ảnh</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
          {files.length > 0 && (
            <p className="mt-2 text-[11px] font-semibold text-slate-500">{files.length} ảnh đã chọn</p>
          )}
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Đầu mục công việc</label>
          <CustomSelect
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

        {/* Ghi chú */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Mô tả nội dung hiện trường (tùy chọn)..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isUploading}
            className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2">
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
        </div>
      </form>
    </Modal>
  );
};
// ── Main page ─────────────────────────────────────────────────────────────────

export const FieldLogsPage: React.FC = () => {
  const { projectId } = useParams();
  const { fieldLogs, projects, addFieldLog, deleteFieldLog, updateFieldLog, fetchFieldLogs } = useRealtimeStore();

  const resolvedProjectCode = useMemo(() => {
    if (!projectId) return '';
    const proj = projects.find(p => p.id === projectId || p.code === projectId);
    return proj ? proj.code : '';
  }, [projectId, projects]);

  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    if (resolvedProjectCode) {
      setSelectedProject(resolvedProjectCode);
    }
  }, [resolvedProjectCode]);
  const outletContext = useOutletContext<any>();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalNode(document.getElementById('project-header-actions')); }, []);
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
    if (window.confirm("Bạn có chắc chắn muốn xóa nhật ký này?")) {
      try {
        await deleteFieldLog(log.id);
      } catch (err) {
        alert("Lỗi khi xóa nhật ký.");
      }
    }
  };

  const handleUpload = async (input: { projectCode: string; note: string; images: string[]; taskId?: string }) => {
    await addFieldLog(input);
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
              <CustomSelect value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                className="max-w-xs flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-64">
                <option value="">Tất cả dự án</option>
                {projects.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </CustomSelect>
              <button onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95">
                <span className="material-symbols-outlined text-lg">add_a_photo</span>
                Upload ảnh
              </button>
            </div>
          </div>
        </header>
      )}

      {projectId && portalNode && createPortal(
        <button onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-white shadow-sm hover:opacity-90 active:scale-95 mr-4">
          <span className="material-symbols-outlined text-[14px]">add_a_photo</span>
          Upload ảnh
        </button>
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
