const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

f = f.replace(
  /\{subTab !== 'TECH' && subTab !== 'DOCS' \? \(/g,
  "{subTab !== 'TECH' ? ("
);

f = f.replace(
  /cleanNotes\(plan\.notes\)/g,
  "(subTab === 'DOCS' ? cleanDocNotes(plan.notes) : cleanTechNotes(plan.notes))"
);

// We should fix the purchasing sub-row note as well, if it uses cleanNotes
// But wait, the previous replace /cleanNotes\(plan\.notes\)/g will catch ALL occurrences in the file!
// Let's see if that's safe.
// There are only a few: 
// - The simple cell div onClick
// - The simple cell div title
// - The simple cell span child
// - The purchasing sub-row div onClick
// - The purchasing sub-row div title
// - The purchasing sub-row div child
// - The TECH cell div onClick (Wait! I already replaced this with cleanTechNotes!)
// If I already replaced it with cleanTechNotes, it won't match `cleanNotes` anymore.
// This is perfect.

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
