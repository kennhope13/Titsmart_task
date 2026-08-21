const fs = require("fs");
let c = fs.readFileSync("web-admin/src/pages/TaskManagementPage.tsx", "utf8");
c = c.replace(/className="sticky z-10 py-2 px-2 bg-blue-50\/90 shadow-\[2px_0_5px_-2px_rgba\(0,0,0,0\.1\)\] uppercase" style=\{\{ left: "var\(--stt-width\)" \}\} tracking-tight font-extrabold text-xs text-primary whitespace-nowrap"/, 
  "className=\"sticky z-10 py-2 px-2 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-tight font-extrabold text-xs text-primary whitespace-nowrap\" style={{ left: \"var(--stt-width)\" }}");
fs.writeFileSync("web-admin/src/pages/TaskManagementPage.tsx", c);
console.log("Fixed syntax");

