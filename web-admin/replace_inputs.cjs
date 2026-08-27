const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

const regexSpender = /<div className="relative">\s*<input\s*type="text"\s*list="spender-names"[\s\S]*?value=\{([^}]+)\}[\s\S]*?onChange=\{\(e\) => ([^\(]+)\(\{\.\.\.([^,]+),\s*spenderName:\s*e\.target\.value\}\)\}[\s\S]*?\/>\s*<span[\s\S]*?expand_more\s*<\/span>\s*<\/div>/g;

code = code.replace(regexSpender, (match, val, setter, state) => {
  return `<CustomSelect value={${val}} onChange={(e) => ${setter}({...${state}, spenderName: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">\n  {expenseSpenderNames.map((name, i) => (\n    <option key={i} value={name}>{name}</option>\n  ))}\n</CustomSelect>`;
});

const regexContent = /<div className="relative">\s*<input\s*type="text"\s*list="expense-content-types"[\s\S]*?value=\{([^}]+)\}[\s\S]*?onChange=\{\(e\) => ([^\(]+)\(\{\.\.\.([^,]+),\s*content:\s*e\.target\.value\}\)\}[\s\S]*?\/>\s*<span[\s\S]*?expand_more\s*<\/span>\s*<\/div>/g;

code = code.replace(regexContent, (match, val, setter, state) => {
  return `<CustomSelect value={${val}} onChange={(e) => ${setter}({...${state}, content: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">\n  {expenseContentTypes.map((type, i) => (\n    <option key={i} value={type}>{type}</option>\n  ))}\n</CustomSelect>`;
});

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
