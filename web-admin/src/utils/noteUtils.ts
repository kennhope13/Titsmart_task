export const cleanSystemNotes = (notes: string) => {
  return String(notes || '')
    .replace(/\[order:[\d.]+\]/g, '')
    .replace(/\[section\]/g, '')
    .replace(/\[contractor\]/g, '')
    .replace(/\[owner\]/g, '')
    .replace(/Nh� th?u cung c?p/g, '')
    .replace(/Ch? d?u tu cung c?p/g, '')
    .replace(/Import t? ph? l?c d? �n/g, '')
    .replace(/�?ng b? t? ph? l?c khi t?o d? �n/g, '')
    .split('[DOC-NOTE]')[0].split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .join(' | ');
};

export const mergeSystemNotes = (originalNotes: string, newCleanNotes: string) => {
  const systemTags = String(originalNotes || '')
    .split('[DOC-NOTE]')[0].split('|')
    .map(s => s.trim())
    .filter(s => 
      s.match(/^\[order:[\d.]+\]$/) || 
      s === '[section]' || 
      s === '[contractor]' || 
      s === '[owner]' ||
      s === 'Nh� th?u cung c?p' ||
      s === 'Ch? d?u tu cung c?p' ||
      s === 'Import t? ph? l?c d? �n' ||
      s === '�?ng b? t? ph? l?c khi t?o d? �n'
    );
  
  if (newCleanNotes && newCleanNotes.trim()) {
    systemTags.push(newCleanNotes.trim());
  }
  return systemTags.join(' | ');
};
