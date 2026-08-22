const fs = require("fs");
const newVersion = "1.0.122";
const date = "22/08/2026";
const notes = [
  "Sắp xếp danh sách nhập/xuất kho: mới nhất hiện lên trên cùng."
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

