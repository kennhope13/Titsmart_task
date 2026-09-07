const crypto = require('crypto');
const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/i;
const isMainSectionName = (name) => name.toLowerCase().startsWith('phần ');

let currentMainSectionId = undefined;
let currentSubSectionId = undefined;

const rows = [
  { sttVal: 'A', actualName: 'HẠNG MỤC TTLL', volVal: 0, unitVal: '' },
  { sttVal: '34', actualName: 'HỆ THỐNG TTLL - PHẦN THIẾT BỊ', volVal: 0, unitVal: '' }
];

rows.forEach(r => {
  const {sttVal, actualName, volVal, unitVal} = r;
  const cleanStt = String(sttVal || '').trim().replace(/\.$/, '');
  const hasNoDot = !cleanStt.includes('.');
  const isRoman = romanRegex.test(cleanStt);
  const startsWithPhan = actualName.trim().toUpperCase().startsWith('PHẦN ');
  const hasNoVolumeAndUnit = true; // For simulation
  const isSection = (startsWithPhan || isMainSectionName(actualName) || hasNoDot) && hasNoVolumeAndUnit && hasNoDot;
  const isMainLevelSection = isSection && (isRoman || startsWithPhan || isMainSectionName(actualName) || !cleanStt);
  
  const taskId = sttVal;
  let parentId = undefined;
  
  if (isSection) {
    if (isMainLevelSection) {
      currentMainSectionId = taskId;
      currentSubSectionId = undefined;
    } else {
      currentSubSectionId = taskId;
      parentId = currentMainSectionId;
    }
  }
  
  console.log(sttVal, { isSection, isMainLevelSection, parentId, currentMainSectionId });
});
