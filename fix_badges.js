const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

const searchClass = `className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300"`;
const replaceClass = `className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 cursor-pointer transition"`;

// Just use normal string replace, it's safer
code = code.replace(
  `<span ${searchClass}>CO</span>`,
  `<button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'CO'); }} ${replaceClass}>CO</button>`
);

code = code.replace(
  `<span ${searchClass}>CQ</span>`,
  `<button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'CQ'); }} ${replaceClass}>CQ</button>`
);

code = code.replace(
  `<span ${searchClass}>PCCC</span>`,
  `<button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'PCCC'); }} ${replaceClass}>PCCC</button>`
);

code = code.replace(
  `<span ${searchClass}>TKD</span>`,
  `<button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'STAMP'); }} ${replaceClass}>TKD</button>`
);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
console.log('Fixed badges string replace');
