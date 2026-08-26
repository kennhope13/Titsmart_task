const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/accounting.controller.ts', 'utf8');

code = code.replace(
  /const \{ projectCode, jobContent, contractVolume, orderedVolume, expectedDate, dispatchDate, docCO, docCQ, docCo, docCq, docFireInspection, dispatchToSite, \.\.\.data \} = req\.body;/g,
  'const { projectCode, jobContent, contractVolume, orderedVolume, expectedDate, dispatchDate, docCO, docCQ, docCo, docCq, docStamp, docFireInspection, dispatchToSite, ...data } = req.body;'
);

fs.writeFileSync('backend/src/controllers/accounting.controller.ts', code);
console.log('Fixed backend destructuring');
