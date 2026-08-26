const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/DocumentTrackingPage.tsx', 'utf8');

// 1. Add imports if missing
if (!code.includes('createPortal')) {
  code = code.replace(
    "import { useParams } from 'react-router-dom';",
    "import { useParams, useOutletContext } from 'react-router-dom';\nimport { createPortal } from 'react-dom';"
  );
}

// 2. Add portalNode state
if (!code.includes('const [portalNode, setPortalNode]')) {
  code = code.replace(
    'const [isNewDocOpen, setIsNewDocOpen] = useState(false);',
    'const outletContext = useOutletContext<any>();\n  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);\n  useEffect(() => { setPortalNode(document.getElementById(\'project-header-actions\')); }, []);\n  const [isNewDocOpen, setIsNewDocOpen] = useState(false);'
  );
}

// 3. Fix the header section
const headerRegex = /<section className="border-b border-slate-200 bg-white shadow-sm px-6 pr-4 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">\s*\{\!projectId && \(\s*<div className="flex items-center gap-4">\s*<h1 className="page-header-title text-lg text-slate-900 border-l-4 border-primary pl-2 uppercase">Theo dõi Hồ sơ gửi đi<\/h1>\s*<\/div>\s*\)\}\s*<div className="flex gap-2">\s*<input\s*type="file"\s*ref=\{fileInputRef\}\s*onChange=\{handleImportExcel\}\s*accept="\.xlsx,\.xls,\.csv"\s*className="hidden"\s*\/>\s*<button\s*onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}\s*className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-\[13px\] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"\s*>\s*<span className="material-symbols-outlined text-sm">file_upload<\/span>\s*Nhập Excel\s*<\/button>\s*<button\s*onClick=\{handleExportExcel\}\s*className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-\[13px\] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"\s*>\s*<span className="material-symbols-outlined text-sm">file_download<\/span>\s*Xuất Excel\s*<\/button>\s*<button\s*onClick=\{\(\) => setIsNewDocOpen\(true\)\}\s*className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-\[13px\] font-bold hover:opacity-90 active:scale-95 shadow-xs"\s*>\s*<span className="material-symbols-outlined text-sm">add<\/span>\s*Thêm hồ sơ mới\s*<\/button>\s*<\/div>\s*<\/section>/;

const newHeader = `      {!projectId && (
        <section className="border-b border-slate-200 bg-white shadow-sm px-6 pr-4 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="page-header-title text-lg text-slate-900 border-l-4 border-primary pl-2 uppercase">Theo dõi Hồ sơ gửi đi</h1>
          </div>

          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_upload</span>
              Nhập Excel
            </button>
            <button 
              onClick={handleExportExcel} 
              className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              Xuất Excel
            </button>
            <button 
              onClick={() => setIsNewDocOpen(true)} 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm hồ sơ mới
            </button>
          </div>
        </section>
      )}

      {projectId && portalNode && createPortal(
        <div className="flex flex-wrap gap-2 pr-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-1.5 border border-slate-200 bg-white h-[34px] px-3 rounded-lg text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">file_upload</span>
            Nhập Excel
          </button>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-1.5 border border-slate-200 bg-white h-[34px] px-3 rounded-lg text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">file_download</span>
            Xuất Excel
          </button>
          <button 
            onClick={() => setIsNewDocOpen(true)} 
            className="flex items-center gap-1.5 bg-primary text-white h-[34px] px-3 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Thêm hồ sơ mới
          </button>
        </div>
      , portalNode)}`;

if (headerRegex.test(code)) {
  code = code.replace(headerRegex, newHeader);
} else {
  console.log("Could not match header in DocumentTrackingPage.tsx");
}

// 4. Fix the tabs
code = code.replace(
  '<div className="w-full flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-1">',
  '<div className="w-full flex items-center justify-between border-b border-slate-200 bg-white px-4">'
);
code = code.replace(
  /className=\{\`app-tab-button flex items-center gap-2\.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap/g,
  'className={`app-tab-button flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap'
);
code = code.replace(
  /<span className="material-symbols-outlined text-base leading-none">\{tab\.icon\}<\/span>/g,
  '<span className="material-symbols-outlined text-[16px] leading-none">{tab.icon}</span>'
);

fs.writeFileSync('web-admin/src/pages/DocumentTrackingPage.tsx', code);
console.log('Done DocumentTrackingPage');
