const pairs: Array<[string, string]> = [
  ['??', '\u0110'], ['??', '\u0111'], ['??', '\u00e1'], ['??', '\u00e0'], ['??', '\u00e2'], ['??', '\u00e3'], ['??', '\u00ea'], ['??', '\u00f4'], ['??', '\u00f3'], ['??', '\u00f2'], ['??', '\u00f9'], ['??', '\u00fa'], ['??', '\u00fd'],
  ['???', '\u1ea1'], ['???', '\u1ea3'], ['???', '\u1ea5'], ['???', '\u1ea7'], ['???', '\u1eaf'], ['???', '\u1eb1'], ['???', '\u1ebf'], ['???', '\u1ec1'], ['???', '\u1ec7'], ['???', '\u1ed9'], ['???', '\u1ecb'], ['???', '\u1ed1'], ['???', '\u1ed3'], ['???', '\u1ed9'], ['???', '\u1edf'], ['???', '\u1edb'], ['???', '\u1edd'], ['???', '\u1ee3'], ['???', '\u1ee5'], ['???', '\u1ee7'], ['???', '\u1ee9'], ['???', '\u1eeb'], ['???', '\u1ef1'], ['???', '\u1ef9'], ['???', '\u1eb7'], ['???', '\u1ea5'], ['???', '\u1ead'], ['???', '\u1eed'], ['???o', '\u1ea1o'],
  ['??', '\u01b0'], ['??', '\u01a1'], ['??', '\u0103'], ['??', 'C'], ['??', '\u00d4'], ['??', '\u00c1'], ['??', '\u00c0'], ['??', '\u00c2'], ['??', '\u00c9'], ['??', '\u00da'],
  ['??', '\u00b0'], ['?', ''], ['?', ''], ['', ''],
];

const phrasePairs: Array<[string, string]> = [
  ['K??? s??', 'K\u1ef9 s\u01b0'],
  ['Qu???n l??', 'Qu\u1ea3n l\u00fd'],
  ['Ch??? huy', 'Ch\u1ec9 huy'],
  ['Gi??m s??t', 'Gi\u00e1m s\u00e1t'],
  ['D??? ??n', 'D\u1ef1 \u00e1n'],
  ['C??ng tr??nh', 'C\u00f4ng tr\u00ecnh'],
  ['H??? th???ng', 'H\u1ec7 th\u1ed1ng'],
  ['V???a xong', 'V\u1eeba xong'],
  ['?????c', '\u0110\u1eafc'],
  ['N??ng', 'N\u00f4ng'],
  ['?????ng', '\u0110\u1ed3ng'],
  ['Nh?? cung c???p', 'Nh\u00e0 cung c\u1ea5p'],
  ['Ch??a', 'Ch\u01b0a'],
  ['????', '\u0110\u00e3'],
  ['??ang', '\u0110ang'],
  ['thi c??ng', 'thi c\u00f4ng'],
  ['?????t h??ng', '\u0111\u1eb7t h\u00e0ng'],
  ['c?? h??ng', 'c\u00f3 h\u00e0ng'],
  ['V?????ng m???c', 'V\u01b0\u1edbng m\u1eafc'],
  ['v?????ng m???c', 'v\u01b0\u1edbng m\u1eafc'],
  ['H???ng m???c', 'H\u1ea1ng m\u1ee5c'],
  ['M???c', 'M\u1ee5c'],
  ['N???p', 'N\u1ea1p'],
  ['th??nh c??ng', 'th\u00e0nh c\u00f4ng'],
  ['t???', 't\u1eeb'],
  ['m???i', 'm\u1edbi'],
  ['nh???n', 'nh\u1eadn'],
  ['ti???n ?????', 'ti\u1ebfn \u0111\u1ed9'],
  ['Ph??t hi???n', 'Ph\u00e1t hi\u1ec7n'],
  ['x??? l??', 'x\u1eed l\u00fd'],
  ['S??? c???', 'S\u1ef1 c\u1ed1'],
  ['b???o c??o', 'b\u00e1o c\u00e1o'],
  ['Ban Qu???n L??', 'Ban Qu\u1ea3n l\u00fd'],
];

export const cleanText = (value?: string | number | null) => {
  let text = String(value ?? '');
  for (const [from, to] of phrasePairs) text = text.split(from).join(to);
  for (const [from, to] of pairs) text = text.split(from).join(to);
  return text;
};

export const purchaseLabel = (status?: string) => {
  const s = cleanText(status);
  if (!s || s.includes('Not Ordered') || s.includes('Ch?a')) return 'Ch\u01b0a \u0111\u1eb7t';
  if (s.includes('Ordered') || s.includes('\u0110\u00e3 \u0111\u1eb7t')) return '\u0110\u00e3 \u0111\u1eb7t';
  if (s.includes('On-site') || s.includes('c\u00f3 h\u00e0ng')) return '\u0110\u00e3 c\u00f3 h\u00e0ng';
  return s;
};

export const constructionLabel = (status?: string) => {
  const s = cleanText(status);
  if (!s || s.includes('Ch?a')) return 'Ch\u01b0a thi c\u00f4ng';
  if (s.includes('V?') || s.toUpperCase().includes('VUONG')) return 'V\u01b0\u1edbng m\u1eafc';
  if (s.includes('\u0110ang')) return '\u0110ang thi c\u00f4ng';
  if (s.includes('\u0110\u00e3')) return '\u0110\u00e3 thi c\u00f4ng';
  return s;
};

export const statusLabel = (status?: string) => {
  if (status === 'Done' || status === 'RESOLVED') return 'Ho\u00e0n th\u00e0nh';
  if (status === 'In Progress' || status === 'PROCESSING') return '\u0110ang x\u1eed l\u00fd';
  if (status === 'Review' || status === 'OPEN') return 'C\u1ea7n xem';
  return 'Ch\u01b0a l\u00e0m';
};
