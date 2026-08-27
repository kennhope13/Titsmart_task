const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/DocumentTrackingPage.tsx', 'utf-8');

// Replace all 'attach_file' with 'description' (the file icon)
code = code.replace(/<span className="material-symbols-outlined text-\[16px\]">attach_file<\/span>/g, '<span className="material-symbols-outlined text-[16px]">description</span>');

// Replace the <a> tag with <button>
const oldA = '<a href={track.fileUrls[0]} target="_blank" rel="noreferrer" title="Xem file đính kèm" className="relative inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">';
const newBtn = '<button type="button" onClick={(e) => { e.stopPropagation(); setFileViewerUrls(track.fileUrls || []); }} title="Xem file đính kèm" className="relative inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">';

code = code.split(oldA).join(newBtn);

// Replace the closing </a> with </button>
code = code.replace(/\{track\.fileUrls\.length > 1 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-\[8px\] font-bold px-1 rounded-full\">\{track\.fileUrls\.length\}<\/span>\}\r?\n\s*<\/a>/g, '{track.fileUrls.length > 1 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold px-1 rounded-full">{track.fileUrls.length}</span>}\\n                        </button>');

fs.writeFileSync('web-admin/src/pages/DocumentTrackingPage.tsx', code);
