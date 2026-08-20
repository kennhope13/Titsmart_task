const fs = require('fs');
const path = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update useRealtimeStore destructuring
content = content.replace(/const \{ activityLogs \} = useRealtimeStore\(\);/, `const { activityLogs, projects } = useRealtimeStore();

  const getProjectName = (projCodeOrName: string) => {
    if (!projCodeOrName) return projCodeOrName;
    const proj = projects.find(p => p.code === projCodeOrName || p.name === projCodeOrName);
    return proj ? proj.name : projCodeOrName;
  };`);

// Replace log.project with getProjectName(log.project) in rendering
content = content.replace(/\{log\.project\}/g, '{getProjectName(log.project)}');
// Note: It's important to keep `{log.project === 'COMPANY'...` logic intact. Wait, if I blindly replace, `{log.project === 'COMPANY'}` becomes `{getProjectName(log.project) === 'COMPANY'}`. That's fine because COMPANY won't be in `projects`. 
// Wait, the regex `\{log\.project\}` will replace all. Let me just replace the exact tags.
content = content.replace(/<span className="material-symbols-outlined text-\[13px\]">business_center<\/span>\s*\{getProjectName\(log\.project\)\}/g, '<span className="material-symbols-outlined text-[13px]">business_center</span>\n                                      {getProjectName(log.project)}');

// Actually wait, let's just do it cleanly
// Reset content and use precise replacement
content = fs.readFileSync(path, 'utf8');
content = content.replace(/const \{ activityLogs \} = useRealtimeStore\(\);/, `const { activityLogs, projects } = useRealtimeStore();

  const getProjectName = (projCodeOrName: string) => {
    if (!projCodeOrName) return projCodeOrName;
    const proj = projects.find(p => p.code === projCodeOrName || p.name === projCodeOrName);
    return proj ? proj.name : projCodeOrName;
  };`);

content = content.replace(/\{log\.project\}/g, '{getProjectName(log.project || "")}');
content = content.replace(/\{selectedLog\.project\}/g, '{getProjectName(selectedLog.project || "")}');

// Restore the condition log.project === 'COMPANY'
content = content.replace(/getProjectName\(log\.project \|\| ""\) === 'COMPANY'/g, "log.project === 'COMPANY'");
content = content.replace(/getProjectName\(selectedLog\.project \|\| ""\) === 'COMPANY'/g, "selectedLog.project === 'COMPANY'");
// Restore log.project === 'Hệ thống'
content = content.replace(/getProjectName\(log\.project \|\| ""\) === 'Hệ thống'/g, "log.project === 'Hệ thống'");
content = content.replace(/getProjectName\(selectedLog\.project \|\| ""\) === 'Hệ thống'/g, "selectedLog.project === 'Hệ thống'");
// Restore !log.project
content = content.replace(/!getProjectName\(log\.project \|\| ""\)/g, "!log.project");
content = content.replace(/!getProjectName\(selectedLog\.project \|\| ""\)/g, "!selectedLog.project");
// Restore (log.project || '')
content = content.replace(/\(getProjectName\(log\.project \|\| ""\) \|\| ''\)/g, "(log.project || '')");

// And for those weird character encodings
content = content.replace(/getProjectName\(log\.project \|\| ""\) === 'H.*? th.*?ng'/g, "log.project === 'Hệ thống'");
content = content.replace(/getProjectName\(selectedLog\.project \|\| ""\) === 'H.*? th.*?ng'/g, "selectedLog.project === 'Hệ thống'");

fs.writeFileSync(path, content, 'utf8');
console.log('Patched Project Name resolving');
