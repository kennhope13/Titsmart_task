const fs = require("fs");
let code = fs.readFileSync("src/pages/TaskManagementPage.tsx", "utf8");

// 1. Update onClick
code = code.replace(
  /onClick=\{\(\) => startEditing\(t\.id, \x27notes\x27, t\.notes\)\}/g,
  "onClick={() => startEditing(t.id, \x27notes\x27, cleanNotes(t.notes))}"
);

// 2. Update saveEditing
code = code.replace(
  /let finalValue = tempValue;\s*if \(\s*field === \x27volume\x27\)/g,
  `let finalValue = tempValue;
    if (field === \x27notes\x27) {
      const existingTags = String(task.notes || \x27\x27).match(/(\\[order:[\\d.]+\\]|\\[section\\]|\\[contractor\\]|\\[owner\\])/gi) || [];
      finalValue = [...existingTags, typeof tempValue === \x27string\x27 ? tempValue.trim() : tempValue].filter(Boolean).join(\x27 | \x27);
    } else if (field === \x27volume\x27)`
);

fs.writeFileSync("src/pages/TaskManagementPage.tsx", code);
console.log("Updated TaskManagementPage");

