const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// Normalize newlines
f = f.replace(/\r\n/g, '\n');

// 1. Update helpers
const oldHelpers = `const getTechNote = (val?: string) => String(val || '').split('[DOC-NOTE]')[0];
const getDocNote = (val?: string) => {
  const parts = String(val || '').split('[DOC-NOTE]');
  return parts.length > 1 ? parts[1].trim() : '';
};
const cleanTechNotes = (val?: string) => cleanNotes(getTechNote(val));
const cleanDocNotes = (val?: string) => getDocNote(val);`;

const newHelpers = `const getTechNote = (val?: string) => String(val || '').split('[DOC-NOTE]')[0];
const getDocNoteFull = (val?: string) => {
  const parts = String(val || '').split('[DOC-NOTE]');
  return parts.length > 1 ? parts[1] : '';
};
const getDocNote = (val?: string) => getDocNoteFull(val).split('[DOC-FILENAME]')[0].trim();
const getDocFileName = (val?: string) => {
  const parts = getDocNoteFull(val).split('[DOC-FILENAME]');
  return parts.length > 1 ? parts[1].trim() : '';
};
const cleanTechNotes = (val?: string) => cleanNotes(getTechNote(val));
const cleanDocNotes = (val?: string) => getDocNote(val);`;

f = f.replace(oldHelpers, newHelpers);

// 2. Update saveEditing
const oldSaveEditing = `    } else {
      if (field === 'notes') {
        const existingTags = String(plan.notes || '').match(/(\\[order:[\\d.]+\\]|\\[section\\]|\\[contractor\\]|\\[owner\\])/gi) || [];
        finalValue = [...existingTags, typeof tempValue === 'string' ? tempValue.trim() : tempValue].filter(Boolean).join(' | ');
      } else if (field === 'contractVolume' || field === 'orderedVolume') {
        finalValue = Number(tempValue || 0);
      } else if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
        finalValue = tempValue === true || tempValue === 'true' || tempValue === 'Có';
      }
      onUpdateMaterial(id, { ...plan, [field]: finalValue });
    }`;

const newSaveEditing = `    } else {
      let finalNotes = String(plan.notes || '');
      const currentTech = getTechNote(finalNotes);
      const currentDoc = getDocNote(finalNotes);
      const currentFile = getDocFileName(finalNotes);

      if (field === 'notes') {
        const existingTags = finalNotes.match(/(\\[order:[\\d.]+\\]|\\[section\\]|\\[contractor\\]|\\[owner\\])/gi) || [];
        let updatedNote = [...existingTags, typeof tempValue === 'string' ? tempValue.trim() : tempValue].filter(Boolean).join(' | ');
        
        if (subTab === 'DOCS') {
           finalValue = \`\${currentTech} [DOC-NOTE] \${updatedNote} [DOC-FILENAME] \${currentFile}\`;
        } else {
           finalValue = \`\${updatedNote} [DOC-NOTE] \${currentDoc} [DOC-FILENAME] \${currentFile}\`;
        }
      } else if (field === 'fileName') {
        finalValue = \`\${currentTech} [DOC-NOTE] \${currentDoc} [DOC-FILENAME] \${typeof tempValue === 'string' ? tempValue.trim() : tempValue}\`;
        field = 'notes';
      } else if (field === 'contractVolume' || field === 'orderedVolume') {
        finalValue = Number(tempValue || 0);
      } else if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
        finalValue = tempValue === true || tempValue === 'true' || tempValue === 'Có';
      }
      onUpdateMaterial(id, { ...plan, [field]: finalValue });
    }`;

f = f.replace(oldSaveEditing, newSaveEditing);

// 3. Update colSpanCount for DOCS
f = f.replace(`if (subTab === 'DOCS') return 3;`, `if (subTab === 'DOCS') return 4;`);

// 4. Update Header
const oldDocsHeader = `{subTab === 'DOCS' && (
                <>
                  <th rowSpan={2} style={{ width: 140, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>
                  
                </>
              )}`;

const newDocsHeader = `{subTab === 'DOCS' && (
                <>
                  <th rowSpan={2} style={{ width: 140, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>
                  <th rowSpan={2} style={{ width: 140, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TÊN FILE</th>
                </>
              )}`;

f = f.replace(oldDocsHeader, newDocsHeader);

// 5. Update Body
const oldDocsBody = `{/* CHỨNG TỪ HÀNG HÓA (Combined CO, CQ, PCCC) */}
                              <td className="w-[140px] p-0 align-middle text-center border-r border-slate-200">
                                <div className="flex items-center justify-center gap-1 p-1">
                                  <button
                                    type="button"
                                    disabled={userRole === 'engineer'}
                                    onClick={() => handleDocBadgeClick(plan, 'CO')}
                                    className={\`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors \${plan.docCo ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}\`}
                                  >
                                    CO
                                  </button>
                                  <button
                                    type="button"
                                    disabled={userRole === 'engineer'}
                                    onClick={() => handleDocBadgeClick(plan, 'CQ')}
                                    className={\`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors \${plan.docCq ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}\`}
                                  >
                                    CQ
                                  </button>
                                  <button
                                    type="button"
                                    disabled={userRole === 'engineer'}
                                    onClick={() => handleDocBadgeClick(plan, 'PCCC')}
                                    className={\`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors \${plan.docFireInspection ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}\`}
                                  >
                                    PCCC
                                  </button>
                                </div>
                              </td>`;

const newDocsBody = `${oldDocsBody}
                              {/* TÊN FILE */}
                              <td className="p-0 align-middle text-center text-slate-600 border-r border-slate-200">
                                {editingCell?.id === plan.id && editingCell?.field === 'fileName' && !editingCell.isPurchasing ? (
                                  <input
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => saveEditing(plan, pRecord)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(plan, pRecord); if (e.key === 'Escape') setEditingCell(null); }}
                                    autoFocus
                                    className="w-full text-center bg-white text-slate-600 focus:outline-primary text-xs px-1.5 py-1.5 h-[28px] box-border outline-none shadow-sm border-none rounded"
                                  />
                                ) : (
                                  <div onClick={() => startEditing(plan.id, 'fileName', getDocFileName(plan.notes))} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center justify-center px-1.5 py-1.5" title={getDocFileName(plan.notes)}>
                                    <span className="truncate">{getDocFileName(plan.notes)}</span>
                                  </div>
                                )}
                              </td>`;

f = f.replace(oldDocsBody, newDocsBody);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
console.log(f.indexOf('TÊN FILE'));
