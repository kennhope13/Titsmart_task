const fs = require("fs");
const newVersion = "1.0.114";
const date = "21/08/2026";
const notes = [
  "Xóa bỏ cột XONG để tăng diện tích hiển thị cho cột XỬ LÝ."
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

