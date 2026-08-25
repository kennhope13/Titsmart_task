const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('src/pages');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Remove specific drag spacer snippets
    content = content.replace(/\{\/\* Drag region spacer \*\/\}\s*<div className="flex-1 h-full min-h-\[10px\] electron-drag" style=\{\{\s*WebkitAppRegion: 'drag'\s*\} as React\.CSSProperties\}\s*\/>/g, '');
    content = content.replace(/<div className="flex-1 h-full min-h-\[10px\] electron-drag" style=\{\{\s*WebkitAppRegion: 'drag'\s*\} as React\.CSSProperties\}\s*\/>/g, '');
    content = content.replace(/\{\/\* Spacer cho drag region \*\/\}\s*<div className="flex-1 h-full min-h-\[10px\] electron-drag" style=\{\{\s*WebkitAppRegion: 'drag'\s*\} as React\.CSSProperties\}\s*\/>/g, '');
    
    // Replace window.electronAPI conditional padding
    content = content.replace(/\$\{window\.electronAPI \? 'pr-\[180px\]' : '([^']+)'\}/g, '$1');
    content = content.replace(/\$\{window\.electronAPI \? 'pr-\[180px\]' : ''\}/g, '');
    content = content.replace(/\$\{window\.electronAPI \? 'pr-\[140px\]' : ''\}/g, '');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Cleaned ' + file);
    }
});
