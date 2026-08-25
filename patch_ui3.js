const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

f = f.replace(/const UploadModal: React\.FC<\{[\s\S]*?const \[previews, setPreviews\] = useState<string\[\]>\(\[\]\);/g, `const UploadModal: React.FC<{
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
  const [existingImages, setExistingImages] = useState<string[]>(editLog?.images || []);`);

f = f.replace(/const removeFile = \(idx: number\) => \{[\s\S]*?\};/g, `const removeFile = (idx: number) => {
    const isExisting = idx < existingImages.length;
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles(prev => prev.filter((_, i) => i !== (idx - existingImages.length)));
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };`);

f = f.replace(/await onUpload\(\{ projectCode, note, images: urls \}\);\s*onClose\(\);/g, `if (editLog && onUpdate) {
        await onUpdate(editLog.id, { note, images: urls, existingImages });
      } else {
        await onUpload({ projectCode, note, images: urls });
      }
      onClose();`);

f = f.replace(/const \{ fieldLogs, projects, addFieldLog, deleteFieldLog, fetchFieldLogs \} = useRealtimeStore\(\);\s*const \[selectedProject, setSelectedProject\] = useState\(''\);\s*const \[isUploadOpen, setIsUploadOpen\] = useState\(false\);/g, `const { fieldLogs, projects, addFieldLog, deleteFieldLog, updateFieldLog, fetchFieldLogs } = useRealtimeStore();
  const [selectedProject, setSelectedProject] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editLog, setEditLog] = useState<any>(null);`);

f = f.replace(/\{isUploadOpen && \([\s\S]*?onUpload=\{handleUpload\} \/>\s*\)\}/g, `{(isUploadOpen || editLog) && (
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
      )}`);

f = f.replace(/<button onClick=\{\(\) => setDeletingId\(log\.id\)\} title="Xóa báo cáo"[\s\S]*?<\/button>/g, `<div className="flex gap-1">
                            <button onClick={() => setEditLog(log)} title="Sửa báo cáo"
                              className="rounded p-1.5 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                              className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>`);

f = f.replace(/Upload ảnh hiện trường/g, `{editLog ? 'Sửa ảnh hiện trường' : 'Upload ảnh hiện trường'}`);

f = f.replace(/if \(files\.length === 0\) \{ setError\('Vui lòng chọn ít nhất 1 ảnh'\); return; \}/g, `if (files.length === 0 && existingImages.length === 0) { setError('Vui lòng chọn ít nhất 1 ảnh'); return; }`);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f);
console.log('UI updated 3');

let api = fs.readFileSync('web-admin/src/services/api.ts', 'utf8');
api = api.replace(/update: async \(id: string, data: any\) =>/g, `update: async (id: string, data: any) =>`); // just doing nothing
// wait, the error TS2339 in api.ts is because `updateFieldLog` tries to call `api.fieldLogs.update` but `fieldLogs` type doesn't have it.
fs.writeFileSync('web-admin/src/services/api.ts', api);

let typeDef = fs.readFileSync('web-admin/src/services/realtimeStore.ts', 'utf8');
typeDef = typeDef.replace(/deleteFieldLog: \(id: string\) => Promise<void>;/g, `deleteFieldLog: (id: string) => Promise<void>;\n  updateFieldLog: (id: string, input: { note?: string; images?: string[]; existingImages?: string[] }) => Promise<void>;`);
fs.writeFileSync('web-admin/src/services/realtimeStore.ts', typeDef);
console.log('Types updated');
