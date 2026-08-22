const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");

// Remove leading-tight and let fontStyle define the leading
code = code.replace(
  /border-slate-200 leading-tight transition-colors/g,
  "border-slate-200 transition-colors"
);

// Fix the edit input font size (remove text-[10.5px] and font-bold for everything)
code = code.replace(
  /bg-white text-slate-900 font-bold focus:outline-primary text-\[10\.5px\]/g,
  "bg-white text-slate-900 focus:outline-primary text-[13px] font-medium"
);

fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Fixed fonts part 2");

