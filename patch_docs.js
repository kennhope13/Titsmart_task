const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// Replace the CHỨNG TỪ HÀNG HÓA rendering
const oldDocs = `<td className="w-[160px] p-0 align-middle border-r border-slate-200">
                                <div className="flex flex-row flex-wrap gap-x-3 gap-y-2 p-1.5 w-full items-start justify-center divide-x divide-slate-200">
                                  <div className="flex flex-col items-center gap-1.5 pl-2 first:pl-0">
                                    <button
                                      type="button"
                                      disabled={userRole === 'engineer'}
                                      onClick={() => handleDocBadgeClick(plan, 'CO')}
                                      className={\`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors \${plan.docCo ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}\`}
                                    >
                                      CO
                                    </button>
                                    {renderAutoFilesByType(plan, 'CO')}
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 pl-2">
                                    <button
                                      type="button"
                                      disabled={userRole === 'engineer'}
                                      onClick={() => handleDocBadgeClick(plan, 'CQ')}
                                      className={\`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors \${plan.docCq ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}\`}
                                    >
                                      CQ
                                    </button>
                                    {renderAutoFilesByType(plan, 'CQ')}
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 pl-2">
                                    <button
                                      type="button"
                                      disabled={userRole === 'engineer'}
                                      onClick={() => handleDocBadgeClick(plan, 'PCCC')}
                                      className={\`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors \${plan.docFireInspection ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}\`}
                                    >
                                      PCCC
                                    </button>
                                    {renderAutoFilesByType(plan, 'PCCC')}
                                  </div>
                                </div>
                              </td>`;

const newDocs = `<td className="w-[160px] p-0 align-middle border-r border-slate-200 relative group/docs">
                                <div className="flex flex-row flex-wrap gap-x-2 gap-y-2 p-1.5 w-full items-center justify-center cursor-pointer min-h-[34px]">
                                  {plan.docCo && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CO</span>
                                  )}
                                  {plan.docCq && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CQ</span>
                                  )}
                                  {plan.docFireInspection && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">PCCC</span>
                                  )}
                                  {plan.docStamp && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">Tem KĐ</span>
                                  )}
                                  {!plan.docCo && !plan.docCq && !plan.docFireInspection && !plan.docStamp && (
                                    <span className="text-slate-400 text-xs italic group-hover/docs:opacity-0 transition-opacity">--</span>
                                  )}
                                  
                                  {/* Dropdown Menu Toggle */}
                                  {userRole !== 'engineer' && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/docs:opacity-100 transition-opacity">
                                      <div className="relative group/dropdown">
                                        <button type="button" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200 bg-white shadow-sm">
                                          <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                                        </button>
                                        <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 hidden group-hover/dropdown:block z-50 text-left">
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCo} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docCo: e.target.checked })} />
                                            CO
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCq} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docCq: e.target.checked })} />
                                            CQ
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docFireInspection} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docFireInspection: e.target.checked })} />
                                            PCCC
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docStamp} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docStamp: e.target.checked })} />
                                            Tem kiểm định
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>`;

if (code.includes(oldDocs)) {
  code = code.replace(oldDocs, newDocs);
  console.log("Successfully replaced CHỨNG TỪ HÀNG HÓA cell!");
} else {
  console.log("Could not find the target string!");
}

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
