const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix useMemo dependencies
content = content.replace(
  '}, [data, searchQuery, statusFilter]);',
  '}, [data, searchQuery, statusFilter, filterParent, filterUnit, filterProgress, filterOrder, filterConstruction]);'
);

// 2. Replace native <select> with <CustomSelect>
const newToolbar = `          <div className="flex items-center gap-2 flex-wrap">
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
          </div>`;

content = content.replace(
  /<div className="flex items-center gap-2 flex-wrap">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  newToolbar + '\n        </div>\n      </div>'
);

// Note: `CustomSelect` needs to be imported if not already. Let's make sure it is!
if (!content.includes('CustomSelect')) {
    content = content.replace(
      "import React,", 
      "import { CustomSelect } from '@/components/common/CustomSelect';\nimport React,"
    );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed useMemo and replaced native selects cleanly');
