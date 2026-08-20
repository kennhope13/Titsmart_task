const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Mua hang
content = content.replace('<option value="all">Mua hang: Tat ca</option>', '<option value="all">Tất cả</option>');
content = content.replace('<option value="all">Thi cong: Tat ca</option>', '<option value="all">Tất cả</option>'); // just in case

// Compact the CustomSelects
content = content.replace(
  'className="h-8 min-w-[100px] max-w-[160px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"',
  'className="h-7 min-w-[80px] max-w-[130px] rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary"'
);

// We need a global replace for the other ones
content = content.replace(
  /className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-\[11px\] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"/g,
  'className="h-7 min-w-[70px] max-w-[100px] rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary"'
);

// Compact the container gaps
content = content.replace(
  '<div className="flex flex-wrap items-center gap-1.5">',
  '<div className="flex flex-wrap items-center gap-1">'
);

// Compact the "Lọc chi tiết:" to just icon or smaller text
content = content.replace(
  '<span className="font-bold text-slate-400 flex items-center gap-1">\n              <span className="material-symbols-outlined text-sm">filter_list</span>\n              Lọc chi tiết:\n            </span>',
  '<span className="font-bold text-slate-400 flex items-center gap-1" title="Lọc chi tiết">\n              <span className="material-symbols-outlined text-sm">filter_list</span>\n            </span>'
);

// Make the search input smaller
content = content.replace(
  '<div className="relative w-full md:w-56">',
  '<div className="relative w-full md:w-48">'
);
content = content.replace(
  'className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"',
  'className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none h-7"'
);

// Make buttons smaller
content = content.replace(
  'className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 shadow-xs whitespace-nowrap"',
  'className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-[11px] font-bold hover:opacity-90 active:scale-95 shadow-xs whitespace-nowrap h-7"'
);
content = content.replace(
  'className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs whitespace-nowrap"',
  'className="flex items-center gap-1 border border-emerald-200 bg-emerald-50 text-emerald-800 px-2 py-1 rounded text-[11px] font-bold hover:bg-emerald-100 transition-all shadow-xs whitespace-nowrap h-7"'
);

fs.writeFileSync(path, content, 'utf8');
console.log('TaskManagementPage made more compact');
