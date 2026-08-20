const fs = require('fs');
const filepath = 'web-admin/src/services/realtimeStore.ts';
let c = fs.readFileSync(filepath, 'utf-8');
c = c.replace(/\\'/g, "'");
fs.writeFileSync(filepath, c, 'utf-8');
console.log('Fixed');
