const fs = require('fs');

const pkgPath = 'package.json';
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVer = pkg.version;
const newVer = oldVer.split('.').map((v, i) => i === 2 ? parseInt(v) + 1 : v).join('.');
pkg.version = newVer;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('Bumped package.json to', newVer);

const verPath = 'public/version.json';
let verJson = {
  version: newVer,
  date: new Date().toLocaleDateString('vi-VN'),
  notes: [
    'Cải tiến logic Import Excel: Tự động giữ nguyên định dạng và số thứ tự (STT) gốc.',
    'Nâng cấp trường Người phụ trách / Nguồn quỹ: Cho phép nhập tay trực tiếp hoặc chọn tên có sẵn.',
    'Sửa lỗi hiển thị thiếu mũi tên (dropdown) trong form Quản lý chi phí.'
  ]
};
fs.writeFileSync(verPath, JSON.stringify(verJson, null, 2));
console.log('Updated version.json to', newVer);
