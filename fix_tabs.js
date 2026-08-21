const fs = require("fs");

function fixFile(file, listVar) {
  let c = fs.readFileSync(file, "utf8");
  
  if (c.includes("maxSttWidth")) return; // already fixed
  
  // 1. Insert maxSttWidth calculation
  c = c.replace(`return (`, 
`  const maxSttWidth = React.useMemo(() => {
    let maxLen = 3;
    ${listVar}.forEach(t => {
      const len = String(t.stt || "").length;
      if (len > maxLen) maxLen = len;
    });
    return Math.max(50, maxLen * 7.5 + 16);
  }, [${listVar}]);

  return (`);

  // 2. Add style to table
  c = c.replace(/<table className="([^"]*)">/g, "<table className=\"$1\" style={{ \"--stt-width\": \`${maxSttWidth}px\` } as React.CSSProperties}>");

  // 3. For STT th (allow it to grow but min 50)
  c = c.replace(/style=\{\{ minWidth: 50, width: "auto"([^}]*)\}\}/g, "style={{ minWidth: 50, width: \"var(--stt-width)\"$1 }}");
  c = c.replace(/style=\{\{ minWidth: 32, width: "auto"([^}]*)\}\}/g, "style={{ minWidth: 32, width: \"var(--stt-width)\"$1 }}"); // for purchasing

  // 4. Restore sticky to NOIDUNG th and use var(--stt-width)
  c = c.replace(/className="z-20([^"]*)"/g, "className=\"sticky z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]$1\" style={{ left: \"var(--stt-width)\" }}");
  
  // 5. Restore sticky to NOIDUNG td and use var(--stt-width)
  c = c.replace(/<td colSpan=\{colSpanCount\} className="bg-blue-50\/90([^"]*)"/g, "<td colSpan={colSpanCount} className=\"sticky z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-blue-50/90$1\" style={{ left: \"var(--stt-width)\" }}");
  
  // Material plan regular td
  c = c.replace(/<td className=\{`z-10 \$\{stickyBg\} group-hover:bg-slate-100([^>]*)`\}/g, "<td className={`sticky z-10 ${stickyBg} group-hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]$1`} style={{ left: \"var(--stt-width)\" }}");
  c = c.replace(/<td className=\{`\$\{stickyBg\} group-hover:bg-slate-100([^>]*)`\}/g, "<td className={`sticky z-10 ${stickyBg} group-hover:bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]$1`} style={{ left: \"var(--stt-width)\" }}");

  fs.writeFileSync(file, c);
}

fixFile("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "materialPlans");
fixFile("web-admin/src/pages/cost-plan/PurchasingTab.tsx", "purchasingPlans");
console.log("Fixed other tabs");

