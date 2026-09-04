const fs = require('fs');
const file = 'src/pages/ProjectManagementPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\(project as any\)\.client && \([\s\S]*?<\/p>\s*\n\s*\)\}\s*\n\s*\{\/\* Nh/g;

const replacement = `{(project as any).client && (
                      <p className="text-[11px] text-slate-500 truncate">
                        <span className="font-semibold text-slate-400">CĐT: </span>
                        {(project as any).client}
                      </p>
                    )}

                    {project.notes && (
                      <p className="text-[11px] text-slate-500 truncate mt-[-4px]" title={project.notes}>
                        <span className="font-semibold text-slate-400">Hạng mục: </span>
                        {project.notes}
                      </p>
                    )}

                    {/* Nh`;

if (regex.test(content)) {
    fs.writeFileSync(file, content.replace(regex, replacement), 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Target not found');
}
