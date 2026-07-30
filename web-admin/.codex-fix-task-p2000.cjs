const fs = require('fs');
const p = '..\\backend\\src\\controllers\\tasks.controller.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  "const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);",
  `const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);\n\nconst truncateText = (value: unknown, max: number) => {\n  if (value === undefined || value === null) return '';\n  return String(value).trim().slice(0, max);\n};\n\nconst optionalTruncateText = (value: unknown, max: number) => {\n  const text = truncateText(value, max);\n  return text || null;\n};`
);
s = s.replace('        stt: data.stt,', '        stt: optionalTruncateText(data.stt, 50),');
s = s.replace('        code: data.code || `TSK-${projectCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,', '        code: truncateText(data.code || `TSK-${projectCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 100),');
s = s.replace('        unit: data.unit,', '        unit: truncateText(data.unit, 50),');
s = s.replace('        purchase_status: purchaseStatus || \'\',', '        purchase_status: truncateText(purchaseStatus, 255),');
s = s.replace('        construction_status: constrStatus || \'\',', '        construction_status: truncateText(constrStatus, 255),');
s = s.replace('        issue_status_text: issueStatus || \'\',', '        issue_status_text: optionalTruncateText(issueStatus, 255),');
// updateTask whitelist fields with varchar limits
s = s.replace(`    allowed.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });`, `    allowed.forEach(field => {
      if (data[field] === undefined) return;
      if (field === 'stt') updateData[field] = optionalTruncateText(data[field], 50);
      else if (field === 'code') updateData[field] = truncateText(data[field], 100);
      else if (field === 'unit') updateData[field] = truncateText(data[field], 50);
      else updateData[field] = data[field];
    });`);
s = s.replace('    if (issueStatus !== undefined) updateData.issue_status_text = issueStatus;', '    if (issueStatus !== undefined) updateData.issue_status_text = optionalTruncateText(issueStatus, 255);');
s = s.replace('    if (purchaseStatus !== undefined) updateData.purchase_status = purchaseStatus;', '    if (purchaseStatus !== undefined) updateData.purchase_status = truncateText(purchaseStatus, 255);');
s = s.replace('    if (constrStatus !== undefined) updateData.construction_status = constrStatus;', '    if (constrStatus !== undefined) updateData.construction_status = truncateText(constrStatus, 255);');
fs.writeFileSync(p, s, 'utf8');
