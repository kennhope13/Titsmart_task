const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue is an extra </div> before `<div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">`
content = content.replace(
  /          <\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="w-full max-w-full/,
  '          </div>\n        </div>\n      </div>\n\n      <div className="w-full max-w-full'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed extra div');
