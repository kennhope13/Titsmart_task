const fs = require('fs');
const path = 'web-admin/src/pages/PersonnelPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Role span
const roleTarget = `<span className={\`px-2 py-0.5 rounded text-[11px] font-bold \${
                        person.role === 'Quản trị viên' ? 'bg-purple-100 text-purple-700' :
                        person.role === 'Quản lý dự án' ? 'bg-blue-100 text-blue-700' :
                        person.role === 'Kỹ sư hiện trường' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }\`}>`;
const roleReplace = `<span className={\`text-[11px] font-bold \${
                        person.role === 'Quản trị viên' ? 'text-purple-700' :
                        person.role === 'Quản lý dự án' ? 'text-blue-700' :
                        person.role === 'Kỹ sư hiện trường' ? 'text-orange-700' :
                        'text-slate-700'
                      }\`}>`;

content = content.replace(roleTarget, roleReplace);

// 2. Project 'Tất cả dự án'
const allProjectsTarget = `<span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 whitespace-nowrap">Tất cả dự án</span>`;
const allProjectsReplace = `<span className="text-blue-700 text-[11px] font-bold whitespace-nowrap">Tất cả dự án</span>`;
content = content.replace(allProjectsTarget, allProjectsReplace);

// 3. Project loops
const projectLoopTarget = `{person.assignedProjects.map((mp: any) => (
                            <span key={mp.code} className="px-2 py-0.5 rounded-full bg-blue-50 text-primary text-[11px] font-bold border border-blue-100 whitespace-nowrap">{mp.name}</span>
                          ))}`;
const projectLoopReplace = `{person.assignedProjects.map((mp: any, i: number, arr: any[]) => (
                            <span key={mp.code} className="text-primary text-[11px] font-bold whitespace-nowrap">
                              {mp.name}{i < arr.length - 1 ? ', ' : ''}
                            </span>
                          ))}`;
content = content.replace(projectLoopTarget, projectLoopReplace);

// 4. Status span
const statusTarget = `<td className="p-3 whitespace-nowrap"><span className={\`px-2 py-1 rounded-full text-[11px] font-bold \${person.locked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}\`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>`;
const statusReplace = `<td className="p-3 whitespace-nowrap"><span className={\`text-[11px] font-bold \${person.locked ? 'text-red-700' : 'text-emerald-700'}\`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>`;
content = content.replace(statusTarget, statusReplace);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched PersonnelPage.tsx');
