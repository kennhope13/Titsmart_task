const fs = require('fs');

let f = fs.readFileSync('web-admin/src/components/layout/Sidebar.tsx', 'utf8');

f = f.replace(/icon: 'dashboard'/g, "icon: 'analytics'");
// only replace the 'domain' used for 'Tất cả dự án'
f = f.replace(/icon: 'domain'/g, "icon: 'electric_bolt'"); 

fs.writeFileSync('web-admin/src/components/layout/Sidebar.tsx', f);
console.log('Icons updated');
