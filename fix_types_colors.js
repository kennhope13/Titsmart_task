const fs = require("fs");
let f = "web-admin/src/types/index.ts";
let c = fs.readFileSync(f, "utf8");

c = c.replace(
  /export const getIssueStatusColorStyle =[\s\S]*?};/,
  `export const getIssueStatusColorStyle = (status?: string) => {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-600";
  const s = status.toLowerCase();
  if (s === "chưa xử lý") return "border-red-200 bg-red-50 text-red-700";
  if (s === "đang xử lý") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "đã xử lý xong") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "không có") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-600";
};`
);

fs.writeFileSync(f, c);
console.log("Fixed issue status colors");

