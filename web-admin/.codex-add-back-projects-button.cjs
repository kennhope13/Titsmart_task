const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const target = `        <div className="flex flex-wrap gap-2 lg:justify-end">

          <button
            onClick={() => {
              if (selectedProjectCode !== 'all') {
                setProjectCode(selectedProjectCode);
              }
              setIsNewTaskModalOpen(true);
            }}
            className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Thêm Hạng mục
          </button>`;
const replacement = `        <div className="flex flex-wrap gap-2 lg:justify-end">
          {selectedProjectFromUrl && (
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Quay lại tất cả dự án
            </button>
          )}

          <button
            onClick={() => {
              if (selectedProjectCode !== 'all') {
                setProjectCode(selectedProjectCode);
              }
              setIsNewTaskModalOpen(true);
            }}
            className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Thêm Hạng mục
          </button>`;
if (!s.includes(target)) throw new Error('header action block not found');
s = s.replace(target, replacement);
fs.writeFileSync(p, s, 'utf8');
