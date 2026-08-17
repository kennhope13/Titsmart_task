const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // We look for the main header section or header tag.
  // It usually has "border-b border-slate-200 bg-white" and "py-4".
  // Let's replace "py-4" with "h-[72px]" in lines that look like page headers.
  
  content = content.replace(/className="([^"]*border-b[^"]*bg-white[^"]*)py-4([^"]*)"/g, (match, p1, p2) => {
    return `className="${p1}h-[72px] ${p2.trim()}"`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
