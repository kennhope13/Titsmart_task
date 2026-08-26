const fs = require('fs');
const file = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add previewFile state after fastDocModels
code = code.replace(
  `const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);`,
  `const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);`
);

// 2. Find where MultiDocSelect is used in JSX and add onFileClick prop
// Search for all usages of <MultiDocSelect
code = code.replace(
  /onBadgeClick={handleDocBadgeClick} disabled/g,
  `onBadgeClick={handleDocBadgeClick} onFileClick={(url, title) => setPreviewFile({ url, title })} disabled`
);

// 3. Add the file preview modal before the closing fragment or at the end of the return JSX
// Find the FastDocModal usage to add the preview modal right after it
const fastDocModalEnd = `</FastDocModal>
      )}`;
const previewModal = `</FastDocModal>
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
      )}`;

if (code.includes(fastDocModalEnd)) {
  code = code.replace(fastDocModalEnd, previewModal);
  console.log('Added preview modal after FastDocModal');
} else {
  console.log('Could not find FastDocModal closing tag, trying alternative...');
  // Try to find by searching for the closing pattern more flexibly
  const altPattern = '</FastDocModal>';
  const idx = code.lastIndexOf(altPattern);
  if (idx !== -1) {
    // Find the next )} after it
    const afterIdx = code.indexOf(')}', idx);
    if (afterIdx !== -1) {
      const before = code.substring(0, afterIdx + 2);
      const after = code.substring(afterIdx + 2);
      code = before + `

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
      )}` + after;
      console.log('Added preview modal via alternative method');
    }
  }
}

fs.writeFileSync(file, code);
console.log('Done!');
