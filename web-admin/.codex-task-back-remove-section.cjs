const fs = require('fs');
let p = 'src/services/webOcrService.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("      stt: isSectionHeader ? '' : (stt || String(parsedTasks.length + 1)),", "      stt: isSectionHeader ? (numericParentRegex.test(sttLookup) ? stt : '') : (stt || String(parsedTasks.length + 1)),");
fs.writeFileSync(p, s, 'utf8');

p = 'src/pages/TaskManagementPage.tsx';
s = fs.readFileSync(p, 'utf8');
// Move back button from right action group to left title group.
const backButton = `          {selectedProjectFromUrl && (
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Quay lại tất cả dự án
            </button>
          )}

`;
s = s.replace(backButton, '');
const leftTitleStart = `        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">`;
const leftTitleReplacement = `        <div className="flex items-center gap-3 min-w-0">
          {selectedProjectFromUrl && (
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-2xs flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Quay lại tất cả dự án
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">`;
if (!s.includes(leftTitleStart)) throw new Error('left title start not found');
s = s.replace(leftTitleStart, leftTitleReplacement);

// Remove section-filter row entirely.
s = s.replace(/\n\s*\{\/\* Row 1: Primary Filters \+ Quick Search \*\/\}\s*<div className="flex flex-col md:flex-row items-center justify-between gap-2">[\s\S]*?\n\s*<\/div>\s*\n\s*\{\/\* Row 2: DETAILED ATTRIBUTE FILTERS \*\/\}/, '\n        {/* Row 1: DETAILED ATTRIBUTE FILTERS */}');
// Remove selected section banner.
s = s.replace(/\n\s*\{\/\* BANNER HIỂN THỊ MỤC ĐANG LỌC \*\/\}\s*\{selectedRomanSection !== 'all' && \([\s\S]*?\n\s*\)\}\s*\n\s*\{\/\* Main Data Table \*\/\}/, '\n      {/* Main Data Table */}');
// Remove section filter from active filter detection.
s = s.replace("    selectedRomanSection !== 'all' ||\n", '');
// Simplify display task filtering so section filter no longer applies.
s = s.replace(/\n\s*if \(selectedRomanSection === 'all'\) \{\s*return \([\s\S]*?\n\s*\);\s*\} else \{[\s\S]*?\n\s*\}\s*\n\s*\}\);/, `
    return (
      matchesProj &&
      matchesPurchase &&
      matchesConstr &&
      matchesIssue &&
      matchesSearch
    );
  });`);
fs.writeFileSync(p, s, 'utf8');
