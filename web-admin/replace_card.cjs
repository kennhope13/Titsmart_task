const fs = require('fs');
const file = 'src/pages/ProjectManagementPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                    {(project as any).client && (
                      <p className="text-[11px] text-slate-500 truncate">
                        <span className="font-semibold text-slate-400">CĐT: </span>
                        {(project as any).client}
                      </p>
                    )}

                    {/* Nhân sự dự án */}`;

const replacement = `                    {(project as any).client && (
                      <p className="text-[11px] text-slate-500 truncate">
                        <span className="font-semibold text-slate-400">CĐT: </span>
                        {(project as any).client}
                      </p>
                    )}

                    {/* Hạng mục */}
                    {project.notes && (
                      <p className="text-[11px] text-slate-500 truncate" title={project.notes}>
                        <span className="font-semibold text-slate-400">Hạng mục: </span>
                        {project.notes}
                      </p>
                    )}

                    {/* Nhân sự dự án */}`;

if (content.includes(target)) {
    fs.writeFileSync(file, content.replace(target, replacement), 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Target not found');
}
