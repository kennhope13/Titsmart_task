const { compareTaskStt } = require('./src/utils/taskTreeUtils');
const tasks = [
  { stt: 'A', parentId: null, isSectionHeader: true },
  { stt: '33.1', parentId: 'A' },
  { stt: '33.1.1', parentId: '33.1' },
  { stt: 'B', parentId: null, isSectionHeader: true },
  { stt: '36.1', parentId: 'B' },
  { stt: '34', parentId: 'ROOT', isSectionHeader: true },
  { stt: '35', parentId: 'ROOT', isSectionHeader: true },
  { stt: '37', parentId: 'ROOT', isSectionHeader: true }
];

console.log('Compare 34 vs B:', compareTaskStt('34', 'B'));
console.log('Compare B vs 34:', compareTaskStt('B', '34'));
