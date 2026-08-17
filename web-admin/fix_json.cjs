const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public/version.json');
const content = {
  "version": "1.0.33",
  "date": "17/08/2026",
  "notes": [
    "Gỡ bỏ trang Báo cáo theo cấu trúc mới.",
    "Khóa thanh Sidebar không bị thu gọn khi đang mở bảng thông báo.",
    "Tự động phát hiện phiên bản mới để yêu cầu người dùng cập nhật (F5)."
  ]
};
fs.writeFileSync(file, JSON.stringify(content, null, 2));
console.log('Fixed version.json');
