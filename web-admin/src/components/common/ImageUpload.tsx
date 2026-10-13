import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { parseInvoiceUrls } from '../../utils/fileUploadHelper';

interface ImageUploadProps {
  label: string;
  name?: string;
  value?: string | string[];
  onChange?: (urls: string | string[]) => void;
  className?: string;
  multiple?: boolean;
  onUploadStateChange?: (isUploading: boolean) => void;
}

// Helper compress image using canvas before upload
const compressImageFile = async (file: File): Promise<Blob | File> => {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1280;
        let width = img.width;
        let height = img.height;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, name, value: initialValue, onChange, className = '', multiple = false, onUploadStateChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Normalize initialValue to array for internal state
  const getInitialArray = () => {
    if (!initialValue) return [];
    if (Array.isArray(initialValue)) return initialValue.map(String).filter(Boolean);
    return parseInvoiceUrls(String(initialValue));
  };
  
  const [localValues, setLocalValues] = useState<string[]>(getInitialArray());

  React.useEffect(() => {
    setLocalValues(getInitialArray());
  }, [initialValue]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      setIsUploading(true);
      setError('');
      if (onUploadStateChange) onUploadStateChange(true);
      
      const newUrls: string[] = [];
      const filesToUpload = multiple ? Array.from(event.target.files) : [event.target.files[0]];
      
      for (const rawFile of filesToUpload) {
        const compressedBlob = await compressImageFile(rawFile);
        const fileExt = rawFile.type.startsWith('image/') ? 'jpg' : (rawFile.name.split('.').pop() || 'bin');
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `files/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('titsmart-images')
          .upload(filePath, compressedBlob, { cacheControl: '3600', upsert: true, contentType: rawFile.type.startsWith('image/') ? 'image/jpeg' : rawFile.type });

        if (uploadError) {
          console.error("Supabase Storage upload error:", uploadError);
          const objectUrl = URL.createObjectURL(rawFile);
          newUrls.push(objectUrl);
          setError(`Cảnh báo Storage Supabase: ${uploadError.message}. Đã tạo preview tạm thời.`);
          continue;
        }

        const { data } = supabase.storage
          .from('titsmart-images')
          .getPublicUrl(filePath);
          
        newUrls.push(data.publicUrl);
      }
      
      const updatedValues = multiple ? [...localValues, ...newUrls] : [newUrls[0]];
      setLocalValues(updatedValues);
      
      if (onChange) {
        if (multiple) {
          onChange(updatedValues);
        } else {
          onChange(updatedValues[0] || '');
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
      alert('Đã xảy ra lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
      if (onUploadStateChange) onUploadStateChange(false);
      // Reset input value to allow re-uploading same file if needed
      event.target.value = '';
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const newValues = localValues.filter((_, idx) => idx !== indexToRemove);
    setLocalValues(newValues);
    if (onChange) {
      onChange(multiple ? newValues : newValues[0] || '');
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {name && <input type="hidden" name={name} value={multiple ? localValues.join(',') : localValues[0] || ''} />}
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center flex-wrap gap-2.5">
          <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-lg border border-primary/30 hover:bg-primary/20 transition-colors shadow-xs ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="material-symbols-outlined text-[16px]">
              {localValues.length > 0 && multiple ? 'add_photo_alternate' : 'upload_file'}
            </span>
            <span>{localValues.length > 0 && multiple ? 'Chọn thêm tệp' : (multiple ? 'Chọn tệp (Ảnh / PDF / Hóa đơn)' : 'Chọn tệp')}</span>
            <input 
              type="file" 
              accept="*/*"
              multiple={multiple}
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          
          {multiple && localValues.length > 0 && (
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Đã chọn {localValues.length} tệp
            </span>
          )}
          
          {isUploading && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold">
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải tệp lên...</span>
            </div>
          )}
        </div>
        
        {localValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {localValues.map((url, idx) => {
              const lower = url.toLowerCase();
              const isPdf = lower.endsWith('.pdf');
              const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
              const isDoc = lower.endsWith('.doc') || lower.endsWith('.docx');
              const isImg = Boolean(lower.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i)) || url.startsWith('blob:');

              return (
                <div key={idx} className="relative group shrink-0 w-16 h-16 rounded border bg-slate-100 overflow-hidden flex items-center justify-center">
                  <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-rose-500 bg-white group-hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                        <span className="text-[8px] font-bold mt-0.5">PDF</span>
                      </div>
                    ) : isExcel ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-emerald-600 bg-white group-hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-2xl">table_chart</span>
                        <span className="text-[8px] font-bold mt-0.5">EXCEL</span>
                      </div>
                    ) : isDoc ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-blue-600 bg-white group-hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-2xl">description</span>
                        <span className="text-[8px] font-bold mt-0.5">WORD</span>
                      </div>
                    ) : isImg ? (
                      <img 
                        src={url} 
                        alt={`Preview ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" 
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-white group-hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-2xl">draft</span>
                        <span className="text-[8px] font-bold mt-0.5">FILE</span>
                      </div>
                    )}
                  </a>
                  <button 
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors z-10"
                    title="Xóa tệp"
                  >
                    <span className="material-symbols-outlined text-[14px] block">close</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {isUploading && <p className="text-xs text-blue-600 mt-1">Đang tải ảnh lên...</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
