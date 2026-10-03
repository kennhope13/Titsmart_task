import { stripDiscussionThread } from './taskDiscussion';

/**
 * Làm sạch ghi chú:
 * - Loại bỏ các thẻ hệ thống nội bộ: [order:00001], [section], [contractor], [owner], [tech-status:...], [STATUS:...]
 * - Loại bỏ chuỗi tự chèn như: 'Nhà thầu cung cấp', 'Chủ đầu tư cung cấp', 'Import từ phụ lục dự án', 'Đồng bộ từ phụ lục khi tạo dự án'
 * - Nếu không có ghi chú thực tế từ người dùng/file Excel -> trả về chuỗi rỗng ''
 */
export const cleanNotes = (value?: string): string => {
  if (!value) return '';
  return stripDiscussionThread(String(value || ''))
    .replace(/\[order:[\d.]+\]/g, '')
    .replace(/\[section\]/gi, '')
    .replace(/\[contractor\]/gi, '')
    .replace(/\[owner\]/gi, '')
    .replace(/\[tech-status:[^\]]+\]/gi, '')
    .replace(/\[STATUS:[^\]]+\]/gi, '')
    .replace(/\[doc-track\]/gi, '')
    .replace(/\[doc-track\s*\]/gi, '')
    .replace(/\[DOC-NOTE\]/gi, '')
    .replace(/\[DOC-DATA\]/gi, '')
    .replace(/Nhà thầu cung cấp/gi, '')
    .replace(/Chủ đầu tư cung cấp/gi, '')
    .replace(/Import từ phụ lục dự án/gi, '')
    .replace(/Đồng bộ từ phụ lục khi tạo dự án/gi, '')
    .split('[DOC-NOTE]')[0]
    .replace(/[\[\]]/g, '')
    .split('|')
    .map(s => s.trim())
    .filter(s => Boolean(s) && !s.startsWith('{') && !s.includes('"senderId"') && s !== ']')
    .join(' | ')
    .trim();
};
