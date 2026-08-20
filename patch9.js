const fs = require('fs');
let content = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');

// Replace standard normalization to also include đ replacement
content = content.replace(
  /toLowerCase\(\)\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g,\s*''\)/g,
  "toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/\\u0111/g, 'd')"
);

fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', content, 'utf8');
console.log('Patched normalization via regex!');
