const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/MaterialTrackingPage.tsx', 'utf8');

const regex = /<div className="flex flex-wrap gap-2">[\s\S]*?<input[\s\S]*?className="hidden"[\s\S]*?\/>[\s\S]*?<button[\s\S]*?Nhập Excel[\s\S]*?<\/button>[\s\S]*?<button[\s\S]*?Xuất Excel[\s\S]*?<\/button>[\s\S]*?<button[\s\S]*?Nhập Kho[\s\S]*?<\/button>[\s\S]*?<button[\s\S]*?Xuất Kho[\s\S]*?<\/button>\s*<\/div>/;

const newButtons = `        {projectId && portalNode ? createPortal(
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
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 border border-slate-200 bg-white h-[34px] px-3 rounded-lg text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[14px]">file_download</span>
              Xuất Excel
            </button>
            <button onClick={() => handleOpenTransaction('IMPORT')} className="flex items-center gap-1.5 bg-emerald-600 text-white h-[34px] px-3 rounded-lg text-[12px] font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              Nhập Kho
            </button>
            <button onClick={() => handleOpenTransaction('EXPORT')} className="flex items-center gap-1.5 bg-amber-500 text-white h-[34px] px-3 rounded-lg text-[12px] font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              Xuất Kho
            </button>
          </div>
        , portalNode) : (!projectId && (
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-2 border border-slate-200 bg-white h-[40px] px-5 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-base">file_upload</span>
              Nhập Excel
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 border border-slate-200 bg-white h-[40px] px-5 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
              <span className="material-symbols-outlined text-base">file_download</span>
              Xuất Excel
            </button>
            <button onClick={() => handleOpenTransaction('IMPORT')} className="flex items-center gap-2 bg-emerald-600 text-white h-[40px] px-5 rounded-lg text-[13px] font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">arrow_downward</span>
              Nhập Kho
            </button>
            <button onClick={() => handleOpenTransaction('EXPORT')} className="flex items-center gap-2 bg-amber-500 text-white h-[40px] px-5 rounded-lg text-[13px] font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              Xuất Kho
            </button>
          </div>
        ))}`;

if (regex.test(code)) {
  code = code.replace(regex, newButtons);
  fs.writeFileSync('web-admin/src/pages/MaterialTrackingPage.tsx', code);
  console.log('Success');
} else {
  console.log('Not found');
}
