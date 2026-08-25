const fs = require('fs');
let f = fs.readFileSync('web-admin/src/components/layout/Sidebar.tsx', 'utf8');

// The current ones in the file might be the updated ones or old ones, so we replace by label to be safe.
f = f.replace(/\{ label: 'Tiến độ Công việc', path: `\/projects\/\$\{currentProject\.id\}\/tasks`, icon: '[^']+' \}/g, "{ label: 'Tiến độ Công việc', path: `/projects/${currentProject.id}/tasks`, icon: 'fact_check' }");
f = f.replace(/\{ label: 'Nhật ký Hiện trường', path: `\/projects\/\$\{currentProject\.id\}\/field-logs`, icon: '[^']+' \}/g, "{ label: 'Nhật ký Hiện trường', path: `/projects/${currentProject.id}/field-logs`, icon: 'add_a_photo' }");
f = f.replace(/\{ label: 'Vật tư & Chi phí', path: `\/projects\/\$\{currentProject\.id\}\/cost-plan`, icon: '[^']+' \}/g, "{ label: 'Vật tư & Chi phí', path: `/projects/${currentProject.id}/cost-plan`, icon: 'account_balance_wallet' }");
f = f.replace(/\{ label: 'Kho Dự án', path: `\/projects\/\$\{currentProject\.id\}\/inventory`, icon: '[^']+' \}/g, "{ label: 'Kho Dự án', path: `/projects/${currentProject.id}/inventory`, icon: 'inventory_2' }");
f = f.replace(/\{ label: 'Theo dõi Hồ sơ', path: `\/projects\/\$\{currentProject\.id\}\/documents`, icon: '[^']+' \}/g, "{ label: 'Theo dõi Hồ sơ', path: `/projects/${currentProject.id}/documents`, icon: 'file_present' }");

fs.writeFileSync('web-admin/src/components/layout/Sidebar.tsx', f);
console.log('All 5 icons replaced');
