const fs = require("fs");
let code = fs.readFileSync("src/pages/MaterialTrackingPage.tsx", "utf8");

code = code.replace(
  /<td className="p-3\.5 font-bold text-slate-900">\{tx\.date\}<\/td>/g,
  `<td className="p-3.5 font-bold text-slate-900">{tx.date ? new Date(tx.date).toLocaleDateString("vi-VN") : "-"}</td>`
);

fs.writeFileSync("src/pages/MaterialTrackingPage.tsx", code);
console.log("Fixed date rendering");

