const fs = require('fs');
const path = 'web-admin/src/pages/ProjectManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `{engineers.map((eng) => (`;
const replaceStr = `{engineers.filter(eng => eng.title !== 'Quản trị viên' && eng.title !== 'Quản lý dự án').map((eng) => (`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched engineers filter');
