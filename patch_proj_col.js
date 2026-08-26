const fs = require('fs');

const filePath = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// Conditionally render col for "Dự án" (13%, 10%, 13%, 15% across the 4 tables)
data = data.replace(
  /<col style=\{\{ width: '13%' \}\} \/>\s*<col style=\{\{ width: '19%' \}\} \/>/,
  `{!projectId && <col style={{ width: '13%' }} />}
                <col style={{ width: !projectId ? '19%' : '32%' }} />`
);

data = data.replace(
  /<col style=\{\{ width: '10%' \}\} \/>\s*<col style=\{\{ width: '10%' \}\} \/>/,
  `{!projectId && <col style={{ width: '10%' }} />}
                <col style={{ width: !projectId ? '10%' : '20%' }} />`
);

data = data.replace(
  /<col style=\{\{ width: '13%' \}\} \/>\s*<col style=\{\{ width: '12%' \}\} \/>/,
  `{!projectId && <col style={{ width: '13%' }} />}
                <col style={{ width: !projectId ? '12%' : '25%' }} />`
);

data = data.replace(
  /<col style=\{\{ width: '15%' \}\} \/>\s*<col style=\{\{ width: '12%' \}\} \/>/,
  `{!projectId && <col style={{ width: '15%' }} />}
                <col style={{ width: !projectId ? '12%' : '27%' }} />`
);

// Conditionally render th
data = data.replace(/<th className="px-2 py-2">Dự án<\/th>/g, '{!projectId && <th className="px-2 py-2">Dự án</th>}');

// Conditionally render td
const tdPattern = /<td className="px-2 py-2 text-\[13px\] font-bold text-slate-600 truncate">\{projects\.find\(p => p\.id === \(track as any\)\.projectId \|\| p\.code === track\.projectCode\)\?\.name \|\| track\.projectCode \|\| '-'\.toString\(\)\}<\/td>/g;
// Wait, my regex above might not match exact formatting. Let's just use replace with string.

data = data.replaceAll('<td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || \'-\'}</td>', 
  '{!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || \'-\'}</td>}');

// One detail: In the forms (add/edit), should we hide the Project dropdown if we are inside a project?
// They said "cột dự án thì chắc không cần đâu" (the project COLUMN is probably not needed). They specifically said "cột" (column). 
// But if they are inside a project, they shouldn't need to select the project anyway, though maybe it's auto-selected.

fs.writeFileSync(filePath, data);
console.log('Fixed project column visibility');
