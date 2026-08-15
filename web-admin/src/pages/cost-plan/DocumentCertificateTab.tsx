import React, { useState, useEffect } from 'react';
import { ProjectMaterialPlan } from '../../types';
import { ImageUpload } from '../../components/common/ImageUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentCertificateTabProps {
  data: ProjectMaterialPlan[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedProject: string;
  onAdd: (plan: Omit<ProjectMaterialPlan, 'id'>) => void;
  onUpdate: (id: string, fields: Partial<ProjectMaterialPlan>) => void;
  onDelete: (id: string) => void;
  /** Page truyền true để kích hoạt mở modal thêm mới */
  triggerAdd?: boolean;
  /** Tab gọi callback này sau khi đã xử lý triggerAdd */
  onTriggerHandled?: () => void;
}

// Một dòng chứng từ do người dùng tự đặt tên
interface DocItem {
  text: string; // VD: "C/O số: E267049658120001 cấp ngày 22/02/2025"
  fileUrls?: string[]; // Array of uploaded URLs (PDF/Image)
}

// Mỗi model/xuất xứ có danh sách chứng từ động
interface ModelEntry {
  model: string;
  manufacturer: string;
  origin: string;
  docs: DocItem[];
}

interface FormState {
  jobContent: string;
  unit: string;
  contractVolume: number;
  models: ModelEntry[];
  notes: string;
}

const EMPTY_DOC: DocItem = { text: '' };

const EMPTY_MODEL: ModelEntry = {
  model: '', manufacturer: '', origin: '',
  docs: [{ ...EMPTY_DOC }],
};

const EMPTY_FORM: FormState = {
  jobContent: '', unit: 'Cái', contractVolume: 1,
  models: [{ ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }],
  notes: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOC_TRACK_TAG = '[doc-track]';

const isDocTrack = (item: ProjectMaterialPlan) =>
  String(item.notes || '').includes(DOC_TRACK_TAG);

const cleanNotes = (value?: string) =>
  String(value || '').replace(/\s*\[doc-track\]\s*/gi, '').trim();

export const encodeModels = (models: ModelEntry[]): string => {
  const nonEmpty = models.filter(m =>
    m.model || m.manufacturer || m.origin || m.docs.some(d => d.text.trim() || (d.fileUrls && d.fileUrls.length > 0))
  );
  return nonEmpty.length ? JSON.stringify(nonEmpty) : '';
};

const decodeModels = (issueContent?: string): ModelEntry[] => {
  if (!issueContent) return [{ ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }];
  try {
    const parsed = JSON.parse(issueContent);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Migration: nếu entry cũ dùng field cứng, convert sang docs array
      return (parsed as any[]).map(m => {
        if (Array.isArray(m.docs)) return m as ModelEntry;
        const legacyDocs: DocItem[] = [];
        if (m.co)         legacyDocs.push({ text: `C/O số: ${m.co}` });
        if (m.cq)         legacyDocs.push({ text: `C/Q số: ${m.cq}` });
        if (m.fire)       legacyDocs.push({ text: `Kiểm định PCCC số: ${m.fire}` });
        if (m.xuatXuống)  legacyDocs.push({ text: `Giấy CN xuất xưởng: ${m.xuatXuống}` });
        if (m.packing)    legacyDocs.push({ text: `Packing list số: ${m.packing}` });
        if (m.cl)         legacyDocs.push({ text: `Chứng nhận chất lượng: ${m.cl}` });
        if (m.other)      legacyDocs.push({ text: `Chứng từ khác: ${m.other}` });
        return { model: m.model || '', manufacturer: m.manufacturer || '', origin: m.origin || '',
          docs: legacyDocs.length ? legacyDocs : [{ ...EMPTY_DOC }] } as ModelEntry;
      });
    }
  } catch { /* ignore */ }
  return [{ ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }];
};

const firstModel = (models: ModelEntry[]): ModelEntry =>
  models[0] ?? { ...EMPTY_MODEL, docs: [] };

const hasAnyDoc = (m: ModelEntry) =>
  m.docs.some(d => d.text.trim());

// ── Sub-components ────────────────────────────────────────────────────────────

const inp = 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const DocLine = ({ text }: { text: string }) => {
  if (!text.trim()) return null;
  return (
    <div className="flex items-start gap-1.5 text-[11px] leading-snug">
      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
      <span className="text-slate-600">{text}</span>
    </div>
  );
};

interface ModelBlockProps {
  index: number;
  entry: ModelEntry;
  total: number;
  onChange: (mIdx: number, field: keyof Omit<ModelEntry, 'docs'>, value: string) => void;
  onRemoveModel: (mIdx: number) => void;
  onDocChange: (mIdx: number, dIdx: number, value: string) => void;
  onAddDoc: (mIdx: number) => void;
  onRemoveDoc: (mIdx: number, dIdx: number) => void;
  onDocFilesChange: (mIdx: number, dIdx: number, urls: string[]) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
}

const ModelBlock: React.FC<ModelBlockProps> = ({
  index, entry, total, onChange, onRemoveModel, onDocChange, onAddDoc, onRemoveDoc, onDocFilesChange, onUploadStateChange
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
    {/* Block header */}
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
        Model #{index + 1}
      </span>
      {total > 1 && (
        <button type="button" onClick={() => onRemoveModel(index)}
          className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition">
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      )}
    </div>

    {/* Model / Hãng SX / Xuất xứ */}
    <div className="grid grid-cols-3 gap-2">
      {([ ['model', 'Model / Chủng loại', 'VD: KPR50-250/22'],
          ['manufacturer', 'Hãng sản xuất', 'VD: Windy, Hochiki...'],
          ['origin', 'Xuất xứ', 'VD: Việt Nam, Nhật...'],
      ] as [keyof Omit<ModelEntry,'docs'>, string, string][]).map(([field, label, ph]) => (
        <div key={field}>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
          <input type="text" className={`w-full ${inp}`} value={entry[field]}
            onChange={e => onChange(index, field, e.target.value)} placeholder={ph} />
        </div>
      ))}
    </div>

    {/* Chứng từ động */}
    <div className="space-y-3 pt-2 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chứng từ đi kèm</p>
        <button type="button" onClick={() => onAddDoc(index)}
          className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-sm">add</span>
          Thêm dòng
        </button>
      </div>

      {entry.docs.map((doc, dIdx) => (
        <div key={dIdx} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <input type="text" className={`flex-1 ${inp}`}
              value={doc.text}
              onChange={e => onDocChange(index, dIdx, e.target.value)}
              placeholder="VD: C/O số E267049658120001 cấp ngày 22/02/2025" />
            {entry.docs.length > 1 && (
              <button type="button" onClick={() => onRemoveDoc(index, dIdx)}
                className="flex-shrink-0 rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
          <div>
            <ImageUpload 
              label="Đính kèm file (Ảnh/PDF)"
              multiple={true}
              value={doc.fileUrls || []}
              onChange={(urls) => {
                let urlArray: string[] = [];
                if (Array.isArray(urls)) {
                  urlArray = urls;
                } else if (typeof urls === 'string' && urls.trim() !== '') {
                  urlArray = urls.split(',').filter(Boolean);
                }
                onDocFilesChange(index, dIdx, urlArray);
              }}
              onUploadStateChange={onUploadStateChange}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Modal ─────────────────────────────────────────────────────────────────────

interface DocFormModalProps {
  title: string;
  initial: FormState;
  onClose: () => void;
  onSubmit: (data: FormState) => void;
}

const DocFormModal: React.FC<DocFormModalProps> = ({ title, initial, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>({
    ...initial,
    models: initial.models.map(m => ({ ...m, docs: m.docs.map(d => ({ ...d })) })),
  });

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateModel = (mIdx: number, field: keyof Omit<ModelEntry, 'docs'>, value: string) =>
    setForm(prev => ({
      ...prev,
      models: prev.models.map((m, i) => i === mIdx ? { ...m, [field]: value } : m),
    }));

  const addModel = () =>
    setForm(prev => ({
      ...prev,
      models: [...prev.models, { ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }],
    }));

  const removeModel = (mIdx: number) =>
    setForm(prev => ({ ...prev, models: prev.models.filter((_, i) => i !== mIdx) }));

  const updateDoc = (mIdx: number, dIdx: number, value: string) =>
    setForm(prev => ({
      ...prev,
      models: prev.models.map((m, i) =>
        i !== mIdx ? m : {
          ...m,
          docs: m.docs.map((d, j) => j === dIdx ? { ...d, text: value } : d),
        }
      ),
    }));

  const updateDocFiles = (mIdx: number, dIdx: number, urls: string[]) =>
    setForm(prev => ({
      ...prev,
      models: prev.models.map((m, i) =>
        i !== mIdx ? m : {
          ...m,
          docs: m.docs.map((d, j) => j === dIdx ? { ...d, fileUrls: urls } : d),
        }
      ),
    }));

  const addDoc = (mIdx: number) =>
    setForm(prev => ({
      ...prev,
      models: prev.models.map((m, i) =>
        i !== mIdx ? m : { ...m, docs: [...m.docs, { ...EMPTY_DOC }] }
      ),
    }));

  const removeDoc = (mIdx: number, dIdx: number) =>
    setForm(prev => ({
      ...prev,
      models: prev.models.map((m, i) =>
        i !== mIdx ? m : { ...m, docs: m.docs.filter((_, j) => j !== dIdx) }
      ),
    }));

  const [isUploading, setIsUploading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobContent.trim() || isUploading) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">

        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <span className="material-symbols-outlined text-base text-primary">description</span>
            {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
          <div className="overflow-y-auto flex-1 p-5 space-y-5">

            {/* 1. Tên thiết bị */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-primary mb-2">
                Tên thiết bị / Hàng hóa <span className="text-rose-500 normal-case font-normal">*</span>
              </label>
              <input type="text" required value={form.jobContent}
                onChange={e => setField('jobContent', e.target.value)}
                placeholder="VD: Máy bơm diesel, Bình CO2 loại 24kg..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            {/* 2. Đơn vị + SL */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Đơn vị tính</label>
                <input type="text" value={form.unit} onChange={e => setField('unit', e.target.value)}
                  className={`w-full ${inp}`} placeholder="Cái, Bộ, Mét..." />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Số lượng</label>
                <input type="number" min={0} step="any" value={form.contractVolume}
                  onChange={e => setField('contractVolume', Number(e.target.value))}
                  className={`w-full ${inp}`} />
              </div>
            </div>

            {/* 3. Danh sách model */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Model / Xuất xứ & Chứng từ</p>
                <button type="button" onClick={addModel}
                  className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition">
                  <span className="material-symbols-outlined text-sm">add</span>Thêm model
                </button>
              </div>
              <div className="space-y-3">
                {form.models.map((entry, i) => (
                  <ModelBlock key={i} index={i} entry={entry} total={form.models.length}
                    onChange={updateModel} onRemoveModel={removeModel}
                    onDocChange={updateDoc} onAddDoc={addDoc} onRemoveDoc={removeDoc}
                    onDocFilesChange={updateDocFiles}
                    onUploadStateChange={setIsUploading} />
                ))}
              </div>
            </div>

            {/* 4. Ghi chú */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Ghi chú</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>

          <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={isUploading}
              className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:opacity-90 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isUploading ? 'Đang tải file...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const DocumentCertificateTab: React.FC<DocumentCertificateTabProps> = ({
  data, searchQuery, setSearchQuery, selectedProject, onAdd, onUpdate, onDelete,
  triggerAdd, onTriggerHandled,
}) => {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<ProjectMaterialPlan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Khi page bấm nút "Thêm Mới" ở tab DOCUMENTS, triggerAdd = true → mở modal
  useEffect(() => {
    if (triggerAdd) {
      setModalMode('add');
      setEditingItem(null);
      onTriggerHandled?.();
    }
  }, [triggerAdd]);
  const rows = data.filter(item => isDocTrack(item));

  const nextStt = String(rows.length + 1);
  const openAdd  = () => { setEditingItem(null);  setModalMode('add');  };
  const openEdit = (item: ProjectMaterialPlan) => { setEditingItem(item); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditingItem(null); };

  const buildPayload = (formData: FormState, stt: string) => {
    const fm = firstModel(formData.models);
    return {
      stt,
      jobContent: formData.jobContent,
      unit: formData.unit,
      contractVolume: formData.contractVolume,
      techSpecModel: fm.model,
      techSpecOrigin: [fm.manufacturer, fm.origin].filter(Boolean).join(' - '),
      issueContent: encodeModels(formData.models),
      docCo: formData.models.some(m => m.docs.some(d => d.text.toLowerCase().includes('c/o') && d.text.trim())),
      docCq: formData.models.some(m => m.docs.some(d => d.text.toLowerCase().includes('c/q') && d.text.trim())),
      docFireInspection: formData.models.some(m => m.docs.some(d => d.text.toLowerCase().includes('pccc') && d.text.trim())),
      notes: formData.notes ? `${formData.notes} ${DOC_TRACK_TAG}` : DOC_TRACK_TAG,
    };
  };

  const handleSubmit = (formData: FormState) => {
    if (modalMode === 'add') {
      onAdd({ projectCode: selectedProject, progressStatus: 'Chưa thi công',
        orderedStatus: 'Chưa đặt hàng', ...buildPayload(formData, nextStt) });
    } else if (modalMode === 'edit' && editingItem) {
      onUpdate(editingItem.id, buildPayload(formData, editingItem.stt || ''));
    }
    closeModal();
  };

  const toFormState = (item: ProjectMaterialPlan): FormState => ({
    jobContent: item.jobContent || '',
    unit: item.unit || 'Cái',
    contractVolume: item.contractVolume ?? 1,
    models: decodeModels(item.issueContent),
    notes: cleanNotes(item.notes),
  });

  const renderModelCell = (item: ProjectMaterialPlan) => {
    const models = decodeModels(item.issueContent);
    return (
      <div className="space-y-1">
        {models.map((m, i) => (
          (m.model || m.manufacturer || m.origin) ? (
            <div key={i} className={i > 0 ? 'pt-1 border-t border-slate-100' : ''}>
              {m.model && <div className="font-semibold text-slate-800 break-words text-xs">{m.model}</div>}
              {(m.manufacturer || m.origin) && (
                <div className="text-[11px] text-slate-500 break-words">
                  {[m.manufacturer, m.origin].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          ) : null
        ))}
      </div>
    );
  };

  const renderDocsCell = (item: ProjectMaterialPlan) => {
    const models = decodeModels(item.issueContent);
    const allEmpty = models.every(m => !hasAnyDoc(m));
    if (allEmpty) return <span className="text-[11px] text-slate-400 italic">Chưa có</span>;
    return (
      <div className="space-y-2">
        {models.map((m, i) => !hasAnyDoc(m) ? null : (
          <div key={i} className={i > 0 ? 'pt-2 border-t border-slate-100' : ''}>
            {models.length > 1 && m.model && (
              <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-0.5">{m.model}</p>
            )}
            <div className="space-y-1">
              {m.docs.map((d, j) => (
                <div key={j} className="flex flex-col gap-0.5">
                  <DocLine text={d.text} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFilesCell = (item: ProjectMaterialPlan) => {
    const models = decodeModels(item.issueContent);
    const hasAnyFile = models.some(m => m.docs.some(d => d.fileUrls && d.fileUrls.length > 0));
    if (!hasAnyFile) return <span className="text-[11px] text-slate-400 italic text-center block">-</span>;
    
    return (
      <div className="space-y-2">
        {models.map((m, i) => {
          const hasFiles = m.docs.some(d => d.fileUrls && d.fileUrls.length > 0);
          if (!hasFiles) return null;
          
          return (
            <div key={i} className={i > 0 ? 'pt-2 border-t border-slate-100' : ''}>
              {models.length > 1 && m.model && (
                <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-0.5">{m.model}</p>
              )}
              <div className="space-y-1">
                {m.docs.map((d, j) => {
                  if (!d.fileUrls || d.fileUrls.length === 0) return null;
                  
                  // Fix backward compatibility for URLs saved as comma-separated strings
                  const cleanUrls = d.fileUrls.flatMap(url => url.split(',').filter(Boolean));
                  if (cleanUrls.length === 0) return null;

                  return (
                    <div key={j} className="flex flex-wrap gap-1.5">
                      {cleanUrls.map((url, uIdx) => {
                        const isPdf = url.toLowerCase().endsWith('.pdf');
                        return (
                          <a key={uIdx} href={url} target="_blank" rel="noreferrer" 
                            className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 hover:text-primary transition"
                            title="Xem tệp đính kèm"
                          >
                            <span className="material-symbols-outlined text-[12px] text-rose-500">{isPdf ? 'picture_as_pdf' : 'image'}</span>
                            File {uIdx + 1}
                          </a>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex w-full max-w-full h-full min-h-0 flex-col bg-white overflow-hidden">
      <div className="w-full overflow-x-auto custom-scrollbar flex-1 min-h-0">
        <table className="w-max min-w-full border-collapse text-left">
          <colgroup>
            <col className="w-10" /><col className="w-[180px]" /><col className="w-12" />
            <col className="w-12" /><col className="w-[200px]" /><col className="w-[220px]" />
            <col className="w-[160px]" /><col className="w-[140px]" /><col className="w-20" />
          </colgroup>
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
            <tr>
              <th className="sticky left-0 z-20 w-10 min-w-[40px] bg-slate-50 bg-clip-padding px-2 py-3 text-center border-r border-slate-200/70">TT</th>
              <th className="sticky left-[40px] z-20 bg-slate-50 bg-clip-padding px-2 py-3 border-r border-slate-200/70 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Tên thiết bị / Hàng hóa</th>
              <th className="px-2 py-3 text-center">ĐV</th>
              <th className="px-2 py-3 text-right">SL</th>
              <th className="px-2 py-3">Model / Xuất xứ</th>
              <th className="px-2 py-3">Chứng từ</th>
              <th className="px-2 py-3">File đính kèm</th>
              <th className="px-2 py-3">Ghi chú</th>
              <th className="px-2 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
            {rows.map((item, index) => (
              <tr key={item.id} onDoubleClick={() => openEdit(item)} className="group align-top hover:bg-slate-50/60 cursor-pointer">
                <td className="sticky left-0 z-10 w-10 min-w-[40px] bg-white group-hover:bg-slate-50/60 border-r border-slate-100 px-2 py-2.5 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                <td className="sticky left-[40px] z-10 bg-white group-hover:bg-slate-50/60 border-r border-slate-100 px-2 py-2.5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-bold text-slate-900">
                  <div className="w-[165px] line-clamp-3 break-words leading-snug" title={item.jobContent}>{item.jobContent}</div>
                </td>
                <td className="px-2 py-2.5 text-center font-mono text-slate-500 whitespace-nowrap">{item.unit || '-'}</td>
                <td className="px-2 py-2.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                  {item.contractVolume ? Number(item.contractVolume).toLocaleString('vi-VN') : '-'}
                </td>
                <td className="px-2 py-2.5">{renderModelCell(item)}</td>
                <td className="px-2 py-2.5">{renderDocsCell(item)}</td>
                <td className="px-2 py-2.5">{renderFilesCell(item)}</td>
                <td className="px-2 py-2.5 text-[11px] text-slate-500 break-words">{cleanNotes(item.notes) || '-'}</td>
                <td className="px-2 py-2.5 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(item.id); }} title="Xóa"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-14 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <span className="material-symbols-outlined text-4xl">description</span>
                  <p className="text-sm font-medium">Chưa có dữ liệu chứng từ</p>
                  <p className="text-xs">Nhấn <strong className="text-primary">+ Thêm mới</strong> để bắt đầu</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <DocFormModal
          title={modalMode === 'add' ? 'Thêm chứng từ mới' : 'Chỉnh sửa hàng hóa'}
          initial={modalMode === 'edit' && editingItem
            ? toFormState(editingItem)
            : { ...EMPTY_FORM, models: [{ ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }] }}
          onClose={closeModal} onSubmit={handleSubmit} />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 p-6 w-full max-w-sm text-center space-y-4">
            <span className="material-symbols-outlined text-4xl text-rose-500">delete_forever</span>
            <p className="text-sm font-bold text-slate-800">Xác nhận xóa hàng hóa này?</p>
            <p className="text-xs text-slate-500">Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-3 pt-1">
              <button onClick={() => setDeletingId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
              <button onClick={() => { onDelete(deletingId); setDeletingId(null); }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 active:scale-95">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
