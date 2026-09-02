import fs from 'fs';
fs.writeFileSync('src/components/common/SharedTaskTabs.tsx', fs.readFileSync('src/components/common/SharedTaskTabs.tsx', 'utf16le'), 'utf8');
fs.writeFileSync('src/components/common/TaskHeaderTabs.tsx', fs.readFileSync('src/components/common/TaskHeaderTabs.tsx', 'utf16le'), 'utf8');
