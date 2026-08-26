const fs = require('fs');

const filePath = 'web-admin/src/components/layout/Sidebar.tsx';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the LAST occurrence of `</nav>` and remove it
let lastNavIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</nav>')) {
    lastNavIdx = i;
    break;
  }
}

if (lastNavIdx !== -1) {
  lines.splice(lastNavIdx, 1);
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('Fixed');
} else {
  console.log('Not found');
}
