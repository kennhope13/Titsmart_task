import re

with open('src/services/realtimeStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix addTasksBatch
pattern_tasks = r"const nextNotifs: NotificationItem\[\] = \[\s*\{\s*id: 'notif-' \+ Date\.now\(\),[\s\S]*?\.\.\.state\.notifications,\s*\];\s*persistAndNotify\(\{ tasks: nextTasks, projects: nextProjects, notifications: nextNotifs \}\);\s*return \{ tasks: nextTasks, projects: nextProjects, notifications: nextNotifs \};"
replacement_tasks = "persistAndNotify({ tasks: nextTasks, projects: nextProjects });\n            return { tasks: nextTasks, projects: nextProjects };"
content = re.sub(pattern_tasks, replacement_tasks, content)

# Fix assignEngineer
pattern_assign = r"const newNotif: NotificationItem = \{\s*id: 'notif-assign-' \+ Date\.now\(\),[\s\S]*?icon: 'person_add',\s*\};\s*const nextNotifs = \[newNotif, \.\.\.state\.notifications\];\s*persistAndNotify\(\{ tasks: nextTasks, notifications: nextNotifs \}\);\s*return \{ tasks: nextTasks, notifications: nextNotifs \};\s*\}\);"
replacement_assign = "persistAndNotify({ tasks: nextTasks });\n            return { tasks: nextTasks };\n          });\n          get().logActivity(`Phân công: Giao hạng mục \"${updatedTask.name}\" cho ${engineerName}`, updatedTask.projectName || updatedTask.projectCode);"
content = re.sub(pattern_assign, replacement_assign, content)

with open('src/services/realtimeStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)
