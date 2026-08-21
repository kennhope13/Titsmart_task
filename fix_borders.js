const fs = require("fs");
const files = [
  "web-admin/src/pages/TaskManagementPage.tsx",
  "web-admin/src/pages/cost-plan/MaterialPlanTab.tsx",
  "web-admin/src/pages/cost-plan/PurchasingTab.tsx"
];

files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  // Find all <td className="something"> and add border-r border-slate-100
  // Note: some already have border-r or border-l or border-slate-100.
  // We can just add border-r border-slate-200 to be safe and match the header, or border-slate-100.
  // Let us match border-slate-100 for tbody.
  
  // In MaterialPlanTab and PurchasingTab, NỘI DUNG is sticky so it has border-r border-slate-100.
  // We just need to add border-r border-slate-100 to any td that does not have border-r.
  
  const regex = /<td\s+className="([^"]*)"/g;
  c = c.replace(regex, (match, classNames) => {
    // If it has border-r, skip
    if (classNames.includes("border-r") || classNames.includes("border-x")) {
      return match;
    }
    // Don"t add to right-most sticky cols which have border-l
    if (classNames.includes("right-0") || classNames.includes("border-l")) {
      return match;
    }
    // Add border-r border-slate-100
    return `<td className="${classNames} border-r border-slate-100"`;
  });
  
  // Same for className={`...`}
  const regexTemplate = /<td\s+className=\{`([^`]*)`\}/g;
  c = c.replace(regexTemplate, (match, classNames) => {
    if (classNames.includes("border-r") || classNames.includes("border-x") || classNames.includes("right-0") || classNames.includes("border-l")) {
      return match;
    }
    return `<td className={\`${classNames} border-r border-slate-100\`}`;
  });

  fs.writeFileSync(f, c);
  console.log("Fixed borders in", f);
});

