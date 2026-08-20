const fs = require('fs');
let c = fs.readFileSync('src/services/realtimeStore.ts', 'utf-8');
c = c.replace(/const newNotif = \{/, 'const newNotif: NotificationItem = {');
c = c.replace(/const theirRank = roleRank\[doerRole\] \|\| 1;/, "const theirRank = roleRank[doerRole || 'engineer'] || 1;");
fs.writeFileSync('src/services/realtimeStore.ts', c);
