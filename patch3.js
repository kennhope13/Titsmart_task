const fs = require('fs');

const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const filteredData = useMemo(() => {',
  'const { filteredData, resolveParentId, getSectionIndexForItem } = useMemo(() => {'
);

const sortBlockRegex = /return filtered\.sort\(\(a, b\) => \{([\s\S]*?)\}\);/m;
const match = content.match(sortBlockRegex);
if (match) {
  const replacement = `const sortedFiltered = filtered.sort((a, b) => {${match[1]}});
    return { filteredData: sortedFiltered, resolveParentId, getSectionIndexForItem };`;
  content = content.replace(sortBlockRegex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched useMemo in MaterialPlanTab!');
} else {
  console.error('Could not find sort block');
}
