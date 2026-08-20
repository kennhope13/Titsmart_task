const fs = require('fs');
const filepath = 'web-admin/src/services/realtimeStore.ts';
let c = fs.readFileSync(filepath, 'utf-8');

// materialPlans: name -> jobContent
c = c.replace(/created\.name \|\| ''/g, "created.jobContent || ''");
c = c.replace(/updated\.name \|\| id/g, "updated.jobContent || id");
c = c.replace(/plan\?\.name \|\| id/g, "plan?.jobContent || id");

// purchasingPlans (also uses name -> content) - actually they used name, let's fix it manually with regex for specific lines
c = c.replace(/'Thêm mới kế hoạch mua sắm: ' \+ \(created\.jobContent \|\| ''\)/g, "'Thêm mới kế hoạch mua sắm: ' + (created.content || '')");
c = c.replace(/'Cập nhật kế hoạch mua sắm: ' \+ \(updated\.jobContent \|\| id\)/g, "'Cập nhật kế hoạch mua sắm: ' + (updated.content || id)");
c = c.replace(/'Xóa kế hoạch mua sắm: ' \+ \(plan\?\.jobContent \|\| id\)/g, "'Xóa kế hoạch mua sắm: ' + (plan?.content || id)");

// laborPayrolls (also uses name -> content)
c = c.replace(/'Thêm mới bảng lương: ' \+ \(created\.jobContent \|\| ''\)/g, "'Thêm mới bảng lương: ' + (created.content || '')");
c = c.replace(/'Cập nhật bảng lương: ' \+ \(updated\.jobContent \|\| id\)/g, "'Cập nhật bảng lương: ' + (updated.content || id)");
c = c.replace(/'Xóa bảng lương: ' \+ \(pr\?\.jobContent \|\| id\)/g, "'Xóa bảng lương: ' + (pr?.content || id)");

// fieldLogs: remove projectName
c = c.replace(/created\.projectName \|\| created\.projectCode/g, "created.projectCode");
c = c.replace(/log\?\.projectName \|\| log\?\.projectCode \|\| id/g, "log?.projectCode || id");

fs.writeFileSync(filepath, c, 'utf-8');
console.log('Fixed types');
