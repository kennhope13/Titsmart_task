const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");

code = code.replace(
  /className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:shadow-md active:scale-95"/g,
  `className="relative z-[10000] inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:shadow-md active:scale-95" style={{ WebkitAppRegion: "no-drag" }}`
);

fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Fixed button z-index and app-region");

