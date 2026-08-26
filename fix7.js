const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/MaterialTrackingPage.tsx', 'utf8');

code = code.replace(
  /className=\{\`app-tab-button flex items-center gap-2\.5 px-3 py-2 border-b-2 transition-all whitespace-nowrap/g,
  'className={`app-tab-button flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap'
);

code = code.replace(
  /<span className="material-symbols-outlined text-base leading-none">\{tab\.icon\}<\/span>/g,
  '<span className="material-symbols-outlined text-[16px] leading-none">{tab.icon}</span>'
);

fs.writeFileSync('web-admin/src/pages/MaterialTrackingPage.tsx', code);
console.log('Fixed MaterialTrackingPage');
