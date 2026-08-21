const fs = require("fs");
const files = [
  "web-admin/src/pages/cost-plan/MaterialPlanTab.tsx",
  "web-admin/src/pages/cost-plan/PurchasingTab.tsx",
  "web-admin/src/pages/TaskManagementPage.tsx"
];

files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  // Replace all whitespace-nowrap on regular td and span with whitespace-normal break-words
  // But DO NOT replace it on the STT column! STT should not wrap (or it is small enough).
  // NỘI DUNG is already wrapping.
  
  // In PurchasingTab.tsx, there are spans without wrap classes.
  c = c.replace(/className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-\[32px\] w-full justify-center"/g,
    "className=\"cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-center whitespace-normal break-words leading-tight\"");
    
  c = c.replace(/className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-start min-h-\[32px\] w-full justify-center"/g,
    "className=\"cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-start min-h-[32px] w-full justify-center whitespace-normal break-words leading-tight\"");
    
  c = c.replace(/className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-\[32px\] w-full justify-end"/g,
    "className=\"cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-center min-h-[32px] w-full justify-end whitespace-normal break-words leading-tight text-right\"");

  c = c.replace(/className="cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-start min-h-\[32px\] w-full"/g,
    "className=\"cursor-pointer hover:bg-slate-100 px-1 py-2 rounded flex items-start min-h-[32px] w-full whitespace-normal break-words leading-tight\"");

  // In MaterialPlanTab.tsx, some tds still have whitespace-nowrap or spans without it.
  c = c.replace(/className="p-0 align-top text-center font-mono text-slate-500 border-r border-slate-200"/g,
    "className=\"p-0 align-top text-center font-mono text-slate-500 border-r border-slate-200 whitespace-normal break-words leading-tight\"");
    
  c = c.replace(/className="p-0 align-top text-center font-mono font-semibold text-slate-900 border-r border-slate-200"/g,
    "className=\"p-0 align-top text-center font-mono font-semibold text-slate-900 border-r border-slate-200 whitespace-normal break-words leading-tight\"");

  fs.writeFileSync(f, c);
});
console.log("Fixed wrap everywhere");

