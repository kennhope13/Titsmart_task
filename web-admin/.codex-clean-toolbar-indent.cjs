const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('            \n{/* ULTRA-SLEEK MODERN ROMAN SECTION DROPDOWN POPOVER */}', '            \n            {/* ULTRA-SLEEK MODERN ROMAN SECTION DROPDOWN POPOVER */}');
s = s.replace('              <>\n<div className="relative">', '              <>\n                <div className="relative">');
fs.writeFileSync(p, s, 'utf8');
