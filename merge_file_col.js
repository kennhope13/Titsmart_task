const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// Normalize newlines
f = f.replace(/\r\n/g, '\n');

// 1. Rewrite renderAutoFiles
const oldRenderAuto = `const renderAutoFiles = (plan: ProjectMaterialPlan) => {
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

const newRenderAuto = `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC') => {
  if (!plan.issueContent || !plan.issueContent.includes('[DOC-DATA]')) return null;
  try {
    const models = decodeModels(plan.issueContent);
    const links: React.ReactNode[] = [];
    let counter = 0;
    models.forEach(m => {
      m.docs.forEach(d => {
        if (!d.fileUrls || d.fileUrls.length === 0) return;
        const lower = (d.text || '').toLowerCase();
        let docTypeMatches = false;
        if (type === 'CO' && (lower.includes('co') || lower.includes('c/o'))) docTypeMatches = true;
        else if (type === 'CQ' && (lower.includes('cq') || lower.includes('c/q'))) docTypeMatches = true;
        else if (type === 'PCCC' && (lower.includes('pccc') || lower.includes('phòng cháy'))) docTypeMatches = true;
        
        if (docTypeMatches) {
          d.fileUrls.forEach(url => {
             counter++;
             links.push(
               <a key={\`f-\${counter}\`} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px] truncate max-w-[150px]" title={d.text}>
                 {type}
               </a>
             );
          });
        }
      });
    });
    return links.length > 0 ? <div className="flex flex-wrap items-center gap-1">{links}</div> : null;
  } catch (e) { return null; }
};`;

f = f.replace(oldRenderAuto, newRenderAuto);

// 2. Change Headers
const oldHeader = `<th rowSpan={2} style={{ width: 140, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>
                  <th rowSpan={2} style={{ width: 100, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">FILE</th>`;

const newHeader = `<th rowSpan={2} style={{ width: 220, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>`;

f = f.replace(oldHeader, newHeader);

// 3. Change colSpanCount back to 3
f = f.replace(`if (subTab === 'DOCS') return 4;`, `if (subTab === 'DOCS') return 3;`);

// 4. Update the Body cells
// We need to replace the two <td>s with a single <td>
const oldBodyRegex = /\{\/\* CHỨNG TỪ HÀNG HÓA \(Combined CO, CQ, PCCC\) \*\/\}.*?\{\/\* FILE \(Auto extracted from DOC-DATA\) \*\/\}.*?<\/td>/s;

const newBody = `{/* CHỨNG TỪ HÀNG HÓA (Combined CO, CQ, PCCC) */}
                              <td className="w-[220px] p-0 align-middle border-r border-slate-200">
                                <div className="flex flex-col gap-1.5 p-1.5 w-full text-left pl-3">
                                  <div className="flex items-center gap-2">
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
                                  <div className="flex items-center gap-2">
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
                                  <div className="flex items-center gap-2">
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

f = f.replace(oldBodyRegex, newBody);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
