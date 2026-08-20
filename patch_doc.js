const fs = require('fs');
const path = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// docStatus span
content = content.replace(/<span className={`inline-flex px-2 py-0\.5 rounded-full text-\[10px\] font-bold border \$\{([^}]+)\}`}>\s*\{track\.docStatus \|\| 'Chưa rõ'\}\s*<\/span>/g, (match, condition) => {
    let newCondition = condition
        .replace(/'bg-emerald-50 text-emerald-700 border-emerald-200'/g, "'text-emerald-700'")
        .replace(/'bg-amber-50 text-amber-700 border-amber-200'/g, "'text-amber-700'");
    return `<span className={\`text-[10px] font-bold \${${newCondition}}\`}>{track.docStatus || 'Chưa rõ'}</span>`;
});

// paymentStatus span
content = content.replace(/<span className={`inline-flex px-2 py-0\.5 rounded-full text-\[10px\] font-bold border \$\{([^}]+)\}`}>\s*\{track\.paymentStatus \|\| 'Chưa thanh toán'\}\s*<\/span>/g, (match, condition) => {
    let newCondition = condition
        .replace(/'bg-emerald-50 text-emerald-700 border-emerald-200'/g, "'text-emerald-700'")
        .replace(/'bg-rose-50 text-rose-700 border-rose-200'/g, "'text-rose-700'");
    return `<span className={\`text-[10px] font-bold \${${newCondition}}\`}>{track.paymentStatus || 'Chưa thanh toán'}</span>`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Patched DocumentTrackingPage.tsx');
