const fs = require("fs");
const newVersion = "1.0.113";
const date = "21/08/2026";
const notes = [
  "Đồng bộ phong cách màu sắc (nhạt, viền mỏng) cho menu thả xuống của cột XỬ LÝ giống y hệt cột MUA HÀNG và THI CÔNG."
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

