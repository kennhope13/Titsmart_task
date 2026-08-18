const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'cost-plan', 'MaterialPlanTab.tsx');
let content = fs.readFileSync(file, 'utf8');

const fields = [
  'techSpecStatus',
  'progressStatus',
  'orderedStatus',
  'docCo',
  'docCq',
  'docFireInspection',
  'dispatchToSite'
];

let matchCount = 0;

for (const field of fields) {
  // Find the start of the editing block for this field
  const blockStartStr = `{editingCell?.id === plan.id && editingCell?.field === '${field}' ? (`;
  const blockStartIdx = content.indexOf(blockStartStr);
  
  if (blockStartIdx === -1) continue;
  
  // Find the CustomSelect start and end
  const selectStartIdx = content.indexOf('<CustomSelect', blockStartIdx);
  const selectEndIdx = content.indexOf('</CustomSelect>', selectStartIdx) + '</CustomSelect>'.length;
  
  // Extract the CustomSelect block
  let selectBlock = content.substring(selectStartIdx, selectEndIdx);
  
  // Modify the CustomSelect block
  if (field === 'docCo' || field === 'docCq' || field === 'docFireInspection' || field === 'dispatchToSite') {
    selectBlock = selectBlock.replace(/value=\{tempValue \? 'true' : 'false'\}/g, `value={plan.${field} ? 'true' : 'false'}`);
    // Also handle possible `tempValue` raw matches just in case
    selectBlock = selectBlock.replace(/value=\{tempValue\}/g, `value={plan.${field} ? 'true' : 'false'}`);
    selectBlock = selectBlock.replace(new RegExp(`onChange=\\{\\(e\\) => \\{ onUpdate\\(plan\\.id, \\{ \\.\\.\\.plan, ${field}: e\\.target\\.value === 'true' \\}\\); setEditingCell\\(null\\); \\}\\}`, 'g'), `onChange={(e) => { onUpdate(plan.id, { ...plan, ${field}: e.target.value === 'true' }) }}`);
  } else if (field === 'progressStatus') {
    selectBlock = selectBlock.replace(/value=\{tempValue as string\}/g, `value={plan.${field} || ''}`);
    selectBlock = selectBlock.replace(new RegExp(`onChange=\\{\\(e\\) => \\{\\s*onUpdate\\(plan\\.id, \\{ \\.\\.\\.plan, ${field}: e\\.target\\.value \\}\\);\\s*setEditingCell\\(null\\);\\s*\\}\\}`, 'm'), `onChange={(e) => { onUpdate(plan.id, { ...plan, ${field}: e.target.value }) }}`);
  } else {
    selectBlock = selectBlock.replace(/value=\{tempValue\}/g, `value={plan.${field} || ''}`);
    selectBlock = selectBlock.replace(new RegExp(`onChange=\\{\\(e\\) => \\{ onUpdate\\(plan\\.id, \\{ \\.\\.\\.plan, ${field}: e\\.target\\.value \\}\\); setEditingCell\\(null\\); \\}\\}`, 'g'), `onChange={(e) => { onUpdate(plan.id, { ...plan, ${field}: e.target.value }) }}`);
  }
  
  selectBlock = selectBlock.replace(/\s*onBlur=\{[^}]+\}/g, '');
  selectBlock = selectBlock.replace(/\s*autoFocus/g, '');
  
  // Find the end of the entire editingCell block (the closing `)}`)
  const spanStartIdx = content.indexOf('<span', selectEndIdx);
  const spanEndIdx = content.indexOf('</span>', spanStartIdx) + '</span>'.length;
  // The block ends shortly after the spanEndIdx
  const blockEndIdx = content.indexOf(')}', spanEndIdx) + ')}'.length;
  
  // Replace the entire `{editingCell...)}` with just the modified `selectBlock`
  const before = content.substring(0, blockStartIdx);
  const after = content.substring(blockEndIdx);
  content = before + selectBlock + after;
  
  matchCount++;
}

fs.writeFileSync(file, content, 'utf8');
console.log(`Replaced ${matchCount} CustomSelect inline editors.`);
