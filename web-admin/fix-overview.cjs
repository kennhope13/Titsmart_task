const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectOverviewTab.tsx', 'utf-8');

// Fix task status
content = content.replace(
  "t.status === 'Hoàn thành' || t.status === 'Đã hoàn thành'",
  "t.status === 'Hoàn thành'"
);

// Fix materials
content = content.replace(
  /const totalMatEstimate = projMaterials\.reduce\(\(sum, m\) => sum \+ \(\(m\.volume \|\| 0\) \* \(m\.unitPrice \|\| 0\)\), 0\);/,
  "const totalMatEstimate = projMaterials.reduce((sum, m) => sum + (m.contractVolume || 0), 0);"
);
content = content.replace(
  /const totalMatActual = projMaterials\.reduce\(\(sum, m\) => sum \+ \(\(m\.actualVolume \|\| 0\) \* \(m\.unitPrice \|\| 0\)\), 0\);/,
  "const totalMatActual = projMaterials.reduce((sum, m) => sum + (m.orderedVolume || 0), 0);"
);

// Format currency -> format number for materials
content = content.replace(
  /formatCurrency\(totalMatActual\)/g,
  "totalMatActual.toLocaleString('vi-VN')"
);
content = content.replace(
  /formatCurrency\(totalMatEstimate\)/g,
  "totalMatEstimate.toLocaleString('vi-VN')"
);

fs.writeFileSync('src/pages/ProjectOverviewTab.tsx', content, 'utf-8');
