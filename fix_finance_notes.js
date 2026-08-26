const fs = require('fs');
const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let f = fs.readFileSync(filePath, 'utf8');

// 1. Fix saveEditing to preserve tags in pRecord.notes
const saveEditingStr = `        if (field === 'volumeOrder' || field === 'unitPrice' || field === 'vatRate' || field === 'prepayPercent' || field === 'prepayAmount') {`;
const saveEditingReplacement = `        if (field === 'notes') {
          const finalNotes = String(pRecord.notes || '');
          const existingTags = finalNotes.match(/(\\[order:[\\d.]+\\]|\\[section\\]|\\[contractor\\]|\\[owner\\])/gi) || [];
          finalValue = [...existingTags, typeof tempValue === 'string' ? tempValue.trim() : tempValue].filter(Boolean).join(' | ');
        } else if (field === 'volumeOrder' || field === 'unitPrice' || field === 'vatRate' || field === 'prepayPercent' || field === 'prepayAmount') {`;
f = f.replace(saveEditingStr, saveEditingReplacement);

// 2. Fix rendering in the table
const renderingStr = `                                <div onClick={() => {
                                  if (subTab === 'FINANCE') {
                                    if (pRecord) startEditing(plan.id, 'notes', pRecord.notes || '', true);
                                  } else {
                                    startEditing(plan.id, 'notes', cleanDocNotes(plan.notes), false);
                                  }
                                }} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={subTab === 'FINANCE' ? pRecord?.notes : cleanDocNotes(plan.notes)}>
                                  <span className="truncate flex-1">{subTab === 'FINANCE' ? pRecord?.notes : cleanDocNotes(plan.notes)}</span>
                                </div>`;
const renderingReplacement = `                                <div onClick={() => {
                                  if (subTab === 'FINANCE') {
                                    if (pRecord) startEditing(plan.id, 'notes', cleanNotes(pRecord.notes) || '', true);
                                  } else {
                                    startEditing(plan.id, 'notes', cleanDocNotes(plan.notes), false);
                                  }
                                }} className="w-full min-h-[32px] cursor-pointer hover:bg-slate-100 flex items-center px-1.5 py-1.5" title={subTab === 'FINANCE' ? cleanNotes(pRecord?.notes) : cleanDocNotes(plan.notes)}>
                                  <span className="truncate flex-1">{subTab === 'FINANCE' ? cleanNotes(pRecord?.notes) : cleanDocNotes(plan.notes)}</span>
                                </div>`;
f = f.replace(renderingStr, renderingReplacement);

fs.writeFileSync(filePath, f);
console.log("Done");
