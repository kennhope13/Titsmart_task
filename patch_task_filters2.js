const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Simple targeted replacements for the option labels
content = content.replace(
  '<option value="all">Dau muc cha: Tat ca</option>',
  '<option value="all">Tất cả</option>'
);
content = content.replace(
  '<option value="all">ĐVT: Tất cả</option>',
  '<option value="all">Tất cả</option>'
);
content = content.replace(
  '<option value="all">Tien do: Tat ca</option>',
  '<option value="all">Tất cả</option>'
);
content = content.replace(
  '<option value="all">Thi cong: Tat ca</option>',
  '<option value="all">Tất cả</option>'
);

// Now wrap each CustomSelect with a label div
// 1. filterSection
content = content.replace(
  /(\s+)<CustomSelect\r?\n(\s+)value=\{filterSection\}/,
  '$1<div className="flex items-center gap-1">\n$1  <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Đầu mục cha:</span>\n$1  <CustomSelect\n$2value={filterSection}'
);
content = content.replace(
  /(<\/CustomSelect>)\r?\n\r?\n(\s+)<CustomSelect\r?\n(\s+)value=\{filterUnit\}/,
  '$1\n            </div>\n\n$2<div className="flex items-center gap-1">\n$2  <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">ĐVT:</span>\n$2  <CustomSelect\n$3value={filterUnit}'
);
content = content.replace(
  /(<\/CustomSelect>)\r?\n\r?\n(\s+)<CustomSelect\r?\n(\s+)value=\{filterProgress\}/,
  '$1\n            </div>\n\n$2<div className="flex items-center gap-1">\n$2  <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Tiến độ:</span>\n$2  <CustomSelect\n$3value={filterProgress}'
);
content = content.replace(
  /(<\/CustomSelect>)\r?\n\r?\n(\s+)<CustomSelect\r?\n(\s+)value=\{filterPurchase\}/,
  '$1\n            </div>\n\n$2<div className="flex items-center gap-1">\n$2  <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Mua hàng:</span>\n$2  <CustomSelect\n$3value={filterPurchase}'
);
content = content.replace(
  /(<\/CustomSelect>)\r?\n\r?\n(\s+)<CustomSelect\r?\n(\s+)value=\{filterConstr\}/,
  '$1\n            </div>\n\n$2<div className="flex items-center gap-1">\n$2  <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Thi công:</span>\n$2  <CustomSelect\n$3value={filterConstr}'
);
// Close the last filter div
content = content.replace(
  /(<\/CustomSelect>)\r?\n(\s+)<\/div>\r?\n(\s+)<div className="flex items-center gap-2 w-full/,
  '$1\n            </div>\n$2</div>\n$3<div className="flex items-center gap-2 w-full'
);

// Also change the max-w on filterSection
content = content.replace(
  'className="h-8 w-44 rounded-md border',
  'className="h-8 min-w-[100px] max-w-[160px] rounded-md border'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done patching TaskManagementPage.tsx');
