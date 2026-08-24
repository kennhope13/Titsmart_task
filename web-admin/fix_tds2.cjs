const fs = require("fs");
let code = fs.readFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", "utf8");

code = code.replace(
  /\{\/\* ĐVT \*\/\}\r?\n\s*<td/g,
  `{/* MÃ HIỆU */}
                  <td className="p-0 align-top text-center text-slate-600 border-r border-slate-200 whitespace-normal break-words leading-tight" title={plan.techSpecModel || ""}>
                    {editingCell?.id === plan.id && editingCell?.field === "techSpecModel" ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditing(plan); if (e.key === "Escape") setEditingCell(null); }}
                        autoFocus
                        className="w-full text-center bg-white text-slate-900 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, "techSpecModel", plan.techSpecModel)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-1 block w-full truncate max-w-[100px]">{plan.techSpecModel || "-"}</span>
                    )}
                  </td>
                  {/* XUẤT XỨ */}
                  <td className="p-0 align-top text-center text-slate-600 border-r border-slate-200 whitespace-normal break-words leading-tight" title={plan.techSpecOrigin || ""}>
                    {editingCell?.id === plan.id && editingCell?.field === "techSpecOrigin" ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveEditing(plan)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditing(plan); if (e.key === "Escape") setEditingCell(null); }}
                        autoFocus
                        className="w-full text-center bg-white text-slate-900 focus:outline-primary text-xs px-1.5 py-1.5 w-full h-[28px] box-border outline-none shadow-sm border-none rounded"
                      />
                    ) : (
                      <span onClick={() => startEditing(plan.id, "techSpecOrigin", plan.techSpecOrigin)} className="cursor-pointer hover:bg-slate-200/50 px-1 py-1 block w-full truncate max-w-[100px]">{plan.techSpecOrigin || "-"}</span>
                    )}
                  </td>
                  {/* ĐVT */}
                  <td`
);

fs.writeFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", code);
console.log("Fixed TDs properly");

