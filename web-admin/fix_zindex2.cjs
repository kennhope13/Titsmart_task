const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");

code = code.replace(
  /style=\{\{ WebkitAppRegion: "no-drag" \}\}/g,
  `style={{ WebkitAppRegion: "no-drag" } as any}`
);

fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Fixed TS error");

