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

const targetHtml = `<div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Thanh toán:</span>`;
const newHtml = `<div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Phân loại:</span>
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
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Thanh toán:</span>`;

data = data.replace(targetHtml, newHtml);

fs.writeFileSync(filePath, data);
console.log('Fixed filters properly');
