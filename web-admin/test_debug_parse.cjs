const isMainSectionName = (name) => {
  const norm = name.toLowerCase();
  return norm.startsWith('phần ');
};

const rows = [
  ['A', 'HẠNG MỤC TTLL TRẠM BIẾN ÁP 110KV PHƯỚC ĐÔNG 6', '', ''],
  ['33', 'HỆ THỐNG THÔNG TIN LIÊN LẠC DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM', '', ''],
  ['34', 'HỆ THỐNG THÔNG TIN LIÊN LẠC DO NHÀ THẦU CUNG CẤP, VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRÌNH - PHẦN THIẾT BỊ', '', '']
];

rows.forEach(r => {
  const sttVal = r[0];
  const actualName = r[1];
  const volVal = 0;
  const cleanUnitVal = '';
  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+)$/i;
  const cleanStt = String(sttVal || '').trim().replace(/\.$/, '');
  const hasNoDot = !cleanStt.includes('.');
  const isRoman = romanRegex.test(cleanStt);
  const startsWithPhan = actualName.trim().toUpperCase().startsWith('PHẦN ');
  const hasNoVolumeAndUnit = (volVal === 0 || !volVal) && (!cleanUnitVal || cleanUnitVal === '');
  const isSection = (startsWithPhan || isMainSectionName(actualName) || hasNoDot) && hasNoVolumeAndUnit && hasNoDot;

  const isLetterHeader = /^[A-Z]{1,2}$/i.test(cleanStt);
  const isMainLevelSection = isSection && (isLetterHeader || isRoman || startsWithPhan || !cleanStt);

  console.log(sttVal.padEnd(5), '| cleanStt:', cleanStt.padEnd(5), '| isLetterHeader:', String(isLetterHeader).padEnd(5), '| isMainLevelSection:', String(isMainLevelSection));
});
