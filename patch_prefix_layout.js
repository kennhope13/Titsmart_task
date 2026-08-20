const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const newToolbar = `          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 text-xs">
              <span className="text-slate-500 whitespace-nowrap mr-1 font-medium">Đầu mục cha:</span>
              <CustomSelect
                value={filterParent}
                onChange={e => setFilterParent(e.target.value)}
                className="min-w-[80px] max-w-[140px] p-0 border-none bg-transparent !ring-0"
              >
                <option value="all">Tất cả</option>
                {parentOptions.filter(o => o.id !== 'all').map(opt => {
                  let label = opt.label;
                  if (label && label.length > 50) label = label.slice(0, 50) + '...';
                  return <option key={opt.id} value={opt.id}>{label}</option>;
                })}
              </CustomSelect>
            </div>
            
            <div className="flex items-center border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 text-xs">
              <span className="text-slate-500 whitespace-nowrap mr-1 font-medium">ĐVT:</span>
              <CustomSelect
                value={filterUnit}
                onChange={e => setFilterUnit(e.target.value)}
                className="min-w-[60px] max-w-[100px] p-0 border-none bg-transparent !ring-0"
              >
                <option value="all">Tất cả</option>
                {unitOptions.filter(o => o !== 'all').map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CustomSelect>
            </div>

            <div className="flex items-center border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 text-xs">
              <span className="text-slate-500 whitespace-nowrap mr-1 font-medium">Tiến độ:</span>
              <CustomSelect
                value={filterProgress}
                onChange={e => setFilterProgress(e.target.value)}
                className="min-w-[80px] max-w-[120px] p-0 border-none bg-transparent !ring-0"
              >
                <option value="all">Tất cả</option>
                {progressOptions.filter(o => o !== 'all').map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CustomSelect>
            </div>

            <div className="flex items-center border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 text-xs">
              <span className="text-slate-500 whitespace-nowrap mr-1 font-medium">Mua hàng:</span>
              <CustomSelect
                value={filterOrder}
                onChange={e => setFilterOrder(e.target.value)}
                className="min-w-[80px] max-w-[120px] p-0 border-none bg-transparent !ring-0"
              >
                <option value="all">Tất cả</option>
                {orderOptions.filter(o => o !== 'all').map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CustomSelect>
            </div>

            <div className="flex items-center border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 text-xs">
              <span className="text-slate-500 whitespace-nowrap mr-1 font-medium">Thi công:</span>
              <CustomSelect
                value={filterConstruction}
                onChange={e => setFilterConstruction(e.target.value)}
                className="min-w-[80px] max-w-[120px] p-0 border-none bg-transparent !ring-0"
              >
                <option value="all">Tất cả</option>
                {constructionOptions.filter(o => o !== 'all').map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CustomSelect>
            </div>
          </div>`;

content = content.replace(
  /<div className="flex items-center gap-2 flex-wrap">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  newToolbar + '\n        </div>\n      </div>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed prefix UI layout');
