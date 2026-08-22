const fs = require("fs");

// Fix index.html drag bar z-index
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/z-index: 9999;/g, "z-index: 30;");
fs.writeFileSync("index.html", html);

// Fix TaskManagementPage.tsx back button z-index
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");
code = code.replace(/z-\[10000\]/g, "z-[35]");
fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);

console.log("Fixed z-indexes");

