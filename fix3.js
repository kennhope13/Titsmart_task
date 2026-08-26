const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

if (!code.includes('createPortal')) {
  code = code.replace(
    "import React, { useEffect, useMemo, useRef, useState } from 'react';",
    "import React, { useEffect, useMemo, useRef, useState } from 'react';\nimport { createPortal } from 'react-dom';\nimport { useOutletContext } from 'react-router-dom';"
  );
}

// Add state for portal
if (!code.includes('const [portalNode, setPortalNode]')) {
  code = code.replace(
    'const [isUploadOpen, setIsUploadOpen] = useState(false);',
    'const outletContext = useOutletContext<any>();\n  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);\n  useEffect(() => { setPortalNode(document.getElementById(\'project-header-actions\')); }, []);\n  const [isUploadOpen, setIsUploadOpen] = useState(false);'
  );
}

// Replace header block
const headerRegex = /<header className="border-b border-slate-200 bg-white">\s*<div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">\s*\{\!projectId && \(\s*<div className="flex items-center gap-4">\s*<div className="flex items-center gap-3">\s*<h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">NHẬT KÝ HIỆN TRƯỜNG<\/h1>\s*<\/div>\s*<\/div>\s*\)\}\s*<div className="flex items-center gap-2">\s*\{\!projectId && \(\s*<CustomSelect value=\{selectedProject\} onChange=\{e => setSelectedProject\(e\.target\.value\)\}[\s\S]*?<\/CustomSelect>\s*\)\}\s*<button onClick=\{\(\) => setIsUploadOpen\(true\)\}\s*className="flex items-center gap-2\.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95">\s*<span className="material-symbols-outlined text-lg">add_a_photo<\/span>\s*Upload ảnh\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/header>/;

const newHeader = `      {!projectId && (
        <header className="border-b border-slate-200 bg-white">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
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
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95">
          <span className="material-symbols-outlined text-[14px]">add_a_photo</span>
          Upload ảnh
        </button>
      , portalNode)}`;

if (headerRegex.test(code)) {
  code = code.replace(headerRegex, newHeader);
  fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', code);
  console.log('Fixed FieldLogsPage');
} else {
  console.log('Not found in FieldLogsPage');
}
