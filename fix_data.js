const fs = require("fs");
["web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "web-admin/src/pages/cost-plan/PurchasingTab.tsx"].forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  c = c.replace(/plans\.forEach/g, "data.forEach");
  c = c.replace(/\[plans\]/g, "[data]");
  
  // Fix JSX multiple attributes TS17001
  // The error was: JSX elements cannot have multiple attributes with the same name.
  // Because my replace regexes probably added a second className or style!
  c = c.replace(/className="[^"]*"\s*className="([^"]*)"/g, "className=\"$1\"");
  c = c.replace(/style=\{[^}]*\}\s*style=\{([^}]*)\}/g, "style={$1}");

  fs.writeFileSync(f, c);
});
console.log("Done");

