const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace native selects with CustomSelect
const newToolbar = `      <div className="flex items-center gap-3 px-4 py-2 bg-white text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-slate-500 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Lọc chi tiết:
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <CustomSelect
              value={filterParent}
              onChange={e => setFilterParent(e.target.value)}
              className="min-w-[160px] max-w-[200px] border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 focus:outline-primary text-xs"
            >
              {parentOptions.map(opt => {
                let label = opt.label;
                if (label && label.length > 50) label = label.slice(0, 50) + '...';
                return <option key={opt.id} value={opt.id}>{opt.id === 'all' ? 'Đầu mục cha: Tất cả' : \`Đầu mục cha: \${label}\`}</option>;
              })}
            </CustomSelect>
            
            <CustomSelect
              value={filterUnit}
              onChange={e => setFilterUnit(e.target.value)}
              className="min-w-[120px] max-w-[160px] border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 focus:outline-primary text-xs"
            >
              {unitOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'ĐVT: Tất cả' : \`ĐVT: \${opt}\`}</option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={filterProgress}
              onChange={e => setFilterProgress(e.target.value)}
              className="min-w-[140px] max-w-[180px] border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 focus:outline-primary text-xs"
            >
              {progressOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Tiến độ: Tất cả' : \`Tiến độ: \${opt}\`}</option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={filterOrder}
              onChange={e => setFilterOrder(e.target.value)}
              className="min-w-[140px] max-w-[180px] border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 focus:outline-primary text-xs"
            >
              {orderOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Mua hàng: Tất cả' : \`Mua hàng: \${opt}\`}</option>
              ))}
            </CustomSelect>

            <CustomSelect
              value={filterConstruction}
              onChange={e => setFilterConstruction(e.target.value)}
              className="min-w-[140px] max-w-[180px] border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 focus:outline-primary text-xs"
            >
              {constructionOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Thi công: Tất cả' : \`Thi công: \${opt}\`}</option>
              ))}
            </CustomSelect>
          </div>
        </div>`;

// Use regex to replace the old toolbar
content = content.replace(
  /<div className="flex items-center gap-3 px-4 py-2 bg-white text-xs text-slate-600 flex-wrap">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  newToolbar + '\n      </div>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced native selects with CustomSelect');
