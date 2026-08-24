const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

const targetStr = `(subTab === 'DOCS' ? cleanDocNotes(plan.notes) : cleanTechNotes(plan.notes))`;

// Find all occurrences
let parts = f.split(targetStr);
if (parts.length > 4) {
    // There are 6 occurrences in total.
    // 0 is definition, but the split uses exact string. So definition doesn't match.
    // So there are 6 matches of targetStr!
    // The first 3 are for the simple cell. The last 3 are for the TECH cell.
    
    // We keep the first 3 (which uses parts[0], parts[1], parts[2], parts[3]) joined by targetStr
    // We replace the last 3 with 'cleanTechNotes(plan.notes)'
    
    // There should be exactly 6 matches, so parts.length === 7.
    let newF = 
        parts[0] + targetStr + 
        parts[1] + targetStr + 
        parts[2] + targetStr + 
        parts[3] + 'cleanTechNotes(plan.notes)' +
        parts[4] + 'cleanTechNotes(plan.notes)' +
        parts[5] + 'cleanTechNotes(plan.notes)' +
        parts[6];
        
    fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', newF, 'utf8');
}
