const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/DocumentCertificateTab.tsx', 'utf8');
f = f.replace(/try\s*\{\s*const parsed = JSON\.parse\(issueContent\);/, "try { const parts = issueContent.split('[DOC-DATA]'); let dataString = parts.length > 1 ? parts[1].trim() : issueContent; const parsed = JSON.parse(dataString);");
fs.writeFileSync('web-admin/src/pages/cost-plan/DocumentCertificateTab.tsx', f, 'utf8');
