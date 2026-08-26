const fs = require('fs');

const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let f = fs.readFileSync(filePath, 'utf8');

const regex = /\{subTab !== 'TECH' \? \([\s\S]*?<td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 align-middle text-slate-500">[\s\S]*?\{editingCell\?\.id === plan\.id && editingCell\?\.field === 'notes' && !editingCell\.isPurchasing \? \([\s\S]*?<input[\s\S]*?\/>\s*\) : \([\s\S]*?<div onClick=\{[\s\S]*?\} className="w-full min-h-\[32px\] cursor-pointer hover:bg-slate-100 flex items-center px-1\.5 py-1\.5" title=\{[\s\S]*?\}\>[\s\S]*?<span className="truncate flex-1">[\s\S]*?<\/span>\s*<\/div>\s*\)\}\s*<\/td>/;

const newBlock = `{subTab !== 'TECH' ? (
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 align-middle text-slate-500">
                              {editingCell?.id === plan.id && editingCell?.field === 'notes' && editingCell.isPurchasing === (subTab === 'FINANCE') ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full bg-white text-slate-500 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                />
                              ) : (
                                <div onClick={() => {
                                  if (subTab === 'FINANCE') {
                                    if (pRecord) startEditing(plan.id, 'notes', pRecord.notes || '', true);
                                  } else {
                                    startEditing(plan.id, 'notes', cleanDocNotes(plan.notes), false);
                                  }
                                }} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={subTab === 'FINANCE' ? pRecord?.notes : cleanDocNotes(plan.notes)}>
                                  <span className="truncate flex-1">{subTab === 'FINANCE' ? pRecord?.notes : cleanDocNotes(plan.notes)}</span>
                                </div>
                              )}
                            </td>`;

if (regex.test(f)) {
  f = f.replace(regex, newBlock);
  fs.writeFileSync(filePath, f);
  console.log("Replaced");
} else {
  console.log("Not found");
}
