const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update colSpanCount
content = content.replace(
  "if (subTab === 'DOCS') return 5;",
  "if (subTab === 'DOCS') return 4;"
);

// 2. Update CHỨNG TỪ HÀNG HÓA header
content = content.replace(
  '<th colSpan={3} style={{ width: 160, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>',
  '<th colSpan={2} style={{ width: 100, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>'
);

// 3. Remove PCCC header
content = content.replace(
  '                  <th style={{ width: 60, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight whitespace-nowrap">PCCC</th>\n',
  ''
);

// 4. Remove PCCC cell
const pcccCellRegex = /[ \t]*\{\/\* KIỂM ĐỊNH PCCC \*\/\}[\s\S]*?<\/td>\n/;
content = content.replace(pcccCellRegex, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Removed PCCC column from DOCS tab');
