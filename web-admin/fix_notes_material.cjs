const fs = require("fs");
let code = fs.readFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", "utf8");

// 1. startEditing(plan.id, "notes", plan.notes) -> cleanNotes(plan.notes)
code = code.replace(
  /onClick=\{\(\) => startEditing\(plan\.id, \x27notes\x27, plan\.notes\)\}/g,
  "onClick={() => startEditing(plan.id, \x27notes\x27, cleanNotes(plan.notes))}"
);

// 2. saveEditing
code = code.replace(
  /let finalValue = tempValue;\s*if \(\s*field === \x27contractVolume\x27 \|\|/g,
  `let finalValue = tempValue;
    if (field === \x27notes\x27) {
      const existingTags = String(plan.notes || \x27\x27).match(/(\\[order:[\\d.]+\\]|\\[section\\]|\\[contractor\\]|\\[owner\\])/gi) || [];
      finalValue = [...existingTags, typeof tempValue === \x27string\x27 ? tempValue.trim() : tempValue].filter(Boolean).join(\x27 | \x27);
    } else if (
      field === \x27contractVolume\x27 ||`
);

fs.writeFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", code);
console.log("Updated MaterialPlanTab");

