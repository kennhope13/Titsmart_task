const fs = require('fs');

// Patch TaskManagementPage.tsx to initialize searchTerm from URL
let taskPage = fs.readFileSync('web-admin/src/pages/TaskManagementPage.tsx', 'utf8');
if (!taskPage.includes(`searchParams.get('search') || ''`)) {
  taskPage = taskPage.replace(
    `const [searchTerm, setSearchTerm] = useState('');`,
    `const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');`
  );
  fs.writeFileSync('web-admin/src/pages/TaskManagementPage.tsx', taskPage);
  console.log('Patched TaskManagementPage.tsx');
}

// Patch FieldLogsPage.tsx to include Dropdown and Task Link
let fieldLogsPage = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');
if (!fieldLogsPage.includes('taskId')) {
  // 1. UploadModalProps
  fieldLogsPage = fieldLogsPage.replace(
    `onUpload: (input: { projectCode: string; note: string; images: string[] }) => Promise<void>;`,
    `onUpload: (input: { projectCode: string; note: string; images: string[]; taskId?: string }) => Promise<void>;`
  );
  fieldLogsPage = fieldLogsPage.replace(
    `onUpdate?: (id: string, input: { note: string; images: string[]; existingImages: string[] }) => Promise<void>;`,
    `onUpdate?: (id: string, input: { note: string; images: string[]; existingImages: string[]; taskId?: string }) => Promise<void>;`
  );

  // 2. UploadModal State & realTimeStore
  fieldLogsPage = fieldLogsPage.replace(
    `const [note, setNote] = useState(editLog?.note || '');`,
    `const [note, setNote] = useState(editLog?.note || '');\n  const [taskId, setTaskId] = useState(editLog?.taskId || '');\n  const { tasks } = useRealtimeStore();`
  );

  // 3. Render Dropdown
  const textareaField = `<textarea`;
  const taskDropdown = `
          <div>
            <label className="mb-2 block text-[13px] font-bold text-slate-700">Đầu mục công việc (Tùy chọn)</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              disabled={!projectCode}
            >
              <option value="">-- Không liên kết --</option>
              {tasks.filter(t => t.projectCode === projectCode).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <textarea`;
  fieldLogsPage = fieldLogsPage.replace(textareaField, taskDropdown);

  // 4. Update submit call
  fieldLogsPage = fieldLogsPage.replace(
    `await onUpdate(editLog.id, { note, images: urls, existingImages });`,
    `await onUpdate(editLog.id, { note, images: urls, existingImages, taskId });`
  );
  fieldLogsPage = fieldLogsPage.replace(
    `await onUpload({ projectCode, note, images: urls });`,
    `await onUpload({ projectCode, note, images: urls, taskId });`
  );

  // 5. handleUpload signature
  fieldLogsPage = fieldLogsPage.replace(
    `const handleUpload = async (input: { projectCode: string; note: string; images: string[] }) => {`,
    `const handleUpload = async (input: { projectCode: string; note: string; images: string[]; taskId?: string }) => {`
  );

  // 6. Link in the log card
  const imports = `import { useParams, useOutletContext } from 'react-router-dom';`;
  fieldLogsPage = fieldLogsPage.replace(
    imports,
    `import { useParams, useOutletContext, Link } from 'react-router-dom';`
  );

  // Find where useRealtimeStore is used and ensure tasks is destructured
  // `const { addFieldLog, updateFieldLog, deleteFieldLog, fetchFieldLogs } = useRealtimeStore();`
  if (!fieldLogsPage.includes('tasks, projects, visibleLogs')) {
    fieldLogsPage = fieldLogsPage.replace(
      `const { projects, fieldLogs: visibleLogs, addFieldLog, updateFieldLog, deleteFieldLog, fetchFieldLogs } = useRealtimeStore();`,
      `const { tasks, projects, fieldLogs: visibleLogs, addFieldLog, updateFieldLog, deleteFieldLog, fetchFieldLogs } = useRealtimeStore();`
    );
  }

  const logHeader = `<span className="text-[13px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full shadow-sm">
                            {formatTimeOnly(log.timestamp)}
                          </span>`;
  const taskLink = `<div className="flex flex-col">
                            <span className="text-[13px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full shadow-sm">
                              {formatTimeOnly(log.timestamp)}
                            </span>
                            {log.taskId && tasks.find(t => t.id === log.taskId) && (
                              <Link to={\`/tasks?project=\${log.projectCode}&search=\${encodeURIComponent(tasks.find(t => t.id === log.taskId)?.name || '')}\`} className="mt-1 text-xs text-primary hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">link</span>
                                {tasks.find(t => t.id === log.taskId)?.name}
                              </Link>
                            )}
                          </div>`;
  fieldLogsPage = fieldLogsPage.replace(logHeader, taskLink);

  fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', fieldLogsPage);
  console.log('Patched FieldLogsPage.tsx');
}

// Patch apiSupabase.ts
let apiSupabase = fs.readFileSync('web-admin/src/services/apiSupabase.ts', 'utf8');
if (!apiSupabase.includes('taskId: d.task_id')) {
  apiSupabase = apiSupabase.replace(
    `timestamp: d.created_at,`,
    `timestamp: d.created_at,\n        taskId: d.task_id,`
  );
  
  apiSupabase = apiSupabase.replace(
    `photos: data.images,`,
    `photos: data.images,\n        task_id: data.taskId || null,`
  );

  apiSupabase = apiSupabase.replace(
    `timestamp: result.created_at,`,
    `timestamp: result.created_at,\n        taskId: result.task_id,`
  );
  
  apiSupabase = apiSupabase.replace(
    `if (data.note !== undefined) payload.notes = data.note;`,
    `if (data.note !== undefined) payload.notes = data.note;\n      if (data.taskId !== undefined) payload.task_id = data.taskId || null;`
  );

  fs.writeFileSync('web-admin/src/services/apiSupabase.ts', apiSupabase);
  console.log('Patched apiSupabase.ts');
}

// Patch index.ts
let typesIndex = fs.readFileSync('web-admin/src/types/index.ts', 'utf8');
if (!typesIndex.includes('taskId?: string;')) {
  typesIndex = typesIndex.replace(
    `timestamp: string; // Th\u1eddi \u0111i\u1ec3m t\u1ea1o b\u00e1o c\u00e1o`,
    `timestamp: string; // Th\u1eddi \u0111i\u1ec3m t\u1ea1o b\u00e1o c\u00e1o\n  taskId?: string;`
  );
  fs.writeFileSync('web-admin/src/types/index.ts', typesIndex);
  console.log('Patched types/index.ts');
}
