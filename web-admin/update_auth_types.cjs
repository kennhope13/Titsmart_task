
const fs = require('fs');
let file = fs.readFileSync('src/services/authStore.ts', 'utf8');

file = file.replace(/projectCodes\?\: string\[\];/g, 'projectCodes?: string[];\n  permissions?: import(\'../types\').Permission[];');

fs.writeFileSync('src/services/authStore.ts', file);
console.log('done');

