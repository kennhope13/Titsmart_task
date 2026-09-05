const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');
code = code.replace(
  'multiple={editingIndex === null}',
  'multiple={true}'
);
fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
console.log("Success");
