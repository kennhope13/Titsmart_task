const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

// Replace the invalid JSX with a valid block map
f = f.replace(/\{logsByProject\.map\(\(\[projectCode, logs\]\) => \([\s\S]*?const allProjectImages = logs\.flatMap\(l => l\.images\);\n                  <div className="flex flex-col p-5 space-y-6 max-h-\[600px\] overflow-y-auto">/g, 
  `{logsByProject.map(([projectCode, logs]) => {
                const allProjectImages = logs.flatMap(l => l.images);
                return (
                <div key={projectCode} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Header Card */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <div>
                      <h3 className="font-bold text-slate-800 uppercase text-[13px] tracking-wide mb-1">
                        {projectCode}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{logs.length} bản ghi nhật ký</p>
                    </div>
                  </div>

                  <div className="flex flex-col p-5 space-y-6 max-h-[600px] overflow-y-auto">`
);

// We need to change the closing parenthesis of the map from `)` to `}` because we changed `=> (` to `=> { ... return (`
// It's located at the end of the logsByProject.map
f = f.replace(/<\/div>\n              \)\)}\n            <\/div>/g, `</div>\n              ) })}\n            </div>`);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f, 'utf8');
console.log("Fixed JSX syntax error.");
