const fs = require("fs");
let f = "web-admin/src/types/index.ts";
let c = fs.readFileSync(f, "utf8");

const issueStatusCode = `
export const ISSUE_STATUS_OPTIONS = ["Không có", "Chưa xử lý", "Đang xử lý", "Đã xử lý xong"] as const;

export const getIssueStatusColorStyle = (status?: string) => {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-600";
  const s = status.toLowerCase();
  if (s === "chưa xử lý") return "border-red-600 bg-red-600 text-white font-semibold";
  if (s === "đang xử lý") return "border-emerald-200 bg-emerald-100 text-emerald-800 font-semibold";
  if (s === "đã xử lý xong") return "border-blue-600 bg-blue-600 text-white font-semibold";
  if (s === "không có") return "border-slate-200 bg-slate-100 text-slate-600 font-semibold";
  return "border-slate-200 bg-slate-50 text-slate-600";
};
`;

if (!c.includes("ISSUE_STATUS_OPTIONS")) {
  c += "\n" + issueStatusCode;
  fs.writeFileSync(f, c);
  console.log("Updated types.ts");
}

