const fs = require('fs');
let file = '../web-admin/src/pages/cost-plan/FastDocModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\(docType === 'PCCC' && \(lowerText\.includes\('pccc'\) \|\| lowerText\.includes\('phòng cháy'\)\)\)\r?\n\s*\) \{/g;
const replacement = `(docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy'))) ||
          (docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp') || lowerText.includes('tkd')))
        ) {`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code);
console.log('Patched properly with regex!');
