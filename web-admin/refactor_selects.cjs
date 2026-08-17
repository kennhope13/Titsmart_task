const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('CustomSelect.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for `<select ` or `<select>`
      if (content.match(/<select\b/)) {
        // Replace opening tags
        content = content.replace(/<select\b/g, '<CustomSelect');
        // Replace closing tags
        content = content.replace(/<\/select>/g, '</CustomSelect>');
        
        // Add import
        if (!content.includes('CustomSelect')) {
           // wait, we just replaced tags, so it definitely includes CustomSelect now. 
           // Better check if the import statement exists.
           // Actually, let's just check for 'from '@/components/common/CustomSelect'
        }
        if (!content.includes("@/components/common/CustomSelect")) {
          // Find the last import statement
          const importMatches = [...content.matchAll(/^import .* from .*$/gm)];
          if (importMatches.length > 0) {
            const lastMatch = importMatches[importMatches.length - 1];
            const insertIndex = lastMatch.index + lastMatch[0].length;
            content = content.slice(0, insertIndex) + "\nimport { CustomSelect } from '@/components/common/CustomSelect';" + content.slice(insertIndex);
          } else {
            content = "import { CustomSelect } from '@/components/common/CustomSelect';\n" + content;
          }
        }
        
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done!');
