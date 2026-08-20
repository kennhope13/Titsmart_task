const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /<option key=\{opt\.id\} value=\{opt\.id\}>\{opt\.id === 'all' \? 'Dau muc cha: Tat ca' : opt\.label\}<\/option>/g,
  "<option key={opt.id} value={opt.id}>{opt.id === 'all' ? 'Đầu mục cha: Tất cả' : `Đầu mục cha: ${opt.label}`}</option>"
);

content = content.replace(
  /<option key=\{opt\} value=\{opt\}>\{opt === 'all' \? 'ĐVT: Tất cả' : opt\}<\/option>/g,
  "<option key={opt} value={opt}>{opt === 'all' ? 'ĐVT: Tất cả' : `ĐVT: ${opt}`}</option>"
);

content = content.replace(
  /<option key=\{opt\} value=\{opt\}>\{opt === 'all' \? 'Tien do: Tat ca' : opt\}<\/option>/g,
  "<option key={opt} value={opt}>{opt === 'all' ? 'Tiến độ: Tất cả' : `Tiến độ: ${opt}`}</option>"
);

content = content.replace(
  /<option key=\{opt\} value=\{opt\}>\{opt === 'all' \? 'Mua hang: Tat ca' : opt\}<\/option>/g,
  "<option key={opt} value={opt}>{opt === 'all' ? 'Mua hàng: Tất cả' : `Mua hàng: ${opt}`}</option>"
);

content = content.replace(
  /<option key=\{opt\} value=\{opt\}>\{opt === 'all' \? 'Thi cong: Tat ca' : opt\}<\/option>/g,
  "<option key={opt} value={opt}>{opt === 'all' ? 'Thi công: Tất cả' : `Thi công: ${opt}`}</option>"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched select prefixes');
