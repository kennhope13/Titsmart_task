const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', 'utf8');

// Update props
code = code.replace(
  `docType: 'CO' | 'CQ' | 'PCCC';`,
  `docType: 'CO' | 'CQ' | 'PCCC' | 'STAMP';`
);

// Update condition
const oldCondition = `(docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy')))
        ) {`;
const newCondition = `(docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy'))) ||
          (docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp')))
        ) {`;
code = code.replace(oldCondition, newCondition);
code = code.replace(oldCondition, newCondition); // Replace again for handleSubmit

// Update fallback text
const oldFallback = `if (docType === 'PCCC') setText('PCCC: ');`;
const newFallback = `if (docType === 'PCCC') setText('PCCC: ');
      if (docType === 'STAMP') setText('Tem KĐ: ');`;
code = code.replace(oldFallback, newFallback);

fs.writeFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', code);
console.log('FastDocModal patched');
