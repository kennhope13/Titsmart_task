const fs = require('fs');
let c = fs.readFileSync('src/pages/MyTasksPage.tsx', 'utf8');
fs.writeFileSync('src/pages/MyTasksPage.tsx', c, 'utf8');
