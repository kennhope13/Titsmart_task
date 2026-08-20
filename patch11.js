const fs = require('fs');

const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `const map = new Map<string, any>();
        const roots: any[] = [];
        items.forEach(t => map.set(t.id, { ...t, children: [] }));
        items.forEach(t => {
          if (t.parentId && map.has(t.parentId)) {
            map.get(t.parentId)!.children.push(map.get(t.id));
          } else {
            roots.push(map.get(t.id));
          }
        });`;

const replacement = `const resolveParentId = (item: any) => {
          if (item.stt && item.stt.includes('.')) {
            const parts = item.stt.split('.');
            parts.pop();
            const parentStt = parts.join('.');
            const parentItem = items.find((r: any) => r.stt === parentStt);
            if (parentItem) return parentItem.id;
          }
          return item.parentId;
        };

        const map = new Map<string, any>();
        const roots: any[] = [];
        items.forEach(t => map.set(t.id, { ...t, children: [] }));
        items.forEach(t => {
          const resolvedParentId = resolveParentId(t);
          if (resolvedParentId && map.has(resolvedParentId)) {
            map.get(resolvedParentId)!.children.push(map.get(t.id));
          } else {
            roots.push(map.get(t.id));
          }
        });`;

if (content.replace(/\\r\\n/g, '\\n').includes(target.replace(/\\r\\n/g, '\\n'))) {
  content = content.replace(/\\r\\n/g, '\\n').replace(target.replace(/\\r\\n/g, '\\n'), replacement);
  if (fs.readFileSync(path, 'utf8').includes('\\r\\n')) {
    content = content.replace(/\\n/g, '\\r\\n');
  }
  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched TaskManagementPage tree logic!');
} else {
  console.error('Target not found in TaskManagementPage');
}
