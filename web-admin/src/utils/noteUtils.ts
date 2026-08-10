export const cleanSystemNotes = (notes: string) => {
  return String(notes || '')
    .replace(/\[order:[\d.]+\]/g, '')
    .replace(/\[section\]/g, '')
    .replace(/\[contractor\]/g, '')
    .replace(/\[owner\]/g, '')
    .replace(/Nhà th?u cung c?p/g, '')
    .replace(/Ch? d?u tu cung c?p/g, '')
    .replace(/Import t? ph? l?c d? án/g, '')
    .replace(/Ð?ng b? t? ph? l?c khi t?o d? án/g, '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .join(' | ');
};

export const mergeSystemNotes = (originalNotes: string, newCleanNotes: string) => {
  const systemTags = String(originalNotes || '')
    .split('|')
    .map(s => s.trim())
    .filter(s => 
      s.match(/^\[order:[\d.]+\]$/) || 
      s === '[section]' || 
      s === '[contractor]' || 
      s === '[owner]' ||
      s === 'Nhà th?u cung c?p' ||
      s === 'Ch? d?u tu cung c?p' ||
      s === 'Import t? ph? l?c d? án' ||
      s === 'Ð?ng b? t? ph? l?c khi t?o d? án'
    );
  
  if (newCleanNotes && newCleanNotes.trim()) {
    systemTags.push(newCleanNotes.trim());
  }
  return systemTags.join(' | ');
};
