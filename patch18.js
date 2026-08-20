const fs = require('fs');
const path = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove the td
content = content.replace(/<td className="p-3 whitespace-nowrap">\s*<span className="inline-flex items-center gap-1\.5 text-primary font-bold">[\s\S]*?<\/span>\s*<\/td>/, '');

// Remove the div in the modal
content = content.replace(/<div className="flex flex-col gap-1 border-b pb-3 border-slate-100">\s*<span className="text-slate-500 font-bold text-\[10px\] uppercase tracking-wider">Ph.*?m vi<\/span>[\s\S]*?<\/div>/, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Removed td and div successfully!');
