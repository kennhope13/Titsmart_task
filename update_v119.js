const fs = require("fs");
const newVersion = "1.0.119";
const date = "22/08/2026";
const notes = [
  "Tối ưu kích thước nút quay lại ở màn hình Quản lý tiến độ to hơn, dễ bấm hơn.",
  "Tăng cỡ chữ cột nội dung công việc và căn lề rộng hơn cho dễ đọc.",
  "Fix lỗi không click được nửa trên của nút do vùng kéo thả cửa sổ đè lên.",
  "Ẩn hoàn toàn các thẻ thông tin hệ thống (Ghi chú hệ thống) khi sửa Ghi chú trong tab Theo dõi chứng từ.",
  "Fix lỗi chữ ci hiển thị nhầm ở ô nhập liệu Đơn vị tính."
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

