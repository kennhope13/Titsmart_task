const fs = require("fs");
const newVersion = "1.0.115";
const date = "21/08/2026";
const notes = [
  "Tự động đồng bộ thêm/xóa hạng mục sang tab Mua Hàng và Theo dõi khi người dùng tự check chọn Phạm vi cung cấp (Nhà thầu/Chủ đầu tư) ở Modal Sửa hạng mục."
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

