const fs = require("fs");
const newVersion = "1.0.116";
const date = "21/08/2026";
const notes = [
  "Xóa bỏ cột XONG, mở rộng cột XỬ LÝ hiển thị đầy đủ.",
  "Đồng bộ màu sắc pastel cho dropdown XỬ LÝ giống MUA HÀNG và THI CÔNG.",
  "Khắc phục dữ liệu tab Mua hàng dự án Phước Tân - phân loại đúng Nhà thầu/Chủ đầu tư.",
  "Tự động đồng bộ khi thay đổi Phạm vi cung cấp cho các dự án mới."
];

const vjPath = "web-admin/public/version.json";
let vj = JSON.parse(fs.readFileSync(vjPath, "utf8"));
vj.version = newVersion;
vj.date = date;
vj.notes = notes;
fs.writeFileSync(vjPath, JSON.stringify(vj, null, 2));

const pjPath = "web-admin/package.json";
let pj = JSON.parse(fs.readFileSync(pjPath, "utf8"));
pj.version = newVersion;
fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2));
console.log("Updated to " + newVersion);

