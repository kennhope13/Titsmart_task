const fs = require("fs");
let c = fs.readFileSync("web-admin/src/pages/TaskManagementPage.tsx", "utf8");

c = c.replace("const displayTasks = tasks.filter((t) => {", 
`const maxSttWidth = React.useMemo(() => {
  let maxLen = 3;
  tasks.forEach(t => {
    const len = String(t.computedStt || t.stt || "").length;
    if (len > maxLen) maxLen = len;
  });
  return Math.max(42, maxLen * 7.5 + 16);
}, [tasks]);

const displayTasks = tasks.filter((t) => {`);

c = c.replace(/<table className="min-w-\[1060px\]([^"]*)">/, "<table className=\"min-w-[1060px]$1\" style={{ \"--stt-width\": \`${maxSttWidth}px\` } as React.CSSProperties}>");

c = c.replace(/className="py-2 px-2 w-\[400px\]([^>]*)"/, "className=\"sticky z-20 py-2 px-2 w-[400px]$1 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]\" style={{ left: \"var(--stt-width)\" }}");

c = c.replace(/<td colSpan=\{10\} className="py-2 px-2 bg-blue-50\/90 uppercase/, "<td colSpan={10} className=\"sticky z-10 py-2 px-2 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase\" style={{ left: \"var(--stt-width)\" }}");

c = c.replace(/<td className=\{`py-1\.5 px-2 \$\{stickyBg\} group-hover:bg-slate-100([^>]*)`\}/, "<td className={`sticky z-10 py-1.5 px-2 ${stickyBg} group-hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]$1`} style={{ left: \"var(--stt-width)\" }}");

fs.writeFileSync("web-admin/src/pages/TaskManagementPage.tsx", c);
console.log("Fixed task");

