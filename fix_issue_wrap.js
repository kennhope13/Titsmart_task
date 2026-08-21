const fs = require("fs");
let f = "web-admin/src/pages/TaskManagementPage.tsx";
let c = fs.readFileSync(f, "utf8");

// Fix VƯỚNG MẮC (t.issue)
// td
c = c.replace(/className="py-1\.5 px-1 font-semibold text-red-600 truncate border-r border-slate-200"/g, 
  "className=\"py-1.5 px-1 font-semibold text-red-600 whitespace-normal break-words leading-tight border-r border-slate-200\"");
// spans inside
c = c.replace(/className="inline-flex items-center gap-1 whitespace-nowrap truncate"/g, 
  "className=\"inline-flex items-start gap-1 whitespace-normal break-words leading-tight\"");
c = c.replace(/<span className="truncate">\{t\.issue\}<\/span>/g, 
  "<span>{t.issue}</span>");
c = c.replace(/<span className="material-symbols-outlined text-red-500 text-xs flex-shrink-0">warning<\/span>/g,
  "<span className=\"material-symbols-outlined text-red-500 text-xs flex-shrink-0 mt-0.5\">warning</span>");

// Fix XỬ LÝ (t.issueStatus)
c = c.replace(/className="py-1\.5 px-1 text-slate-600 truncate border-r border-slate-200"/g,
  "className=\"py-1.5 px-1 text-slate-600 whitespace-normal break-words leading-tight border-r border-slate-200\"");

fs.writeFileSync(f, c);
console.log("Fixed issue wrap");

