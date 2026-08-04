const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/MaterialPlanTab.tsx', 'utf8');

code = code.replace(/<td([^>]*)>([\s\S]*?)<\/td>/g, (match, tdAttrs, content) => {
  if (content.includes('editingCell?.id === plan.id')) {
    let newTdAttrs = tdAttrs.replace(/\s+px-[\d\.]+\s+py-[\d\.]+/, ' p-0 align-top');
    
    let newContent = content.replace(/className=\"([^\"]*border rounded[^\"]*)\"/, (m, c1) => {
      let nc = c1.replace(/border|rounded(-md|-lg)?|px-[\d\.]+|py-[\d\.]+/g, '').replace(/\s+/g, ' ').trim();
      return 'className="' + nc + ' px-1.5 py-1.5 w-full h-full min-h-[32px] box-border outline-none border-2 border-primary focus:border-primary"';
    });
    
    newContent = newContent.replace(/className=\"([^\"]*cursor-pointer hover:bg-slate-100[^\"]*)\"/, (m, c1) => {
      let nc = c1.replace(/rounded(-md|-lg)?|px-[\d\.]+|py-[\d\.]+|block/g, '').replace(/\s+/g, ' ').trim();
      return 'className="' + nc + ' px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center"';
    });

    return '<td' + newTdAttrs + '>' + newContent + '</td>';
  }
  return match;
});

fs.writeFileSync('src/pages/cost-plan/MaterialPlanTab.tsx', code);
console.log('Done');
