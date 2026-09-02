import fs from 'fs';
let c = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
c = c.replace(/label: 'C.*ng vi\?c', path: '\/my-tasks'/g, \label: 'Công vi?c', path: '/my-tasks'\);
fs.writeFileSync('src/components/layout/Sidebar.tsx', c, 'utf8');
