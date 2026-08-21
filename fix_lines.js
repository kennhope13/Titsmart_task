const fs = require("fs");
let f = "web-admin/src/pages/TaskManagementPage.tsx";
let c = fs.readFileSync(f, "utf8");
let lines = c.split("\n");

let newTdLines = [
"                      <td className=\"py-1.5 px-1 text-center whitespace-nowrap border-r border-slate-200\">",
"                        <CustomSelect",
"                          value={t.issueStatus || \"Không có\"}",
"                          onChange={(e) => updateTask(t.id, { issueStatus: e.target.value })}",
"                          className={`w-full min-w-0 rounded border px-1 py-0.5 text-[10px] font-bold focus:ring-2 focus:ring-primary focus:outline-none focus:bg-white transition-colors ${getIssueStatusColorStyle(t.issueStatus || \"Không có\")}`}",
"                        >",
"                          {ISSUE_STATUS_OPTIONS.map((option) => (",
"                            <option key={option} value={option} className={getIssueStatusColorStyle(option)}>{option}</option>",
"                          ))}",
"                        </CustomSelect>",
"                      </td>"
];

// lines 1658 (1-indexed 1659): \`                      </td>\`
// lines 1659: \`                        )}\`
// lines 1660: \`                      </td>\`

lines.splice(1659, 2, ...newTdLines);

fs.writeFileSync(f, lines.join("\n"));
console.log("Fixed lines successfully");

