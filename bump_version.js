const fs = require('fs');
const pkgPath = 'web-admin/package.json';
const versionPath = 'web-admin/public/version.json';

// Update package.json
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '1.0.73';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Update version.json
let ver = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
ver.version = '1.0.73';
ver.date = '20/08/2026';
ver.notes = [
  "Cải thiện giao diện UI/UX: Loại bỏ màu nền của các thẻ trạng thái (Vai trò, Dự án, Thanh toán...) tại tab Nhân sự và tab Theo dõi hồ sơ giúp giao diện gọn gàng và dễ nhìn hơn.",
  "Sửa lỗi hiển thị sai định dạng thời gian ở Chi tiết Nhật ký hoạt động: Chuyển đổi định dạng giờ chuẩn sang giờ Việt Nam (VD: 12:11:32 20/08/2026) thay vì mã thời gian thô của hệ thống."
];
fs.writeFileSync(versionPath, JSON.stringify(ver, null, 2) + '\n', 'utf8');

console.log('Bumped version to 1.0.73');
