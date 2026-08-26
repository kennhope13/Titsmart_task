const fs = require('fs');

const filePath = 'web-admin/src/components/layout/Sidebar.tsx';
let f = fs.readFileSync(filePath, 'utf8');

// Find the start of the user profile div
const profileDivStart = '<div className="pt-4 border-t border-slate-100 relative flex flex-col gap-2">';

// Replace it with </nav> and then the div but we need to remove the existing </nav>
f = f.replace(profileDivStart, '</nav>\n      <div className="pt-4 pb-4 px-2 border-t border-slate-100 relative flex flex-col gap-2">');

// Remove the old </nav> before </aside>
f = f.replace('      </nav>\n    </aside>', '    </aside>');

fs.writeFileSync(filePath, f);
console.log('Fixed');
