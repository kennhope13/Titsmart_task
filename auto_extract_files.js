const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// Normalize newlines
f = f.replace(/\r\n/g, '\n');

// 1. Rename header TÊN FILE -> FILE
f = f.replace(
  '<th rowSpan={2} style={{ width: 140, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">TÊN FILE</th>',
  '<th rowSpan={2} style={{ width: 100, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">FILE</th>'
);

// 2. Remove fileName from saveEditing (optional, but good to clean up)
// Just leave it since it won't be called, or replace it if easy.
// It's inside the if (field === 'fileName') block. I'll just leave it since the UI won't trigger it anymore.

// 3. Insert `renderAutoFiles` helper
const renderHelper = `const showNumber = (value?: number) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
};

const renderAutoFiles = (plan: ProjectMaterialPlan) => {
  if (!plan.issueContent || !plan.issueContent.includes('[DOC-DATA]')) return null;
  try {
    const models = decodeModels(plan.issueContent);
    const links: React.ReactNode[] = [];
    let counter = 0;
    models.forEach(m => {
      m.docs.forEach(d => {
        if (!d.fileUrls || d.fileUrls.length === 0) return;
        const lower = (d.text || '').toLowerCase();
        let typeLabel = '';
        if (lower.includes('co') || lower.includes('c/o')) typeLabel = 'CO';
        else if (lower.includes('cq') || lower.includes('c/q')) typeLabel = 'CQ';
        else if (lower.includes('pccc') || lower.includes('phòng cháy')) typeLabel = 'PCCC';
        
        d.fileUrls.forEach(url => {
           counter++;
           links.push(
             <a key={\`f-\${counter}\`} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs truncate max-w-[90px] block font-semibold text-center w-full" title={d.text}>
               {typeLabel || 'FILE'}
             </a>
           );
        });
      });
    });
    return links.length > 0 ? <div className="flex flex-col gap-1 items-center justify-center p-1 w-full">{links}</div> : null;
  } catch (e) { return null; }
};`;

f = f.replace(`const showNumber = (value?: number) => {
  const n = Number(value || 0);
  return n ? n.toLocaleString('vi-VN') : '';
};`, renderHelper);


// 4. Replace the old body cell for TÊN FILE
const oldCellTarget = `{/* TÊN FILE */}
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

const newCellTarget = `{/* FILE (Auto extracted from DOC-DATA) */}
                              <td className="p-0 align-middle text-center text-slate-600 border-r border-slate-200">
                                <div className="w-full min-h-[32px] flex items-center justify-center">
                                  {renderAutoFiles(plan)}
                                </div>
                              </td>`;

f = f.replace(oldCellTarget, newCellTarget);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
