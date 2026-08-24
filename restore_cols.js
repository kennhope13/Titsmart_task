const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Add columns to thead
const theadTarget = `<th rowSpan={2} style={{ width: '100%', minWidth: 400, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8', left: "var(--stt-width)" }} className="sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left ">NỘI DUNG</th>`;
const theadReplacement = `<th rowSpan={2} style={{ width: '100%', minWidth: 400, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8', left: "var(--stt-width)" }} className="sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-slate-50 bg-clip-padding px-1.5 py-1 font-extrabold text-left ">NỘI DUNG</th>
              {subTab === 'TECH' && (
                <>
                  <th rowSpan={2} style={{ minWidth: 50, width: 50, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">ĐVT</th>
                  <th rowSpan={2} style={{ minWidth: 70, width: 70, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">KL HĐ</th>
                  <th rowSpan={2} style={{ width: 120, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">MÃ HIỆU</th>
                  <th rowSpan={2} style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">XUẤT XỨ</th>
                </>
              )}`;

f = f.replace(theadTarget, theadReplacement);

// 2. Add columns to tbody for normal row (not parent row)
// The cell after STT and Nội dung is where we need to insert the 4 columns conditionally
const tbodyTarget = `                            )}
                          </div>
                        </td>`;
const tbodyReplacement = `                            )}
                          </div>
                        </td>
                        {subTab === 'TECH' && (
                          <>
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 text-center font-semibold text-[11px] align-middle text-slate-700">
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
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 text-center font-semibold text-[11px] align-middle text-emerald-700">
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
                                  {showNumber(plan.contractVolume) || <span className="text-slate-300 italic">0</span>}
                                </div>
                              )}
                            </td>
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 text-center text-[11px] align-middle">
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
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 text-center text-[11px] align-middle">
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
                            </td>
                          </>
                        )}`;

f = f.replace(tbodyTarget, tbodyReplacement);

// 3. For parent rows, we need to span these columns if subTab === 'TECH'.
// But wait! How many columns does colSpanCount use?
// Currently colSpanCount logic:
// const colSpanCount = useMemo(() => {
//   if (subTab === 'TECH') return 6;
//   if (subTab === 'DOCS') return 3;
//   if (subTab === 'PRICING') return 5;
//   if (subTab === 'PAYMENT') return 3;
//   return 6;
// }, [subTab]);
const colSpanTarget = `const colSpanCount = useMemo(() => {
    if (subTab === 'TECH') return 6;`;
const colSpanReplacement = `const colSpanCount = useMemo(() => {
    if (subTab === 'TECH') return 10;`; // 6 + 4 = 10
f = f.replace(colSpanTarget, colSpanReplacement);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
