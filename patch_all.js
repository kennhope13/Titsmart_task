const fs = require('fs');
const file = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let code = fs.readFileSync(file, 'utf8');
let changes = 0;

// ============================================================
// 1. Add hasDocFiles helper BEFORE renderAutoFilesByType
// ============================================================
const renderAutoStart = `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP') => {`;
const hasDocFilesHelper = `const hasDocFiles = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP'): boolean => {
  if (!plan.issueContent || !plan.issueContent.includes('[DOC-DATA]')) return false;
  try {
    const models = decodeModels(plan.issueContent);
    return models.some(m => m.docs.some(d => {
      if (!d.fileUrls || d.fileUrls.length === 0) return false;
      const lower = (d.text || '').toLowerCase();
      if (type === 'CO') return lower.includes('co') || lower.includes('c/o');
      if (type === 'CQ') return lower.includes('cq') || lower.includes('c/q');
      if (type === 'PCCC') return lower.includes('pccc') || lower.includes('ph\u00f2ng ch\u00e1y');
      if (type === 'STAMP') return lower.includes('tem') || lower.includes('ki\u1ec3m \u0111\u1ecbnh') || lower.includes('stamp') || lower.includes('tkd');
      return false;
    }));
  } catch { return false; }
};

`;

if (!code.includes('hasDocFiles')) {
  code = code.replace(renderAutoStart, hasDocFilesHelper + renderAutoStart);
  changes++;
  console.log('[1] Added hasDocFiles helper');
}

// ============================================================
// 2. Change renderAutoFilesByType to accept onFileClick callback
//    and use buttons instead of <a> tags
// ============================================================
// Change signature
code = code.replace(
  `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP') => {`,
  `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP', onFileClick?: (url: string, title: string) => void) => {`
);

// Change <a> to <button> with onClick
const oldLink = `             links.push(
               <a key={\`f-\${counter}\`} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors flex items-center justify-center" title={d.text || 'Xem file'}>
                 <span className="material-symbols-outlined text-[16px]">description</span>
               </a>`;
const newLink = `             const fileTitle = d.text || type;
             links.push(
               <button
                 key={\`f-\${counter}\`}
                 type="button"
                 onClick={(e) => { e.stopPropagation(); onFileClick ? onFileClick(url, fileTitle) : window.open(url, '_blank'); }}
                 className="text-blue-500 hover:text-blue-700 transition-colors flex items-center justify-center cursor-pointer"
                 title={fileTitle}
               >
                 <span className="material-symbols-outlined text-[16px]">description</span>
               </button>`;

if (code.includes(oldLink)) {
  code = code.replace(oldLink, newLink);
  changes++;
  console.log('[2] Changed <a> to <button> with onFileClick');
}

// ============================================================
// 3. Update MultiDocSelect to accept onFileClick prop
// ============================================================
code = code.replace(
  `const MultiDocSelect = ({ plan, onBadgeClick, disabled }: { plan: any, onBadgeClick: (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => void, disabled: boolean }) => {`,
  `const MultiDocSelect = ({ plan, onBadgeClick, onFileClick, disabled }: { plan: any, onBadgeClick: (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => void, onFileClick: (url: string, title: string) => void, disabled: boolean }) => {`
);
changes++;
console.log('[3] Updated MultiDocSelect props');

// ============================================================
// 4. Pass onFileClick to renderAutoFilesByType calls inside MultiDocSelect
// ============================================================
code = code.replace(`{renderAutoFilesByType(plan, 'CO')}`, `{renderAutoFilesByType(plan, 'CO', onFileClick)}`);
code = code.replace(`{renderAutoFilesByType(plan, 'CQ')}`, `{renderAutoFilesByType(plan, 'CQ', onFileClick)}`);
code = code.replace(`{renderAutoFilesByType(plan, 'PCCC')}`, `{renderAutoFilesByType(plan, 'PCCC', onFileClick)}`);
code = code.replace(`{renderAutoFilesByType(plan, 'STAMP')}`, `{renderAutoFilesByType(plan, 'STAMP', onFileClick)}`);
changes++;
console.log('[4] Passed onFileClick to renderAutoFilesByType calls');

// ============================================================
// 5. Use hasDocFiles for STAMP badge display instead of plan.docStamp
// ============================================================
code = code.replace(`{plan.docStamp && (`, `{hasDocFiles(plan, 'STAMP') && (`);
code = code.replace(
  `{!plan.docCo && !plan.docCq && !plan.docFireInspection && !plan.docStamp && (`,
  `{!plan.docCo && !plan.docCq && !plan.docFireInspection && !hasDocFiles(plan, 'STAMP') && (`
);
changes++;
console.log('[5] Used hasDocFiles for STAMP badge');

// ============================================================
// 6. Add previewFile state
// ============================================================
code = code.replace(
  `const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);`,
  `const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);`
);
changes++;
console.log('[6] Added previewFile state');

// ============================================================
// 7. Pass onFileClick when using MultiDocSelect
// ============================================================
code = code.replace(
  /onBadgeClick={handleDocBadgeClick} disabled/g,
  `onBadgeClick={handleDocBadgeClick} onFileClick={(url: string, title: string) => setPreviewFile({ url, title })} disabled`
);
changes++;
console.log('[7] Passed onFileClick to MultiDocSelect usage');

// ============================================================
// 8. Add preview modal after FastDocModal in JSX
// ============================================================
const fastDocClosing = `        />
      )}

      <datalist id="issueStatus-options">`;

const previewModal = `        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewFile(null)} />
          <div className="relative flex w-full max-w-4xl h-[85vh] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <span className="material-symbols-outlined text-base text-primary">description</span>
                {previewFile.title}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  T\u1EA3i v\u1EC1
                </a>
                <button onClick={() => setPreviewFile(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-100">
              {previewFile.url.match(/\\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                <div className="flex items-center justify-center h-full p-4">
                  <img src={previewFile.url} alt={previewFile.title} className="max-w-full max-h-full object-contain rounded-lg shadow" />
                </div>
              ) : (
                <iframe
                  src={previewFile.url}
                  className="w-full h-full border-0"
                  title={previewFile.title}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <datalist id="issueStatus-options">`;

if (code.includes(fastDocClosing)) {
  code = code.replace(fastDocClosing, previewModal);
  changes++;
  console.log('[8] Added preview modal after FastDocModal');
} else {
  console.log('[8] WARNING: Could not find FastDocModal closing pattern!');
  // Debug
  const idx = code.indexOf('onSubmit={handleFastDocSubmit}');
  if (idx !== -1) {
    console.log('Found onSubmit at index', idx);
    console.log('Next 200 chars:', code.substring(idx, idx + 200));
  }
}

fs.writeFileSync(file, code);
console.log(`\nDone! Applied ${changes} changes.`);
