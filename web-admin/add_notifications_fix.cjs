const fs = require('fs');
const filepath = 'src/services/realtimeStore.ts';
let content = fs.readFileSync(filepath, 'utf-8');

// fix TS2538 and TS2322
content = content.replace(
  /const myRank = roleRank\[currentUser\.role\] \|\| 1;/g,
  "const myRank = roleRank[currentUser.role || 'engineer'] || 1;"
);
content = content.replace(
  /type: 'system',/g,
  "type: 'system' as const,"
);

fs.writeFileSync(filepath, content, 'utf-8');
console.log('Fixed types in realtimeStore.ts');
