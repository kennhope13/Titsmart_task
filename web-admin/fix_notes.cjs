const fs = require("fs");
let code = fs.readFileSync("src/pages/cost-plan/PurchasingTab.tsx", "utf8");

// Fix saveEditing
code = code.replace(
  /let finalValue = tempValue;\s*if \(\s*field === \x27volumeContract\x27 \|\|/g,
  `let finalValue = tempValue;
    if (field === \x27notes\x27) {
      const existingTags = String(pur.notes || \x27\x27).match(/(\\[order:[\\d.]+\\]|\\[section\\]|\\[contractor\\]|\\[owner\\])/gi) || [];
      finalValue = [...existingTags, typeof tempValue === \x27string\x27 ? tempValue.trim() : tempValue].filter(Boolean).join(\x27 | \x27);
    } else if (
      field === \x27volumeContract\x27 ||`
);

fs.writeFileSync("src/pages/cost-plan/PurchasingTab.tsx", code);
console.log("Updated saveEditing");

