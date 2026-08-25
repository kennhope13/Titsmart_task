const fs = require('fs');
let f = fs.readFileSync('web-admin/src/components/layout/Sidebar.tsx', 'utf8');

f = f.replace(/icon: 'playlist_add_check'/g, "icon: 'task'"); 
f = f.replace(/icon: 'drafts'/g, "icon: 'folder_open'"); 
f = f.replace(/icon: 'request_quote'/g, "icon: 'receipt_long'"); 

fs.writeFileSync('web-admin/src/components/layout/Sidebar.tsx', f);
console.log('Icons updated');
