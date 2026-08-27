const fs = require('fs');

let code = fs.readFileSync('web-admin/src/components/FieldLogsTaskTable.tsx', 'utf8');

const regexTbody = /<tbody className="divide-y divide-slate-200">/;

const generalRow = `<tbody className="divide-y divide-slate-200">
          {(() => {
            const generalLogs = logs.filter(l => !l.taskId);
            const generalImages = generalLogs.flatMap(l => l.images);
            return (
              <tr className="bg-amber-50/30 hover:bg-amber-50 transition-colors group border-b-2 border-slate-300">
                <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-xs font-bold text-amber-700">*</td>
                <td className="py-3 px-4 font-bold text-amber-900 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-lg">collections_bookmark</span>
                    Nhật ký chung của dự án (Không gắn với đầu mục nào)
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center flex-wrap gap-2">
                    {generalImages.length > 0 ? (
                      <>
                        <div className="flex gap-1.5 flex-wrap">
                          {generalImages.slice(0, 4).map((img, i) => (
                            <div key={i} onClick={() => openLightbox(generalImages, i)} className="w-10 h-10 rounded overflow-hidden border border-slate-200 cursor-pointer hover:border-primary">
                              <img src={img} className="w-full h-full object-cover" alt="log" />
                            </div>
                          ))}
                          {generalImages.length > 4 && (
                            <div onClick={() => openLightbox(generalImages, 4)} className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 cursor-pointer">
                              +{generalImages.length - 4}
                            </div>
                          )}
                        </div>
                        {generalLogs.map(l => (
                           l.note && (
                              <button key={l.id} onClick={() => onEditLogClick(l)} className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 ml-1 hover:bg-amber-100 truncate max-w-[120px]" title={l.note}>
                                {l.note}
                              </button>
                           )
                        ))}
                        <button onClick={() => onAddLogClick('')} className="w-10 h-10 rounded flex items-center justify-center border border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary transition-colors hover:bg-primary/5 ml-1" title="Thêm ảnh chung">
                          <span className="material-symbols-outlined text-lg">add_a_photo</span>
                        </button>
                      </>
                    ) : (
                      <button onClick={() => onAddLogClick('')} className="w-10 h-10 rounded flex items-center justify-center border border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary transition-colors hover:bg-primary/5" title="Thêm ảnh chung">
                        <span className="material-symbols-outlined text-lg">add_a_photo</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })()}`;

code = code.replace(regexTbody, generalRow);

fs.writeFileSync('web-admin/src/components/FieldLogsTaskTable.tsx', code);
console.log('Patched FieldLogsTaskTable with General row');
