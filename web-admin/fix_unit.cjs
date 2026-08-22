const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");
code = code.replace(/const \[unit, setUnit\] = useState\(\x27ci\x27\);/g, "const [unit, setUnit] = useState(\x27\x27);");
fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Fixed unit initial state");

