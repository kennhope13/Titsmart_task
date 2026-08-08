import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { FieldLog } from '../types';

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
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
};

// ── Lightbox ──────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{ images: string[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void }> = ({
  images, index, onClose, onPrev, onNext,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition">
      <span className="material-symbols-outlined">close</span>
    </button>
    {index > 0 && (
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition">
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
    )}
    <img src={images[index]} alt="Ảnh hiện trường" className="max-h-[88vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
    {index < images.length - 1 && (
      <button onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition">
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    )}
    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
      {index + 1} / {images.length}
    </span>
  </div>
);

// ── Upload Modal ──────────────────────────────────────────────────────────────

const UploadModal: React.FC<{
  defaultProjectCode: string;
  projects: { code: string; name: string }[];
  onClose: () => void;
  onUpload: (input: { projectCode: string; note: string; images: File[] }) => Promise<void>;
}> = ({ defaultProjectCode, projects, onClose, onUpload }) => {
  const [projectCode, setProjectCode] = useState(defaultProjectCode || '');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
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
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectCode) { setError('Vui lòng chọn dự án'); return; }
    if (files.length === 0) { setError('Vui lòng chọn ít nhất 1 ảnh'); return; }
    setIsUploading(true);
    setError('');
    try {
      await onUpload({ projectCode, note, images: files });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Upload thất bại. Vui lòng kiểm tra kết nối và thử lại.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <span className="material-symbols-outlined text-base text-primary">add_a_photo</span>
            Upload ảnh hiện trường
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Dự án */}
            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Dự án <span className="text-rose-500 normal-case font-normal">*</span>
              </label>
              <select required value={projectCode}
                onChange={e => setProjectCode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">-- Chọn dự án --</option>
                {projects.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>

            {/* Ảnh */}
            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Ảnh hiện trường <span className="text-rose-500 normal-case font-normal">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img src={url} alt="preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600">
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-primary transition">
                  <span className="material-symbols-outlined mb-0.5 text-xl">add_photo_alternate</span>
                  <span className="text-[10px] font-bold">Thêm ảnh</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
              {files.length > 0 && (
                <p className="mt-2 text-[11px] font-semibold text-slate-500">{files.length} ảnh đã chọn</p>
              )}
            </div>

            {/* Ghi chú */}
            <div>
              <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-primary">Ghi chú</label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Mô tả nội dung hiện trường (tùy chọn)..."
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p>}
          </div>

          <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={isUploading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
              {isUploading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Đang upload...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">upload</span>
                  Upload
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const FieldLogsPage: React.FC = () => {
  const { fieldLogs, projects, addFieldLog, deleteFieldLog, fetchFieldLogs } = useRealtimeStore();
  const [selectedProject, setSelectedProject] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
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

  const logsByDay = useMemo(() => {
    const groups = new Map<string, FieldLog[]>();
    for (const log of visibleLogs) {
      const day = formatDate(log.timestamp);
      const arr = groups.get(day) || [];
      arr.push(log);
      groups.set(day, arr);
    }
    return Array.from(groups.entries());
  }, [visibleLogs]);

  const projectName = (code: string) => projects.find(p => p.code === code)?.name || code;
  const totalImages = visibleLogs.reduce((sum, l) => sum + l.images.length, 0);

  const handleUpload = async (input: { projectCode: string; note: string; images: File[] }) => {
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
    <div className="flex min-h-full flex-1 flex-col bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-primary">
              <span className="material-symbols-outlined text-2xl">photo_camera</span>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h1 className="text-2xl font-extrabold uppercase text-slate-900">NHẬT KÝ HIỆN TRƯỜNG</h1>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                {visibleLogs.length} báo cáo · {totalImages} ảnh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              className="max-w-xs flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-64">
              <option value="">Tất cả dự án</option>
              {projects.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            <button onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95">
              <span className="material-symbols-outlined text-lg">add_a_photo</span>
              Upload ảnh
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 space-y-8 p-6">
        {logsByDay.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-slate-400 shadow-sm">
            <span className="material-symbols-outlined text-5xl">photo_library</span>
            <p className="text-sm font-bold">Chưa có ảnh hiện trường</p>
            <p className="text-xs">Nhấn <strong className="text-primary">Upload ảnh</strong> để thêm ảnh cho dự án</p>
          </div>
        ) : (
          logsByDay.map(([day, logs]) => (
            <section key={day}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">{day}</h2>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">{logs.length} báo cáo</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {logs.map((log, index) => (
                  <div key={log.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-3 bg-slate-50 p-3">
                      <div className="flex flex-1 items-start gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-600">
                          {(index + 1).toString().padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-700 line-clamp-2">
                            {projectName(log.projectCode)}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                              {formatTimeOnly(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                        className="flex-shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>

                    {/* Note */}
                    {log.note && (
                      <p className="whitespace-pre-wrap border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-600">
                        {log.note}
                      </p>
                    )}

                    {/* Images Grid */}
                    <div className="mt-auto border-t border-slate-100 p-2">
                      <p className="mb-1.5 px-1 text-[10px] font-bold text-slate-400">
                        {log.images.length} ẢNH HIỆN TRƯỜNG
                      </p>
                      <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6">
                        {log.images.map((img, i) => (
                          <button key={i} onClick={() => setLightbox({ images: log.images, index: i })}
                            className="group relative aspect-square overflow-hidden rounded bg-slate-100">
                            <img src={img} alt="Ảnh hiện trường" loading="lazy"
                              className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                              <span className="material-symbols-outlined text-[16px] text-white">zoom_in</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadModal
          defaultProjectCode={selectedProject}
          projects={projects}
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleUpload} />
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
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200">
            <span className="material-symbols-outlined text-4xl text-rose-500">delete_forever</span>
            <p className="text-sm font-bold text-slate-800">Xóa báo cáo này?</p>
            <p className="text-xs text-slate-500">Các ảnh trong báo cáo sẽ bị xóa vĩnh viễn.</p>
            <div className="flex justify-center gap-3 pt-1">
              <button onClick={() => setDeletingId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
              <button onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 active:scale-95">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
