const fs = require('fs');
let s = fs.readFileSync('src/services/realtimeStore.ts', 'utf8');
s = s.replace('addTasksBatch: (tasks: Omit<Task, \'id\'>[]) => void;', 'addTasksBatch: (tasks: Omit<Task, \'id\'>[]) => Promise<void>;');
s = s.replace('addProject: (proj: Omit<Project, \'id\'>) => void;', 'addProject: (proj: Omit<Project, \'id\'>) => Promise<Project | undefined>;');
s = s.replace(`        set((state) => {
          const nextProjs = [createdProj, ...state.projects];
          persistAndNotify({ projects: nextProjs });
          return { projects: nextProjs };
        });
      } catch (e) {`, `        set((state) => {
          const nextProjs = [createdProj, ...state.projects];
          persistAndNotify({ projects: nextProjs });
          return { projects: nextProjs };
        });
        return createdProj;
      } catch (e) {`);
fs.writeFileSync('src/services/realtimeStore.ts', s, 'utf8');

s = fs.readFileSync('src/pages/ProjectManagementPage.tsx', 'utf8');
s = s.replace('  const handleCreateProject = (event: React.FormEvent) => {', '  const handleCreateProject = async (event: React.FormEvent) => {');
s = s.replace('    addProject(newProject);', '    const createdProject = await addProject(newProject);\n    if (!createdProject) {\n      triggerToast(\'Không tạo được dự án, nên chưa import đầu mục công việc.\', \'warning\');\n      return;\n    }');
s = s.replace('      if (importedTasks.length > 0) addTasksBatch(importedTasks);', '      if (importedTasks.length > 0) await addTasksBatch(importedTasks);');
s = s.replace("    triggerToast(`Đã tạo dự án ${newProject.name}`, 'success');", "    triggerToast(`Đã tạo dự án ${newProject.name}${pendingProjectTasks.length ? ' và import đầu mục công việc' : ''}`, 'success');");
fs.writeFileSync('src/pages/ProjectManagementPage.tsx', s, 'utf8');
