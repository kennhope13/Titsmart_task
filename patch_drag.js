const fs = require('fs');

function refactorDragRegion(file) {
  if (!fs.existsSync(file)) return;
  let f = fs.readFileSync(file, 'utf8');

  // Find <section className={`... electron-drag ...`}>
  // We will replace electron-drag with empty string
  f = f.replace(/ electron-drag /g, ' ');
  f = f.replace(/ electron-no-drag/g, '');

  // Add the drag div before the right-side controls
  // Right side controls usually have "justify-end"
  const rightSidePattern = /<div className="([^"]*justify-end[^"]*)">/;
  f = f.replace(rightSidePattern, (match, p1) => {
    return `<div className="flex-1 h-full min-h-[10px] electron-drag" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />\n          <div className="${p1}">`;
  });

  fs.writeFileSync(file, f);
}

refactorDragRegion('web-admin/src/pages/ProjectManagementPage.tsx');
refactorDragRegion('web-admin/src/pages/ActivityLogPage.tsx');
refactorDragRegion('web-admin/src/pages/MaterialTrackingPage.tsx');
refactorDragRegion('web-admin/src/pages/PersonnelPage.tsx');
// Also ProjectDetailPage
function refactorDetailDrag(file) {
  if (!fs.existsSync(file)) return;
  let f = fs.readFileSync(file, 'utf8');
  f = f.replace(/ electron-drag /g, ' ');
  f = f.replace(/ electron-no-drag/g, '');

  const rightSidePattern = /<div className="flex items-center gap-2">/;
  // Wait, ProjectDetailPage has right side buttons in a div with gap-2
  f = f.replace(rightSidePattern, (match) => {
    return `<div className="flex-1 h-full min-h-[10px] electron-drag" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />\n          <div className="flex items-center gap-2">`;
  });
  fs.writeFileSync(file, f);
}
refactorDetailDrag('web-admin/src/pages/ProjectDetailPage.tsx');

console.log('Done refactoring drag regions');
