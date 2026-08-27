const fs = require('fs');

let page = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

// Add import if missing
if (!page.includes('FieldLogsTaskTable')) {
  page = page.replace(
    `import { FieldLog } from '../types';`,
    `import { FieldLog } from '../types';\nimport { FieldLogsTaskTable } from '../components/FieldLogsTaskTable';`
  );
}

// Ensure prefilling taskId in UploadModal is easy.
// `isUploadOpen` and `editLog` are used.
// If I pass `defaultTaskId` to UploadModal... wait, does UploadModal take `defaultTaskId`? No, I need to add it.
if (!page.includes('defaultTaskId?: string;')) {
  page = page.replace(
    `defaultProjectCode: string;`,
    `defaultProjectCode: string;\n  defaultTaskId?: string;`
  );
  
  page = page.replace(
    `const [taskId, setTaskId] = useState(editLog?.taskId || '');`,
    `const [taskId, setTaskId] = useState(editLog?.taskId || defaultTaskId || '');`
  );
  
  page = page.replace(
    `UploadModal: React.FC<{`,
    `UploadModal: React.FC<{\n  defaultTaskId?: string;`
  );
  
  page = page.replace(
    `{ defaultProjectCode, projects, editLog, onClose, onUpload, onUpdate }`,
    `{ defaultProjectCode, defaultTaskId, projects, editLog, onClose, onUpload, onUpdate }`
  );
  
  // Add state for prefilled taskId
  page = page.replace(
    `const [isUploadOpen, setIsUploadOpen] = useState(false);`,
    `const [isUploadOpen, setIsUploadOpen] = useState(false);\n  const [uploadTaskId, setUploadTaskId] = useState<string>('');`
  );
  
  // When closing, reset uploadTaskId
  page = page.replace(
    `onClose={() => { setIsUploadOpen(false); setEditLog(null); }}`,
    `onClose={() => { setIsUploadOpen(false); setEditLog(null); setUploadTaskId(''); }}`
  );
  
  // Replace the rendering of the logs inside selectedProject
  // We want to replace <div className="flex-1 overflow-y-auto p-6 space-y-8"> ... </div>
  const matchRender = page.match(/<div className="flex-1 overflow-y-auto p-6 space-y-8">[\s\S]*?<\/div>\s*<\/div>\s*\)\s*:\s*\(/);
  
  if (matchRender) {
    const tableReplacement = `
                  <FieldLogsTaskTable 
                    selectedProject={selectedProject} 
                    logs={logsByProject.find(p => p[0] === selectedProject)?.[1] || []} 
                    onAddLogClick={(tid) => {
                      setUploadTaskId(tid);
                      setIsUploadOpen(true);
                    }}
                    onEditLogClick={(log) => setEditLog(log)}
                  />
                </div>
              ) : (`;
    page = page.replace(matchRender[0], tableReplacement);
  }
  
  // Pass defaultTaskId to UploadModal
  page = page.replace(
    `defaultProjectCode={selectedProject}`,
    `defaultProjectCode={selectedProject}\n            defaultTaskId={uploadTaskId}`
  );
  
  fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', page);
  console.log('Patched FieldLogsPage.tsx');
} else {
  console.log('Already patched');
}
