const fs = require('fs');
const file = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<th className="px-2 py-1\.5 w-8 text-center">STT<\/th>/g, '');
code = code.replace(/<td className="px-2 py-1\.5 text-center font-bold text-slate-400">\{exp\.stt \|\| '-'}<\/td>/g, '');
code = code.replace(/<td className="px-2 py-1\.5 text-center font-bold text-blue-400">\{lab\.stt \|\| '-'}<\/td>/g, '');

fs.writeFileSync(file, code);
console.log('Regex replace done');
