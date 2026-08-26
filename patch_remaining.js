const fs = require('fs');
const file = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add hasDocFiles if missing
if (!code.includes('hasDocFiles')) {
  const marker = /const renderAutoFilesByType/;
  const helper = `const hasDocFiles = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP'): boolean => {
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
  code = code.replace(marker, helper + 'const renderAutoFilesByType');
  console.log('[1] Added hasDocFiles');
}

// 2. Fix renderAutoFilesByType signature if not already done
if (!code.includes('onFileClick?: (url: string, title: string)')) {
  code = code.replace(
    /const renderAutoFilesByType = \(plan: ProjectMaterialPlan, type: 'CO' \| 'CQ' \| 'PCCC' \| 'STAMP'\) => \{/,
    "const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP', onFileClick?: (url: string, title: string) => void) => {"
  );
  console.log('[2] Fixed renderAutoFilesByType signature');
}

// 3. Replace <a> link with <button> if not already done
if (code.includes('<a key={`f-${counter}`}')) {
  const oldA = /<a key=\{`f-\$\{counter\}`\} href=\{url\} target="_blank"[^>]*>[^<]*<span[^>]*>description<\/span>[^<]*<\/a>/;
  const newBtn = `<button
                 key={\`f-\${counter}\`}
                 type="button"
                 onClick={(e) => { e.stopPropagation(); onFileClick ? onFileClick(url, d.text || type) : window.open(url, '_blank'); }}
                 className="text-blue-500 hover:text-blue-700 transition-colors flex items-center justify-center cursor-pointer"
                 title={d.text || type}
               >
                 <span className="material-symbols-outlined text-[16px]">description</span>
               </button>`;
  code = code.replace(oldA, newBtn);
  console.log('[3] Replaced <a> with <button>');
}

// 4. Add preview modal after FastDocModal - use regex to handle \r\n
const modalPattern = /onSubmit=\{handleFastDocSubmit\}\s*\/>\s*\)\}\s*\n\s*<datalist id="issueStatus-options">/;
const match = code.match(modalPattern);
if (match && !code.includes('File Preview Modal')) {
  const previewModalJSX = `onSubmit={handleFastDocSubmit}
        />
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
  code = code.replace(modalPattern, previewModalJSX);
  console.log('[4] Added preview modal');
} else if (!code.includes('File Preview Modal')) {
  console.log('[4] Pattern not found, trying broader approach...');
  // Even broader: find onSubmit={handleFastDocSubmit} then the next <datalist
  const idx1 = code.indexOf('onSubmit={handleFastDocSubmit}');
  if (idx1 !== -1) {
    const idx2 = code.indexOf('<datalist', idx1);
    if (idx2 !== -1) {
      const before = code.substring(0, idx2);
      const after = code.substring(idx2);
      code = before + `{/* File Preview Modal */}
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

      ` + after;
      console.log('[4] Added preview modal via broader approach');
    }
  }
}

fs.writeFileSync(file, code);
console.log('All done!');
