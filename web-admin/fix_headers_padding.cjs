const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  if (file.includes('FieldLogsPage.tsx')) return; // handled manually
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace py-4 with py-5 in headers
  content = content.replace(/className="([^"]*border-b[^"]*bg-white[^"]*)py-4([^"]*)"/g, (match, p1, p2) => {
    return `className="${p1}py-5${p2}"`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
