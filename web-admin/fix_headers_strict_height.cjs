const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace py-5 with py-4 md:py-0 md:h-[72px]
  content = content.replace(/className="([^"]*border-b[^"]*bg-white[^"]*)py-5([^"]*)"/g, (match, p1, p2) => {
    return `className="${p1}py-4 md:py-0 md:h-[72px]${p2}"`;
  });

  // Also handle FieldLogsPage which has py-[10px]
  content = content.replace(/className="([^"]*border-b[^"]*bg-white[^"]*)py-\[10px\]([^"]*)"/g, (match, p1, p2) => {
    return `className="${p1}py-4 md:py-0 md:h-[72px]${p2}"`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
