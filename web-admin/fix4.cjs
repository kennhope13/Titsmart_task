const fs = require('fs');
let c = fs.readFileSync('src/pages/ProjectManagementPage.tsx', 'utf-8');

// The file currently has:
// { (user?.role === 'admin' || user?.role === 'pm') ? (
//           <button
//             onClick={() => setIsNewProjectModalOpen(true)}
//             className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 shadow-xs whitespace-nowrap"
//           >
//             <span className="material-symbols-outlined text-sm">add</span>
//             {TEXT.createProject}
//           </button>
//           ) : null} : null}

c = c.replace(/\) : null\} : null\}/g, ") : null}");

// Wait, the error is: src/pages/ProjectManagementPage.tsx(544,19): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
// Let's print the lines around 544 to see what's wrong.
fs.writeFileSync('src/pages/ProjectManagementPage.tsx', c);
