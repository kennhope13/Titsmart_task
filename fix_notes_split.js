const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Add helper functions below cleanNotes
const helperFuncs = `
const getTechNote = (val?: string) => String(val || '').split('[DOC-NOTE]')[0];
const getDocNote = (val?: string) => {
  const parts = String(val || '').split('[DOC-NOTE]');
  return parts.length > 1 ? parts[1].trim() : '';
};
const cleanTechNotes = (val?: string) => cleanNotes(getTechNote(val));
const cleanDocNotes = (val?: string) => getDocNote(val);
`;
f = f.replace(/(const cleanNotes = \(value\?: string\) => \{[\s\S]*?\};)/, "$1" + helperFuncs);


// 2. Intercept saveEditing
const saveTarget = `      if (field === 'docCo') {
        finalValue = tempValue === 'true' || tempValue === 'Có';
      }
      onUpdateMaterial(id, { ...plan, [field]: finalValue });`;
const saveReplace = `      if (field === 'docCo') {
        finalValue = tempValue === 'true' || tempValue === 'Có';
      }
      
      if (field === 'notes') {
        if (subTab === 'DOCS') {
          finalValue = \`\${getTechNote(plan.notes)} [DOC-NOTE] \${finalValue}\`;
        } else {
          finalValue = \`\${finalValue} [DOC-NOTE] \${getDocNote(plan.notes)}\`;
        }
      }

      onUpdateMaterial(id, { ...plan, [field]: finalValue });`;
f = f.replace(saveTarget, saveReplace);


// 3. Restore GHI CHU header
const headerTarget = `{subTab !== 'TECH' && subTab !== 'DOCS' && <th rowSpan={2} style={{ width: 110, borderBottom: '1px solid #94a3b8', borderLeft: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">GHI CHÚ</th>}`;
const headerReplace = `{subTab !== 'TECH' && <th rowSpan={2} style={{ width: 110, borderBottom: '1px solid #94a3b8', borderLeft: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">GHI CHÚ</th>}`;
f = f.replace(headerTarget, headerReplace);


// 4. Restore and update GHI CHU COMBINED body cell
const bodyTarget = `{/* GHI CHÚ COMBINED */}
                          {subTab !== 'TECH' && subTab !== 'DOCS' ? (
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 align-middle text-slate-500">
                              {editingCell?.id === plan.id && editingCell?.field === 'notes' && !editingCell.isPurchasing ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full bg-white text-slate-500 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border border-slate-200 rounded"
                                />
                              ) : (
                                <div onClick={() => startEditing(plan.id, 'notes', cleanNotes(plan.notes))} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={cleanNotes(plan.notes)}>
                                  <span className="truncate flex-1">{cleanNotes(plan.notes)}</span>
                                </div>
                              )}
                            </td>
                          ) : null}`;

const bodyReplace = `{/* GHI CHÚ COMBINED */}
                          {subTab !== 'TECH' ? (
                            <td className="bg-white group-hover:bg-slate-50 border-l border-slate-200 p-0 align-middle text-slate-500">
                              {editingCell?.id === plan.id && editingCell?.field === 'notes' && !editingCell.isPurchasing ? (
                                <input
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => saveEditing(plan, pRecord)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                  autoFocus
                                  className="w-full bg-white text-slate-500 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border border-slate-200 rounded"
                                />
                              ) : (
                                <div onClick={() => startEditing(plan.id, 'notes', subTab === 'DOCS' ? cleanDocNotes(plan.notes) : cleanTechNotes(plan.notes))} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={subTab === 'DOCS' ? cleanDocNotes(plan.notes) : cleanTechNotes(plan.notes)}>
                                  <span className="truncate flex-1">{subTab === 'DOCS' ? cleanDocNotes(plan.notes) : cleanTechNotes(plan.notes)}</span>
                                </div>
                              )}
                            </td>
                          ) : null}`;
f = f.replace(bodyTarget, bodyReplace);


// 5. Update the "NOTE:" section in TECH tab
const techNoteTarget = `<div onClick={() => startEditing(plan.id, 'notes', cleanNotes(plan.notes))} className="min-h-[20px] cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded text-slate-700 whitespace-normal break-words leading-tight" title={cleanNotes(plan.notes) || 'Click để nhập'}>
                                        {cleanNotes(plan.notes) || <span className="text-slate-300 italic">...</span>}
                                      </div>`;

const techNoteReplace = `<div onClick={() => startEditing(plan.id, 'notes', cleanTechNotes(plan.notes))} className="min-h-[20px] cursor-pointer hover:bg-slate-200 px-1 py-0.5 rounded text-slate-700 whitespace-normal break-words leading-tight" title={cleanTechNotes(plan.notes) || 'Click để nhập'}>
                                        {cleanTechNotes(plan.notes) || <span className="text-slate-300 italic">...</span>}
                                      </div>`;
f = f.replace(techNoteTarget, techNoteReplace);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
