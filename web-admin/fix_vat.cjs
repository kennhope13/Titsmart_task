const fs = require('fs');
let code = fs.readFileSync('src/services/webOcrService.ts', 'utf8');

code = code.replace(
  "return lookup.includes('tong cong') || lookup === 'cong' || lookup.includes('bang chi tiet gia tri hop dong') || lookup.includes('gia tri hop dong');",
  "return lookup.includes('tong cong') || lookup === 'cong' || lookup.includes('bang chi tiet') || lookup.includes('gia tri hop dong') || lookup.includes('thue') || lookup.includes('vat') || lookup.includes('chiet khau') || /^\\d+$/.test(lookup) || lookup === 'stt';"
);

fs.writeFileSync('src/services/webOcrService.ts', code);
