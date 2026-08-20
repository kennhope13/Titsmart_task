const fs = require('fs');
let c = fs.readFileSync('src/services/realtimeStore.ts', 'utf-8');

c = c.replace(
  /const nextNotifs: NotificationItem\[\] = \[\s*\{\s*id: 'notif-' \+ Date\.now\(\),[\s\S]*?\.\.\.state\.notifications,\s*\];\s*persistAndNotify\(\{ tasks: nextTasks, projects: nextProjects, notifications: nextNotifs \}\);\s*return \{ tasks: nextTasks, projects: nextProjects, notifications: nextNotifs \};/m,
  "persistAndNotify({ tasks: nextTasks, projects: nextProjects });\n            return { tasks: nextTasks, projects: nextProjects };"
);

c = c.replace(
  /const newNotif: NotificationItem = \{\s*id: 'notif-assign-' \+ Date\.now\(\),[\s\S]*?icon: 'person_add',\s*\};\s*const nextNotifs = \[newNotif, \.\.\.state\.notifications\];\s*persistAndNotify\(\{ tasks: nextTasks, notifications: nextNotifs \}\);\s*return \{ tasks: nextTasks, notifications: nextNotifs \};\s*\}\);/m,
  "persistAndNotify({ tasks: nextTasks });\n            return { tasks: nextTasks };\n          });\n          get().logActivity(`Phân công: Giao hạng mục \"${'$'}{updatedTask.name}\" cho ${'$'}{engineerName}`, updatedTask.projectName || updatedTask.projectCode);"
);

fs.writeFileSync('src/services/realtimeStore.ts', c);
