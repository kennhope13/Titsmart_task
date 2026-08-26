const fs = require('fs');
const file = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix the corrupted section - replace the broken FastDocModal + datalist area
const broken = `      {fastDocType && (
        <FastDocModal
          title={\`Cập nhật chứng từ \${fastDocType}\`}
      </datalist>`;

const fixed = `      {fastDocType && (
        <FastDocModal
          title={\`Cập nhật chứng từ \${fastDocType}\`}
          docType={fastDocType as any}
          initialModels={fastDocModels}
          onClose={() => setFastDocType(null)}
          onSubmit={handleFastDocSubmit}
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
                  Tải về
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

      <datalist id="issueStatus-options">
        <option value="Chưa xử lý" />
        <option value="Đang xử lý" />
        <option value="Đã xử lý" />
        <option value="Cần xác nhận" />
      </datalist>`;

if (code.includes(broken)) {
  code = code.replace(broken, fixed);
  
  // Also remove the duplicate issueStatus datalist that was left behind
  const duplicateDatalist = `      <datalist id="issueStatus-options">
        <option value="Chưa xử lý" />
        <option value="Đang xử lý" />
        <option value="Đã xử lý" />
        <option value="Cần xác nhận" />
      </datalist>`;
  
  // Count occurrences - if more than 1, remove extra
  const count = (code.match(/datalist id="issueStatus-options"/g) || []).length;
  if (count > 1) {
    // Remove second occurrence
    const firstIdx = code.indexOf('datalist id="issueStatus-options"');
    const secondIdx = code.indexOf('datalist id="issueStatus-options"', firstIdx + 1);
    if (secondIdx !== -1) {
      // Find the full datalist block around secondIdx
      const blockStart = code.lastIndexOf('<datalist', secondIdx);
      const blockEnd = code.indexOf('</datalist>', secondIdx) + '</datalist>'.length;
      code = code.substring(0, blockStart) + code.substring(blockEnd);
    }
  }
  
  fs.writeFileSync(file, code);
  console.log('Fixed corrupted code and added preview modal!');
} else {
  console.log('Could not find broken pattern. Let me check...');
  // Show lines around FastDocModal
  const lines = code.split('\n');
  const idx = lines.findIndex(l => l.includes('FastDocModal'));
  if (idx !== -1) {
    console.log('Lines around FastDocModal:');
    console.log(lines.slice(idx, idx + 15).join('\n'));
  }
}
