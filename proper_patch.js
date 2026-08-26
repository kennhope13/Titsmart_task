const fs = require('fs');
const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let f = fs.readFileSync(filePath, 'utf8');

const uiTarget = `            {(subTab === 'TECH' || subTab === 'FINANCE') && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Đặt hàng:</span>
                <CustomSelect
                  value={filterOrder}
                  onChange={e => setFilterOrder(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {orderOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                  ))}
                </CustomSelect>
              </div>
            )}`;
const uiReplacement = `            {(subTab === 'TECH' || subTab === 'FINANCE') && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Đặt hàng:</span>
                <CustomSelect
                  value={filterOrder}
                  onChange={e => setFilterOrder(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {orderOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                  ))}
                </CustomSelect>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium whitespace-nowrap">Mã hiệu:</span>
              <CustomSelect
                value={filterModel}
                onChange={e => setFilterModel(e.target.value)}
                className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                {modelOptions.map(opt => {
                  let label = opt;
                  if (label && label.length > 20) label = label.slice(0, 20) + '...';
                  return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                })}
              </CustomSelect>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium whitespace-nowrap">Xuất xứ:</span>
              <CustomSelect
                value={filterOrigin}
                onChange={e => setFilterOrigin(e.target.value)}
                className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                {originOptions.map(opt => {
                  let label = opt;
                  if (label && label.length > 20) label = label.slice(0, 20) + '...';
                  return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                })}
              </CustomSelect>
            </div>

            {subTab === 'DOCS' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Chứng từ:</span>
                <CustomSelect
                  value={filterDocs}
                  onChange={e => setFilterDocs(e.target.value)}
                  className="min-w-[70px] max-w-[110px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {docsOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </CustomSelect>
              </div>
            )}`;

f = f.replace(uiTarget, uiReplacement);
fs.writeFileSync(filePath, f);
console.log("Replaced UI");
