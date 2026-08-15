import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  label: string;
  name?: string;
  value?: string | string[];
  onChange?: (urls: string | string[]) => void;
  className?: string;
  multiple?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, name, value: initialValue, onChange, className = '', multiple = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Normalize initialValue to array for internal state
  const getInitialArray = () => {
    if (!initialValue) return [];
    if (Array.isArray(initialValue)) return initialValue;
    return [initialValue];
  };
  
  const [localValues, setLocalValues] = useState<string[]>(getInitialArray());

  React.useEffect(() => {
    setLocalValues(getInitialArray());
  }, [initialValue]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError('');
    
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `cccd/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('titsmart-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('titsmart-images')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(data.publicUrl);
      }

      const newValues = multiple ? [...localValues, ...uploadedUrls] : [uploadedUrls[0]];
      setLocalValues(newValues);
      
      if (onChange) {
        onChange(multiple ? newValues : newValues[0]);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Lỗi tải ảnh. Vui lòng đảm bảo bạn đã tạo Storage Bucket tên "titsmart-images" trên Supabase và bật Public.');
    } finally {
      setIsUploading(false);
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
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept="image/*,application/pdf"
            multiple={multiple}
            onChange={handleUpload}
            disabled={isUploading}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-primary/10 file:text-primary
              hover:file:bg-primary/20
              disabled:opacity-50 cursor-pointer"
          />
        </div>
        
        {localValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {localValues.map((url, idx) => {
              const isPdf = url.toLowerCase().endsWith('.pdf');
              return (
                <div key={idx} className="relative group shrink-0 w-16 h-16 rounded border bg-slate-100 overflow-hidden flex items-center justify-center">
                  <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-rose-500 bg-white group-hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                        <span className="text-[8px] font-bold mt-1">PDF</span>
                      </div>
                    ) : (
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                    )}
                  </a>
                  <button 
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-700"
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
