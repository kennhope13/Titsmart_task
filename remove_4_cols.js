const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Headers
content = content.replace(
  '              <th rowSpan={2} style={{ width: 65, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">ĐVT</th>\n',
  ''
);
content = content.replace(
  '              <th rowSpan={2} style={{ width: 50, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">KL HĐ</th>\n',
  ''
);
content = content.replace(
  '              <th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">MÃ HIỆU</th>\n',
  ''
);
content = content.replace(
  '              <th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">XUẤT XỨ</th>\n',
  ''
);

// 2. Remove Tbody cells
const tbodyRegex = /[ \t]*\{\/\* ĐVT \*\/\}[\s\S]*?(?:[ \t]*\{\/\* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB \*\/})/g;
content = content.replace(tbodyRegex, '                          {/* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB */}');

// 3. Update colspans
content = content.replace(
  '<td colSpan={colSpanCount + 6}',
  '<td colSpan={colSpanCount + 2}'
);

content = content.replace(
  '<td colSpan={colSpanCount + 5}',
  '<td colSpan={colSpanCount + 1}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Removed 4 columns completely from MaterialAndPurchasingTab.tsx');
