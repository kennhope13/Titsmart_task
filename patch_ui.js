const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

const uploadModalOld = `const UploadModal: React.FC<{
  defaultProjectCode: string;
  projects: { code: string; name: string }[];
  onClose: () => void;
  onUpload: (input: { projectCode: string; note: string; images: string[] }) => Promise<void>;
}> = ({ defaultProjectCode, projects, onClose, onUpload }) => {`;

const uploadModalNew = `const UploadModal: React.FC<{
  defaultProjectCode: string;
  projects: { code: string; name: string }[];
  editLog?: any; // The log to edit
  onClose: () => void;
  onUpload: (input: { projectCode: string; note: string; images: string[] }) => Promise<void>;
  onUpdate?: (id: string, input: { note: string; images: string[]; existingImages: string[] }) => Promise<void>;
}> = ({ defaultProjectCode, projects, editLog, onClose, onUpload, onUpdate }) => {`;

f = f.replace(uploadModalOld, uploadModalNew);

const initOld = `  const [projectCode, setProjectCode] = useState(defaultProjectCode || '');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);`;

const initNew = `  const [projectCode, setProjectCode] = useState(editLog?.projectCode || defaultProjectCode || '');
  const [note, setNote] = useState(editLog?.note || '');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editLog?.images || []);
  const [existingImages, setExistingImages] = useState<string[]>(editLog?.images || []);`;

f = f.replace(initOld, initNew);

const removeOld = `  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };`;

const removeNew = `  const removeFile = (idx: number) => {
    const isExisting = idx < existingImages.length;
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles(prev => prev.filter((_, i) => i !== (idx - existingImages.length)));
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };`;

f = f.replace(removeOld, removeNew);

const submitOld = `      await onUpload({ projectCode, note, images: urls });
      onClose();`;

const submitNew = `      if (editLog && onUpdate) {
        await onUpdate(editLog.id, { note, images: urls, existingImages });
      } else {
        await onUpload({ projectCode, note, images: urls });
      }
      onClose();`;

f = f.replace(submitOld, submitNew);

// Add 'Sửa báo cáo' button and useRealtimeStore updates
const storeOld = `  const { fieldLogs, projects, addFieldLog, deleteFieldLog, fetchFieldLogs } = useRealtimeStore();
  const [selectedProject, setSelectedProject] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);`;

const storeNew = `  const { fieldLogs, projects, addFieldLog, deleteFieldLog, updateFieldLog, fetchFieldLogs } = useRealtimeStore();
  const [selectedProject, setSelectedProject] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editLog, setEditLog] = useState<any>(null);`;

f = f.replace(storeOld, storeNew);

const uploadModalsOld = `      {isUploadOpen && (
        <UploadModal
          defaultProjectCode={selectedProject}
          projects={projects}
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleUpload} />
      )}`;

const uploadModalsNew = `      {(isUploadOpen || editLog) && (
        <UploadModal
          defaultProjectCode={selectedProject}
          projects={projects}
          editLog={editLog}
          onClose={() => { setIsUploadOpen(false); setEditLog(null); }}
          onUpload={handleUpload}
          onUpdate={async (id, input) => {
            await updateFieldLog(id, input);
            await fetchFieldLogs();
          }}
        />
      )}`;

f = f.replace(uploadModalsOld, uploadModalsNew);

// Add edit button next to delete button
const deleteBtnOld = `                          <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                            className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>`;

const deleteBtnNew = `                          <div className="flex gap-1">
                            <button onClick={() => setEditLog(log)} title="Sửa báo cáo"
                              className="rounded p-1.5 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                              className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>`;

f = f.replace(deleteBtnOld, deleteBtnNew);

const titleOld = `Upload ảnh hiện trường`;
const titleNew = `{editLog ? 'Sửa ảnh hiện trường' : 'Upload ảnh hiện trường'}`;
f = f.replace(titleOld, titleNew);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f);
console.log('UI updated');
