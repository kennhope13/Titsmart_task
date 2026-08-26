import React, { useState, useEffect } from 'react';
import { ImageUpload } from '../../components/common/ImageUpload';
import { ModelEntry, DocItem } from './DocumentCertificateTab';

interface FastDocModalProps {
  title: string;
  docType: string;
  initialModels: ModelEntry[];
  onClose: () => void;
  onSubmit: (newModels: ModelEntry[]) => void;
  onDelete?: () => void;
}

export const FastDocModal: React.FC<FastDocModalProps> = ({ title, docType, initialModels, onClose, onSubmit, onDelete }) => {
  const [text, setText] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Find the first doc matching the docType in the first model
    let found = false;
    for (const m of initialModels) {
      for (const d of m.docs) {
        const lowerText = d.text.toLowerCase();
        if (
          (docType === 'CO' && (lowerText.includes('co') || lowerText.includes('c/o'))) ||
          (docType === 'CQ' && (lowerText.includes('cq') || lowerText.includes('c/q'))) ||
          (docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy'))) ||
          (docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp') || lowerText.includes('tkd'))) || (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(docType) && d.text === docType)
        ) {
          setText(d.text);
          setFileUrls(d.fileUrls || []);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    
    if (!found) {
      if (docType === 'CO') setText('C/O: ');
      if (docType === 'CQ') setText('C/Q: ');
      if (docType === 'PCCC') setText('PCCC: ');
      if (docType === 'STAMP') setText('TKD: ');
      if (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(docType)) setText(docType);
    }
  }, [docType, initialModels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    // Merge back into models
    const newModels = JSON.parse(JSON.stringify(initialModels)) as ModelEntry[];
    let found = false;
    for (const m of newModels) {
      for (const d of m.docs) {
        const lowerText = d.text.toLowerCase();
        if (
          (docType === 'CO' && (lowerText.includes('co') || lowerText.includes('c/o'))) ||
          (docType === 'CQ' && (lowerText.includes('cq') || lowerText.includes('c/q'))) ||
          (docType === 'PCCC' && (lowerText.includes('pccc') || lowerText.includes('phòng cháy'))) ||
          (docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp') || lowerText.includes('tkd')))
        ) {
          d.text = text;
          d.fileUrls = fileUrls;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      // Append to first model
      if (newModels.length === 0) {
        newModels.push({ model: '', manufacturer: '', origin: '', docs: [] });
      }
      newModels[0].docs.push({ text, fileUrls });
    }

    onSubmit(newModels);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <span className="material-symbols-outlined text-base text-primary">upload_file</span>
            {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col p-5 space-y-4">

          <div>
            <ImageUpload
              label="Đính kèm file (ảnh/pdf)"
              value={fileUrls}
              multiple
              onChange={(u) => setFileUrls(Array.isArray(u) ? u : [u])}
              onUploadStateChange={setIsUploading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Xóa chứng từ
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading || !text.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Đang tải...' : 'Lưu cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
