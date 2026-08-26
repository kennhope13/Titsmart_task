const fs = require('fs');
const filePath = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

if (!data.includes('filterDocType')) {
  // 1. Add filter state
  const statePattern = /const \[filterPaymentStatus, setFilterPaymentStatus\] = useState\('all'\);/;
  data = data.replace(statePattern, "const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');\n  const [filterDocType, setFilterDocType] = useState('all');");

  // 2. Add filtering logic
  const filterLogicPattern = /if \(filterPaymentStatus !== 'all' && track\.paymentStatus !== filterPaymentStatus\) return false;/;
  data = data.replace(filterLogicPattern, "if (filterPaymentStatus !== 'all' && track.paymentStatus !== filterPaymentStatus) return false;\n      if (filterDocType !== 'all' && (track.docType || 'Giao') !== filterDocType) return false;");
}

// 3. Add filter UI
const filterUIPattern = /<div className="flex items-center gap-1.5 shrink-0">\s*<label className="text-\[11px\] font-bold text-slate-500 whitespace-nowrap">Thanh toán:<\/label>\s*<CustomSelect\s*value=\{filterPaymentStatus\}\s*onChange=\{e => setFilterPaymentStatus\(e\.target\.value\)\}\s*className="min-w-\[100px\] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"\s*>\s*<option value="all">Tất cả<\/option>\s*\{paymentStatusOptions\.map\(opt => \(\s*<option key=\{opt\} value=\{opt\}>\{opt\}<\/option>\s*\)\)\}\s*<\/CustomSelect>\s*<\/div>/;

if (!data.includes('Phân loại:')) {
  const newFilterUI = `<div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Phân loại:</label>
                <CustomSelect
                  value={filterDocType}
                  onChange={e => setFilterDocType(e.target.value)}
                  className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                >
                  <option value="all">Tất cả</option>
                  <option value="Giao">Giao hồ sơ</option>
                  <option value="Nhận">Nhận hồ sơ</option>
                </CustomSelect>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Thanh toán:</label>
                <CustomSelect
                  value={filterPaymentStatus}
                  onChange={e => setFilterPaymentStatus(e.target.value)}
                  className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                >
                  <option value="all">Tất cả</option>
                  {paymentStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </CustomSelect>
              </div>`;
  data = data.replace(filterUIPattern, newFilterUI);
}

fs.writeFileSync(filePath, data);
console.log('Fixed filters');
