const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const importBlock = `
          <div className="relative">
            <button
              onClick={() => {
                setIsImportMenuOpen(!isImportMenuOpen);
                setIsExportMenuOpen(false);
              }}
              className="flex items-center gap-1.5 border border-blue-200 bg-blue-50 text-primary px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Nhập file</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

            {isImportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                {([
                  ['xlsx', 'Excel (.xlsx)', 'table_view'],
                  ['csv', 'CSV (.csv)', 'csv'],
                  ['pdf', 'PDF (.pdf)', 'picture_as_pdf'],
                  ['docx', 'Word (.docx)', 'description'],
                ] as Array<[ImportFileFormat, string, string]>).map(([format, label, icon]) => (
                  <button
                    key={format}
                    onClick={() => openImportPicker(format)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-blue-600">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
`;
const exportBlock = `
          <div className="relative">
            <button
              onClick={() => {
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsImportMenuOpen(false);
              }}
              className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-emerald-700">download</span>
              <span>Xuất file</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                {([
                  ['xlsx', 'Excel (.xlsx)', 'table_view'],
                  ['csv', 'CSV (.csv)', 'csv'],
                  ['pdf', 'PDF (.pdf)', 'picture_as_pdf'],
                  ['docx', 'Word (.docx)', 'description'],
                ] as Array<[ExportFileFormat, string, string]>).map(([format, label, icon]) => (
                  <button
                    key={format}
                    onClick={() => handleExportFile(format)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-emerald-600">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>`;
if (!s.includes(importBlock)) throw new Error('import block not found');
if (!s.includes(exportBlock)) throw new Error('export block not found');
s = s.replace(importBlock, '\n');
s = s.replace(exportBlock, '');
const exportInline = `
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base text-emerald-700">download</span>
                <span>Xuất file</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                  {([
                    ['xlsx', 'Excel (.xlsx)', 'table_view'],
                    ['csv', 'CSV (.csv)', 'csv'],
                    ['pdf', 'PDF (.pdf)', 'picture_as_pdf'],
                    ['docx', 'Word (.docx)', 'description'],
                  ] as Array<[ExportFileFormat, string, string]>).map(([format, label, icon]) => (
                    <button
                      key={format}
                      onClick={() => handleExportFile(format)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-emerald-600">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
`;
const searchMarker = `            {/* Search */}
            <div className="relative w-full md:w-64">`;
if (!s.includes(searchMarker)) throw new Error('search marker not found');
s = s.replace(searchMarker, exportInline + searchMarker);
fs.writeFileSync(p, s, 'utf8');
