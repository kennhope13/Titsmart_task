const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/accounting.controller.ts', 'utf8');

code = code.replace(
  'docCq: p.doc_cq,',
  'docCq: p.doc_cq,\n  docStamp: p.doc_stamp,'
);

code = code.replace(
  'doc_cq: (docCq !== undefined ? docCq : docCQ) || false,',
  'doc_cq: (docCq !== undefined ? docCq : docCQ) || false,\n        doc_stamp: docStamp || false,'
);

code = code.replace(
  'if (actualDocCq !== undefined) updateData.doc_cq = actualDocCq;',
  'if (actualDocCq !== undefined) updateData.doc_cq = actualDocCq;\n    if (docStamp !== undefined) updateData.doc_stamp = docStamp;'
);

fs.writeFileSync('backend/src/controllers/accounting.controller.ts', code);
console.log('Backend patched');
