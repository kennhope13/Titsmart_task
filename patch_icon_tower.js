const fs = require('fs');
let f = fs.readFileSync('web-admin/src/components/layout/Sidebar.tsx', 'utf8');
f = f.replace(/icon: 'electric_bolt'/g, "icon: 'cell_tower'"); 
fs.writeFileSync('web-admin/src/components/layout/Sidebar.tsx', f);
console.log('Icon updated to cell_tower');
