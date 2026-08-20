const fs = require('fs');

const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

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

// We match from "const map = new Map<string, any>();" to "});" right before "const flattenTree"
const regex = /const map = new Map<string, any>\(\);[\s\S]*?roots\.push\(map\.get\(t\.id\)\);\s*\}\s*\}\);/g;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched TaskManagementPage tree logic successfully!');
} else {
  console.error('Target not found via regex!');
}
