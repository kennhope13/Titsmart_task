const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");
code = code.replace(
  /className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all hover:bg-slate-50"/g,
  "className=\"inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:shadow-md active:scale-95\""
);
code = code.replace(
  /<span className="material-symbols-outlined text-lg">arrow_back<\/span>/g,
  "<span className=\"material-symbols-outlined text-xl\">arrow_back</span>"
);
fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Fixed back button");

