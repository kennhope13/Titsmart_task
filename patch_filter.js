const fs = require('fs');
const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let f = fs.readFileSync(filePath, 'utf8');

// 1. Add states
const statesTarget = `  const [filterOrder, setFilterOrder] = useState('all');`;
const statesReplacement = `  const [filterOrder, setFilterOrder] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterDocs, setFilterDocs] = useState('all');`;
f = f.replace(statesTarget, statesReplacement);

// 2. Add options
const optionsTarget = `  const orderOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.orderedStatus).filter(Boolean)))], [data]);`;
const optionsReplacement = `  const orderOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.orderedStatus).filter(Boolean)))], [data]);
  const modelOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.techSpecModel).filter(Boolean)))], [data]);
  const originOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.techSpecOrigin).filter(Boolean)))], [data]);
  const docsOptions = [
    { id: 'all', label: 'Tất cả' },
    { id: 'missing_co', label: 'Thiếu CO' },
    { id: 'missing_cq', label: 'Thiếu CQ' },
    { id: 'missing_fire', label: 'Thiếu PCCC' },
    { id: 'not_dispatched', label: 'Chưa về CT' }
  ];`;
f = f.replace(optionsTarget, optionsReplacement);

// 3. Add to filteredData logic
const filterLogicTarget = `    if (statusFilter && statusFilter !== 'Tất cả' && statusFilter !== 'ALL') {`;
const filterLogicReplacement = `    if (filterModel && filterModel !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.techSpecModel === filterModel;
      });
    }
    if (filterOrigin && filterOrigin !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.techSpecOrigin === filterOrigin;
      });
    }
    if (filterDocs && filterDocs !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         if (filterDocs === 'missing_co') return !p.docCo;
         if (filterDocs === 'missing_cq') return !p.docCq;
         if (filterDocs === 'missing_fire') return !p.docFireInspection;
         if (filterDocs === 'not_dispatched') return !p.dispatchToSite;
         return true;
      });
    }
    if (statusFilter && statusFilter !== 'Tất cả' && statusFilter !== 'ALL') {`;
f = f.replace(filterLogicTarget, filterLogicReplacement);

// 4. Add UI dropdowns
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
console.log("Done");
