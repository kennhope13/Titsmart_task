const fs = require('fs');
const p = 'src/services/webOcrService.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("return line.split(/s{2,}|s*[|;]s*/).map(cleanCSVArtifacts).filter(Boolean);", "return line.split(/\\s{2,}|\\s*[|;]\\s*/).map(cleanCSVArtifacts).filter(Boolean);");
fs.writeFileSync(p, s, 'utf8');
