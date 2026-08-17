const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern 1:
  // <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
  //   <span className="material-symbols-outlined text-xl">history</span>
  // </div>
  // Or similar
  
  // We can just use a regex to match:
  const regex = /<div className="w-1[02] h-1[02][^>]*bg-blue-50 border border-blue-100 text-primary[^>]*>[\s\S]*?<span className="material-symbols-outlined[^>]*>.*?<\/span>\s*<\/div>\s*/g;
  
  content = content.replace(regex, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
