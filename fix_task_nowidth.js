const fs = require("fs");
let f = "web-admin/src/pages/TaskManagementPage.tsx";
let c = fs.readFileSync(f, "utf8");
c = c.replace(/className="sticky z-20 py-2 px-2 w-full min-w-\[300px\]/g, "className=\"sticky z-20 py-2 px-2 min-w-[300px]");
fs.writeFileSync(f, c);
console.log("Fixed task nowidth");

