const fs = require("fs");
let code = fs.readFileSync("src/pages/MaterialTrackingPage.tsx", "utf8");

code = code.replace(
  /<CustomSelect required value=\{txMaterialId\} onChange=\{\(e\) => setTxMaterialId\(e.target.value\)\} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">/g,
  `<CustomSelect required searchable value={txMaterialId} onChange={(e) => setTxMaterialId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">`
);

fs.writeFileSync("src/pages/MaterialTrackingPage.tsx", code);
console.log("Enabled searchable in MaterialTrackingPage");

