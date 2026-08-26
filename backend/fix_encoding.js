const fs = require('fs');

function fixMaterialTab() {
  const file = '../web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
  let code = fs.readFileSync(file, 'utf8');
  
  // Fix the corrupted encodings
  code = code.replace(/phng chy/g, 'phòng cháy');
  code = code.replace(/ki\?m d\?nh/g, 'kiểm định');
  
  // Ensure STAMP check handles tkd
  const oldRenderMatch = `else if (type === 'STAMP' && (lower.includes('tem') || lower.includes('kiểm định') || lower.includes('stamp'))) docTypeMatches = true;`;
  const newRenderMatch = `else if (type === 'STAMP' && (lower.includes('tem') || lower.includes('kiểm định') || lower.includes('stamp') || lower.includes('tkd'))) docTypeMatches = true;`;
  if (code.includes(oldRenderMatch)) {
    code = code.replace(oldRenderMatch, newRenderMatch);
  }
  
  fs.writeFileSync(file, code);
}

function fixFastDocModal() {
  const file = '../web-admin/src/pages/cost-plan/FastDocModal.tsx';
  let code = fs.readFileSync(file, 'utf8');
  
  // Fix corrupted encodings
  code = code.replace(/phng chy/g, 'phòng cháy');
  code = code.replace(/phAng chAy/g, 'phòng cháy');
  code = code.replace(/ki\?m d\?nh/g, 'kiểm định');
  code = code.replace(/kim `<nh/g, 'kiểm định');
  
  // Actually insert the STAMP condition!
  const oldCondition = `(docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy')))
        ) {`;
  const newCondition = `(docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy'))) ||
          (docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp') || lowerText.includes('tkd')))
        ) {`;
  
  // It appears TWICE
  let parts = code.split(oldCondition);
  if (parts.length > 1) {
    code = parts.join(newCondition);
  }
  
  fs.writeFileSync(file, code);
}

fixMaterialTab();
fixFastDocModal();
console.log('Fixed encodings and added STAMP checks properly!');
