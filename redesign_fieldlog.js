const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

// We need to add state for selectedProject
f = f.replace(/const \[filterProject, setFilterProject\] = useState<string>\('all'\);/g, 
`const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);`);

// Replace the main body.
// Find the grid rendering:
const gridRegex = /<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">[\s\S]*?<\/div>\s*\) \}\)\}\s*<\/div>/;

const newBody = `{selectedProject ? (
              <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden">
                <div className="flex items-center px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                  <button onClick={() => setSelectedProject(null)} className="mr-4 p-2 rounded-full hover:bg-slate-200 text-slate-600 transition flex items-center justify-center">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 uppercase">{selectedProject}</h2>
                    <p className="text-sm text-slate-500">Chi tiết nhật ký hiện trường</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {(() => {
                    const logs = logsByProject.find(p => p[0] === selectedProject)?.[1] || [];
                    const allProjectImages = logs.flatMap(l => l.images);
                    return logs.map((log) => (
                      <div key={log.id} className="relative pl-6 border-l-2 border-slate-200">
                        <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full bg-white border-4 border-primary flex items-center justify-center"></div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[13px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full shadow-sm">
                            {formatTimeOnly(log.timestamp)}
                          </span>
                          <button onClick={() => setDeletingId(log.id)} title="Xóa báo cáo"
                            className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>

                        {log.note && (
                          <div className="mb-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-inner whitespace-pre-wrap">
                            {log.note}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                          {log.images.map((img, i) => (
                            <button key={i} onClick={() => setLightbox({ images: allProjectImages, index: allProjectImages.indexOf(img) })}
                              className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md transition">
                              <img src={img} alt="Ảnh nhật ký" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {logsByProject.map(([projectCode, logs]) => {
                  const latestLog = logs[0];
                  const previewImages = logs.flatMap(l => l.images).slice(0, 4);
                  return (
                  <div key={projectCode} onClick={() => setSelectedProject(projectCode)} className="group cursor-pointer flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex flex-col p-5 border-b border-slate-100 bg-slate-50 group-hover:bg-primary/5 transition-colors">
                      <h3 className="font-bold text-slate-800 uppercase text-[14px] tracking-wide mb-1 truncate group-hover:text-primary transition-colors">
                        {projectCode}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{logs.length} bản ghi nhật ký</p>
                    </div>

                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div className="mb-4">
                        <div className="flex items-center text-xs text-slate-400 mb-2">
                          <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                          Cập nhật mới nhất: {formatTimeOnly(latestLog.timestamp)}
                        </div>
                        {latestLog.note && <p className="text-sm text-slate-600 line-clamp-2">{latestLog.note}</p>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {previewImages.map((img, i) => (
                          <div key={i} className="h-10 w-10 rounded bg-slate-100 overflow-hidden border border-slate-200">
                            <img src={img} className="h-full w-full object-cover" />
                          </div>
                        ))}
                        {logs.flatMap(l => l.images).length > 4 && (
                          <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                            +{logs.flatMap(l => l.images).length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}`;

if (!gridRegex.test(f)) {
  console.log("Could not find grid render code!");
} else {
  f = f.replace(gridRegex, newBody);
  fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f, 'utf8');
  console.log("Redesigned FieldLogsPage view.");
}
