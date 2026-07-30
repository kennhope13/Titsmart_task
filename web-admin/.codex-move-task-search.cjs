const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const searchBlock = `

          {/* Right: Quick Search Box */}
          <div className="relative w-full md:w-56">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm nhanh công việc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"
            />
          </div>`;
const newSearchBlock = `

        {/* Row 3: Search */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm nhanh công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"
          />
        </div>`;
if (!s.includes(searchBlock)) throw new Error('search block not found');
s = s.replace(searchBlock, '');
const insertAfter = `          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Xóa bộ lọc
            </button>
          )}
        </div>`;
if (!s.includes(insertAfter)) throw new Error('row2 end not found');
s = s.replace(insertAfter, insertAfter + newSearchBlock);
fs.writeFileSync(p, s, 'utf8');
