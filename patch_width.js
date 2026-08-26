const fs = require('fs');
const file = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace('placeholder="Tìm kiếm nội dung, ĐVT, ghi chú..."', 'placeholder="Tìm kiếm..."');
data = data.replace('w-48 sm:w-64', 'w-32 sm:w-40');
data = data.replace(/min-w-\\[70px\\] max-w-\\[100px\\]/g, 'min-w-[50px] max-w-[80px]');
data = data.replace(/min-w-\\[70px\\] max-w-\\[110px\\]/g, 'min-w-[50px] max-w-[90px]');
data = data.replace(/gap-2 flex-wrap/g, 'gap-1.5 flex-wrap'); // reduce gap between filters
data = data.replace(/gap-2/g, 'gap-1.5'); // reduce gap inside filter items

fs.writeFileSync(file, data);
console.log('Replaced');
