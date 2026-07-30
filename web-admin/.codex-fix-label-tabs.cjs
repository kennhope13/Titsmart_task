const fs = require('fs');
const p = 'src/services/webOcrService.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  "    const separatorIndex = Math.max(line.indexOf(':'), line.indexOf('-'));\n    if (separatorIndex >= 0) {",
  "    const colonIndex = line.indexOf(':');\n    const dashIndex = line.indexOf('-');\n    const separatorIndex = colonIndex >= 0 ? colonIndex : dashIndex;\n    if (separatorIndex >= 0) {"
);
s = s.replace(
  `  const lines = text\n    .split('\\n')\n    .map(compactSpaces)\n    .filter(Boolean);\n  const flatText = lines.join('\\n');\n  const tableTasks = parseTableTasks(lines);`,
  `  const rawLines = text\n    .split('\\n')\n    .map((line) => normalizeVietnameseText(line))\n    .filter(Boolean);\n  const lines = rawLines.map(compactSpaces);\n  const flatText = lines.join('\\n');\n  const tableTasks = parseTableTasks(rawLines);`
);
fs.writeFileSync(p, s, 'utf8');
