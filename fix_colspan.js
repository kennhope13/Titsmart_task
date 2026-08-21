const fs = require("fs");
let f = "web-admin/src/pages/TaskManagementPage.tsx";
let c = fs.readFileSync(f, "utf8");

c = c.replace(
  `{groupedTasks.length === 0 ? (<tr><td colSpan={12} className="p-8 text-center text-slate-400 whitespace-nowrap">Không có hạng mục nào phù hợp với bộ lọc đã chọn</td></tr>) : (`,
  `{groupedTasks.length === 0 ? (<tr><td colSpan={10} className="p-8 text-center text-slate-400 whitespace-nowrap">Không có hạng mục nào phù hợp với bộ lọc đã chọn</td></tr>) : (`
);

c = c.replace(
  `<td colSpan={10} className="sticky z-10 py-2 px-2 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-tight font-extrabold text-xs text-primary whitespace-normal break-words" style={{ left: "var(--stt-width)" }}>`,
  `<td colSpan={8} className="sticky z-10 py-2 px-2 bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-tight font-extrabold text-xs text-primary whitespace-normal break-words" style={{ left: "var(--stt-width)" }}>`
);

fs.writeFileSync(f, c);
console.log("Fixed colSpans");

