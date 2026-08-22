const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");

code = code.replace(
  /let fontStyle = \x27font-bold text-slate-900\x27;[\s\S]*?if \(t\.issue\) \{/g,
  `let fontStyle = "font-bold text-slate-900 text-[13px]";
                  let sttStyle = "font-bold text-slate-400 text-xs";
                  
                  if (depth === 1) {
                    rowBg = "bg-slate-50";
                    stickyBg = "bg-slate-50";
                    fontStyle = "font-bold text-slate-900 text-sm";
                    sttStyle = "font-bold text-slate-600 text-xs";
                  } else if (depth === 2) {
                    fontStyle = "font-semibold text-slate-700 text-[13px]";
                    sttStyle = "font-semibold text-slate-400 text-[11px]";
                  } else if (depth >= 3) {
                    fontStyle = "font-medium text-slate-800 text-[13px] leading-relaxed";
                    sttStyle = "font-medium text-slate-400 text-[11px]";
                  }
                  
                  if (t.issue) {`
);

fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Fixed fonts");

