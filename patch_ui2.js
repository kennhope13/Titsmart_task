const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

const s1 = `const UploadModal: React.FC<{
  defaultProjectCode: string;
  projects: { code: string; name: string }[];
  onClose: () => void;
  onUpload: (input: { projectCode: string; note: string; images: string[] }) => Promise<void>;
}> = ({ defaultProjectCode, projects, onClose, onUpload }) => {
  const [projectCode, setProjectCode] = useState(defaultProjectCode || '');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);`;

const r1 = `const UploadModal: React.FC<{
  defaultProjectCode: string;
  projects: { code: string; name: string }[];
  editLog?: any;
  onClose: () => void;
  onUpload: (input: { projectCode: string; note: string; images: string[] }) => Promise<void>;
  onUpdate?: (id: string, input: { note: string; images: string[]; existingImages: string[] }) => Promise<void>;
}> = ({ defaultProjectCode, projects, editLog, onClose, onUpload, onUpdate }) => {
  const [projectCode, setProjectCode] = useState(editLog?.projectCode || defaultProjectCode || '');
  const [note, setNote] = useState(editLog?.note || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editLog?.images || []);
  const [existingImages, setExistingImages] = useState<string[]>(editLog?.images || []);`;

f = f.replace(s1, r1);

const s2 = `  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };`;

const r2 = `  const removeFile = (idx: number) => {
    const isExisting = idx < existingImages.length;
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles(prev => prev.filter((_, i) => i !== (idx - existingImages.length)));
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };`;

f = f.replace(s2, r2);

const s3 = `      await onUpload({ projectCode, note, images: urls });
      onClose();`;

const r3 = `      if (editLog && onUpdate) {
        await onUpdate(editLog.id, { note, images: urls, existingImages });
      } else {
        await onUpload({ projectCode, note, images: urls });
      }
      onClose();`;

f = f.replace(s3, r3);

const s4 = `  const { fieldLogs, projects, addFieldLog, deleteFieldLog, fetchFieldLogs } = useRealtimeStore();
  const [selectedProject, setSelectedProject] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);`;

const r4 = `  const { fieldLogs, projects, addFieldLog, deleteFieldLog, updateFieldLog, fetchFieldLogs } = useRealtimeStore();
  const [selectedProject, setSelectedProject] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editLog, setEditLog] = useState<any>(null);`;

f = f.replace(s4, r4);

const s5 = `      {isUploadOpen && (
        <UploadModal
          defaultProjectCode={selectedProject}
          projects={projects}
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleUpload} />
      )}`;

const r5 = `      {(isUploadOpen || editLog) && (
        <UploadModal
          defaultProjectCode={selectedProject}
          projects={projects}
          editLog={editLog}
          onClose={() => { setIsUploadOpen(false); setEditLog(null); }}
          onUpload={handleUpload}
          onUpdate={async (id, input) => {
            if (updateFieldLog) await updateFieldLog(id, input);
            await fetchFieldLogs();
          }}
        />
      )}`;

f = f.replace(s5, r5);

const s6 = `                          <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                            className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>`;

const r6 = `                          <div className="flex gap-1">
                            <button onClick={() => setEditLog(log)} title="Sửa báo cáo"
                              className="rounded p-1.5 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                              className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>`;

f = f.replace(s6, r6);

const s7 = `Upload ảnh hiện trường`;
const r7 = `{editLog ? 'Sửa ảnh hiện trường' : 'Upload ảnh hiện trường'}`;
f = f.replace(s7, r7);

// Fix another validation
const s8 = `    if (files.length === 0) { setError('Vui lòng chọn ít nhất 1 ảnh'); return; }`;
const r8 = `    if (files.length === 0 && existingImages.length === 0) { setError('Vui lòng chọn ít nhất 1 ảnh'); return; }`;
f = f.replace(s8, r8);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f);
console.log('UI updated 2');
