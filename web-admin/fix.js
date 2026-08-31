const fs = require('fs');
let code = fs.readFileSync('import_tra_on.cjs', 'utf8');
code = code.replace(/const isSection = ([^\n]+)\n/, 'const isSection = $1\n      if (isSection) { currentSectionName = (stt ? stt + ". " : "") + content; }\n');
code = code.replace('let currentMainSectionId = undefined;', 'let currentSectionName = "Mục chung";\n    let currentMainSectionId = undefined;');
fs.writeFileSync('import_tra_on.cjs', code);
