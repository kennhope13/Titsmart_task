const fs = require("fs");
const newVersion = "1.0.109";
const date = "21/08/2026";
const notes = [
  "Sửa lỗi tràn layout và các cột bị dồn ép (như cột Đáp ứng kỹ thuật).",
  "Cho phép tự động xuống dòng (word-wrap) ở tất cả các cột để tránh bị cắt chữ thành dấu chấm lửng.",
  "Đồng bộ căn giữa các cột Khối lượng (KL) và làm đậm đường viền để dễ nhìn hơn."
];

// Update version.json
const vjPath = "web-admin/public/version.json";
let vj = JSON.parse(fs.readFileSync(vjPath, "utf8"));
vj.version = newVersion;
vj.date = date;
vj.notes = notes;
fs.writeFileSync(vjPath, JSON.stringify(vj, null, 2));

// Update package.json
const pjPath = "web-admin/package.json";
let pj = JSON.parse(fs.readFileSync(pjPath, "utf8"));
pj.version = newVersion;
fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2));

console.log("Updated versions to " + newVersion);

