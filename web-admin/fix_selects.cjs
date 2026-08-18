const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'cost-plan', 'MaterialPlanTab.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /\{editingCell\?\.id === plan\.id && editingCell\?\.field === '([^']+)' \? \([\s\S]*?<CustomSelect([\s\S]*?)>([\s\S]*?)<\/CustomSelect>\s*\)\ : \(\s*<span[\s\S]*?<\/span>\s*\)\}/g;

let matchCount = 0;
content = content.replace(regex, (match, field, props, options) => {
  matchCount++;
  
  let newProps = props;
  
  if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
    newProps = newProps.replace(/value=\{tempValue \? 'true' : 'false'\}/, `value={plan.${field} ? 'true' : 'false'}`);
    newProps = newProps.replace(/value=\{tempValue \? 'true' : 'false'\}/, `value={plan.${field} ? 'true' : 'false'}`); // Just in case
    newProps = newProps.replace(/docCo: e\.target\.value === 'true'/, `${field}: e.target.value === 'true'`);
  } else if (field === 'progressStatus') {
    newProps = newProps.replace(/value=\{tempValue as string\}/, `value={plan.${field} || ''}`);
  } else {
    newProps = newProps.replace(/value=\{tempValue\}/, `value={plan.${field} || ''}`);
  }
  
  newProps = newProps.replace(/;\s*setEditingCell\(null\);\s*\}\}/g, ' }}');
  newProps = newProps.replace(/\s*onBlur=\{[^}]+\}/g, '');
  newProps = newProps.replace(/\s*autoFocus/g, '');
  
  return `<CustomSelect${newProps}>${options}</CustomSelect>`;
});

fs.writeFileSync(file, content, 'utf8');
console.log(`Replaced ${matchCount} CustomSelect inline editors.`);
