const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/MaterialTrackingPage.tsx', 'utf8');

const regex = /<\/button>\s*<\/div>\s*activeTab === tab\.id\s*\?\s*'border-primary text-primary'\s*:\s*'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'\s*}\`}\s*>\s*<span className="material-symbols-outlined text-base leading-none">{tab\.icon}<\/span>\s*{tab\.label}\s*<\/button>\s*\)\)}\s*<\/div>/;

const replacement = `</button>
        </div>
      , portalNode)}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <section className="bg-white flex flex-col flex-1 min-w-0 min-h-0">

        {/* TABS & FILTERS */}
        <div ref={stickyHeaderRef} className="flex flex-col border-b border-slate-200 bg-white z-20">
          <div className="flex items-center gap-4 px-4">
            {[
              { id: 'OVERVIEW', label: 'Tồn Kho Tổng Hợp', icon: 'inventory' },
              { id: 'IMPORT', label: 'Nhật Ký Nhập Kho', icon: 'login' },
              { id: 'EXPORT', label: 'Nhật Ký Xuất Kho', icon: 'logout' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={\`app-tab-button flex items-center gap-2.5 px-3 py-2.5 border-b-2 transition-all whitespace-nowrap \${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }\`}
              >
                <span className="material-symbols-outlined text-base leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('web-admin/src/pages/MaterialTrackingPage.tsx', code);
  console.log('Fixed');
} else {
  console.log('Not found');
}
