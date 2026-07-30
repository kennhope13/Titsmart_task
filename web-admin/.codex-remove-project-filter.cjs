const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const projectSelector = /\n\s*\{\/\* Project Selector \*\/\}\s*<div className="flex items-center gap-1 flex-shrink-0">[\s\S]*?<\/select>\s*<\/div>\s*/;
s = s.replace(projectSelector, '\n');
// When the project selector is removed, keep the section filter without the visual separator.
s = s.replace(/\s*<span className="text-slate-300">\|<\/span>\s*/g, '\n');
s = s.replace('/* Left: Project Selector & Section Filter */', '/* Left: Section Filter */');
s = s.replace('/* Row 1: Primary Filters (Project & Custom Ultra-Sleek Section Dropdown) + Quick Search */', '/* Row 1: Primary Filters + Quick Search */');
fs.writeFileSync(p, s, 'utf8');
