const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const row3 = `

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
const inlineSearch = `
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-64">
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
if (!s.includes(row3)) throw new Error('row3 search block not found');
s = s.replace(row3, '');
const resetStart = `

          {/* Reset All Filters Button */}
          {isAnyFilterActive && (`;
if (!s.includes(resetStart)) throw new Error('reset block start not found');
s = s.replace(resetStart, inlineSearch + resetStart);
const resetEnd = `          )}
        </div>`;
if (!s.includes(resetEnd)) throw new Error('reset block end not found');
s = s.replace(resetEnd, `          )}
          </div>
        </div>`);
fs.writeFileSync(p, s, 'utf8');
