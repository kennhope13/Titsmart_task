const fs = require("fs");
let code = fs.readFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", "utf8");

const thRegex = /(<th rowSpan=\{2\} style=\{\{ width: 65, borderRight:[^<]*?>ĐVT<\/th>)/;
const thReplacement = `<th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">MÃ HIỆU</th>
              <th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">XUẤT XỨ</th>
              $1`;

code = code.replace(thRegex, thReplacement);

const tdRegex = /(<td className="px-1\.5 py-1\.5 border-r border-slate-200 text-center">\s*\{p\.isSectionHeader \? .*. : p\.unit\}\s*<\/td>)/;
const tdReplacement = `<td className="px-1.5 py-1.5 border-r border-slate-200">
                        {p.isSectionHeader ? "" : <span className="text-slate-600 block text-center truncate" title={p.techSpecModel || ""}>{p.techSpecModel || "-"}</span>}
                      </td>
                      <td className="px-1.5 py-1.5 border-r border-slate-200">
                        {p.isSectionHeader ? "" : <span className="text-slate-600 block text-center truncate" title={p.techSpecOrigin || ""}>{p.techSpecOrigin || "-"}</span>}
                      </td>
                      $1`;

code = code.replace(tdRegex, tdReplacement);

fs.writeFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", code);
console.log("Fixed columns");

