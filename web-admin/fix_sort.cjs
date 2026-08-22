const fs = require("fs");
let code = fs.readFileSync("src/pages/MaterialTrackingPage.tsx", "utf8");

code = code.replace(
  /const imports = inventoryTransactions\.filter\(tx => tx\.type === .IMPORT.\);/g,
  "const imports = inventoryTransactions.filter(tx => tx.type === \"IMPORT\").sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());"
);

code = code.replace(
  /const exports = inventoryTransactions\.filter\(tx => tx\.type === .EXPORT.\);/g,
  "const exports = inventoryTransactions.filter(tx => tx.type === \"EXPORT\").sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());"
);

fs.writeFileSync("src/pages/MaterialTrackingPage.tsx", code);
console.log("Fixed sorting");

