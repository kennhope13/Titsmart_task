const fs = require("fs");
const newVersion = "1.0.110";
const date = "21/08/2026";
const notes = [
  "Mở rộng tối đa cột NỘI DUNG ở tab Quản lý tiến độ để lấp đầy khoảng trống bên phải."
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

