const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Remove the header "LUÂN CHUYỂN VẬT TƯ"
f = f.replace(
  /<th colSpan=\{2\} style=\{\{ width: 130, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' \}\} className="bg-slate-50 bg-clip-padding px-1\.5 py-1\.5 text-center leading-tight">LUÂN CHUYỂN VẬT TƯ<\/th>/g,
  ""
);

// 2. Remove the sub-headers "GỬI CT" and "NGÀY"
const subHeaderTarget = `              {subTab === 'DOCS' && (
                <>
                  <th style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight whitespace-nowrap">GỬI CT</th>
                  <th style={{ width: 65, borderRight: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight whitespace-nowrap">NGÀY</th>
                </>
              )}`;
f = f.replace(subHeaderTarget, "");

// 3. Remove the body cells for "GỬI CT" and "NGÀY"
const bodyTargetRegex = /\{\/\* GỬI CT \*\/\}.*?\{\/\* NGÀY \*\/\}.*?<\/td>/s;
// The above regex will capture from {/* GỬI CT */} down to the closing </td> of NGÀY.
// Let's refine it.
f = f.replace(/\{\/\* GỬI CT \*\/\}.*?\{\/\* NGÀY \*\/\}.*?<\/td>\s*(?=\{\/\* GHI CHÚ COMBINED \*\/\})/s, "");

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
