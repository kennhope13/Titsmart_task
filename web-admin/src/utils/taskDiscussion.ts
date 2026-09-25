export interface TaskDiscussionItem {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole?: string;
  type: 'note' | 'assign_note' | 'question' | 'reply' | 'system';
  content: string;
  createdAt: string;
}

/**
 * Parse discussion thread from task notes string (with fallback to raw notes or issue)
 */
export const parseTaskDiscussions = (notes?: string, issue?: string): TaskDiscussionItem[] => {
  const result: TaskDiscussionItem[] = [];
  
  if (notes) {
    // Tìm [THREAD: ... ]
    const threadIdx = notes.indexOf('[THREAD:');
    if (threadIdx !== -1) {
      const threadStr = notes.slice(threadIdx + 8);
      const firstBracket = threadStr.indexOf('[');
      if (firstBracket !== -1) {
        // Tìm vị trí đóng ']' tương ứng của mảng JSON
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let endIdx = -1;

        for (let i = firstBracket; i < threadStr.length; i++) {
          const char = threadStr[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '[') depth++;
            else if (char === ']') {
              depth--;
              if (depth === 0) {
                endIdx = i;
                break;
              }
            }
          }
        }

        if (endIdx !== -1) {
          const jsonContent = threadStr.slice(firstBracket, endIdx + 1);
          try {
            const parsed = JSON.parse(jsonContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch (e) {
            // silent fallback
          }
        }
      }
    }
    
    // Nếu không có [THREAD:...], chỉ lấy clean baseNotes nếu thực sự có ghi chú người dùng nhập
    const baseNotes = (threadIdx !== -1 ? notes.slice(0, threadIdx) : notes)
      .replace(/\[THREAD:[\s\S]*$/gi, '')
      .replace(/\[order:[\d.]+\]/gi, '')
      .replace(/\[section\]/gi, '')
      .replace(/\[contractor\]/gi, '')
      .replace(/\[owner\]/gi, '')
      .replace(/\[doc-track\s*\]/gi, '')
      .replace(/\[DOC-NOTE\][\s\S]*$/gi, '')
      .replace(/Nhà thầu cung cấp/gi, '')
      .replace(/Chủ đầu tư cung cấp/gi, '')
      .replace(/Import từ phụ lục dự án/gi, '')
      .replace(/Đồng bộ từ phụ lục khi tạo dự án/gi, '')
      .split('|')
      .map(s => s.trim())
      .filter(s => Boolean(s) && !s.startsWith('{') && !s.includes('"senderId"'))
      .join(' | ')
      .trim();

    // Chỉ thêm nếu có nội dung ghi chú người dùng thực sự
    if (baseNotes && baseNotes !== ']') {
      result.push({
        id: 'legacy_note',
        senderName: 'Người giao việc',
        senderRole: 'Người giao việc',
        type: 'assign_note',
        content: baseNotes,
        createdAt: new Date().toISOString()
      });
    }
  }

  if (issue && !result.some(r => r.type === 'question')) {
    const cleanRawIssue = issue.split('[DOC-DATA]')[0].trim();
    if (cleanRawIssue && !cleanRawIssue.includes('[THREAD:')) {
      result.push({
        id: 'legacy_issue',
        senderName: 'Người nhận việc',
        senderRole: 'Người nhận việc',
        type: 'question',
        content: cleanRawIssue,
        createdAt: new Date().toISOString()
      });
    }
  }

  return result;
};

/**
 * Append a new message to the task discussion thread in notes
 */
export const appendTaskDiscussion = (
  existingNotes: string = '',
  item: Omit<TaskDiscussionItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): string => {
  const currentDiscussions = parseTaskDiscussions(existingNotes);
  // Loại bỏ các legacy item nếu đã có thảo luận thật
  const filteredDiscussions = currentDiscussions.filter(d => !d.id.startsWith('legacy_'));

  const newItem: TaskDiscussionItem = {
    id: item.id || `disc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderId: item.senderId || '',
    senderName: item.senderName || 'Người dùng',
    senderRole: item.senderRole || '',
    type: item.type,
    content: item.content.trim(),
    createdAt: item.createdAt || new Date().toISOString(),
  };

  const updatedDiscussions = [...filteredDiscussions, newItem];
  const jsonStr = JSON.stringify(updatedDiscussions);
  
  // Xóa bỏ đoạn [THREAD:...] cũ khỏi baseNotes
  const threadIdx = existingNotes.indexOf('[THREAD:');
  const baseNotes = (threadIdx !== -1 ? existingNotes.slice(0, threadIdx) : existingNotes).trim();
  
  return baseNotes ? `${baseNotes} [THREAD:${jsonStr}]` : `[THREAD:${jsonStr}]`;
};

/**
 * Strip all [THREAD:...] discussion data from a raw notes string
 */
export const stripDiscussionThread = (notes?: string | null): string => {
  if (!notes || typeof notes !== 'string') return '';
  const idx = notes.indexOf('[THREAD:');
  if (idx === -1) return notes;
  
  const before = notes.slice(0, idx).trim();
  const threadStr = notes.slice(idx);
  
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIdx = -1;
  
  for (let i = 0; i < threadStr.length; i++) {
    const char = threadStr[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }
  
  const after = endIdx !== -1 ? threadStr.slice(endIdx + 1).trim() : '';
  const result = [before, after].filter(Boolean).join(' ').trim();
  return result.replace(/\[THREAD:[\s\S]*$/gi, '').trim();
};

/**
 * Get latest message in discussion thread
 */
export const getLatestDiscussion = (notes?: string, issue?: string): TaskDiscussionItem | null => {
  const list = parseTaskDiscussions(notes, issue);
  return list.length > 0 ? list[list.length - 1] : null;
};
