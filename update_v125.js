const fs = require("fs");
const newVersion = "1.0.125";
const date = "22/08/2026";
const notes = [
  "Gộp tab Kế hoạch vật tư và Mua hàng thành một tab Vật tư & Mua hàng duy nhất gồm 5 Góc nhìn tiện lợi.",
  "Đồng bộ hóa chỉnh sửa trực tiếp (inline edit) và Xuất Excel tổng hợp."
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

