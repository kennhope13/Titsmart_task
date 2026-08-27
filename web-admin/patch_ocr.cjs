const fs = require('fs');
let code = fs.readFileSync('src/services/webOcrService.ts', 'utf8');

code = code.replace(
  /const normalizeLookupText = \(value: string\) =>\r?\n\s*value\r?\n\s*\.normalize/g,
  'const normalizeLookupText = (value: any) =>\n  String(value || "")\n    .normalize'
);

code = code.replace(
  /const normalized = header\.map\(normalizeLookupText\);/g,
  'const normalized = Array.from(header || []).map(normalizeLookupText);'
);

code = code.replace(
  /const normalized = cells\.map\(normalizeLookupText\);/g,
  'const normalized = Array.from(cells || []).map(normalizeLookupText);'
);

fs.writeFileSync('src/services/webOcrService.ts', code);
