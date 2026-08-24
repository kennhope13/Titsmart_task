const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

const rx = /\{\/\* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB \*\/\}\s*\{subTab === 'TECH' && \(\s*<>\s*/;

const replaceStr = `{/* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB */}
                          {subTab === 'TECH' && (
<>
                            <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center font-semibold text-[11px] align-middle text-slate-700">
                              {editingCell?.id === plan.id && editingCell?.field === 'unit' && !editingCell.isPurchasing ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full text-center bg-white focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                />
                              ) : (
                                <div onClick={() => startEditing(plan.id, 'unit', plan.unit)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center" title={plan.unit || 'Click để nhập'}>
                                  {plan.unit || <span className="text-slate-300 italic">...</span>}
                                </div>
                              )}
                            </td>
                            <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center font-semibold text-[11px] align-middle text-emerald-700">
                              {editingCell?.id === plan.id && editingCell?.field === 'contractVolume' && !editingCell.isPurchasing ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.-]/g, '');
                                    setTempValue(val);
                                  }}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full text-center bg-white text-emerald-700 font-semibold focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                />
                              ) : (
                                <div onClick={() => startEditing(plan.id, 'contractVolume', plan.contractVolume)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center" title={showNumber(plan.contractVolume) || 'Click để nhập'}>
                                  {showNumber(plan.contractVolume) || <span className="text-slate-300 italic">...</span>}
                                </div>
                              )}
                            </td>
                            <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center text-[11px] align-middle">
                              {editingCell?.id === plan.id && editingCell?.field === 'model' && !editingCell.isPurchasing ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full text-center bg-white text-slate-700 focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                />
                              ) : (
                                <div onClick={() => startEditing(plan.id, 'model', plan.model)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center break-words px-1 text-slate-600" title={plan.model || 'Click để nhập'}>
                                  {plan.model || <span className="text-slate-300 italic">...</span>}
                                </div>
                              )}
                            </td>
                            <td className="bg-white group-hover:bg-slate-50 border-r border-slate-200 p-0 text-center text-[11px] align-middle">
                              {editingCell?.id === plan.id && editingCell?.field === 'origin' && !editingCell.isPurchasing ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full text-center bg-white text-slate-700 focus:outline-primary px-1 py-1 box-border outline-none shadow-sm border-none h-[28px] rounded"
                                />
                              ) : (
                                <div onClick={() => startEditing(plan.id, 'origin', plan.origin)} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center break-words px-1 text-slate-600" title={plan.origin || 'Click để nhập'}>
                                  {plan.origin || <span className="text-slate-300 italic">...</span>}
                                </div>
                              )}
                            </td>\n`;

f = f.replace(rx, replaceStr);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
